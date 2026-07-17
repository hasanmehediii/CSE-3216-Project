import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, apiRequest } from '../context/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import { Clock, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import './LiveExam.css';

function LiveExam() {
  const { currentUser, loading } = useAuth();
  const { classroomId, examId } = useParams();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});       // { questionId: { selected_option, answer_text } }
  const [remaining, setRemaining] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examType, setExamType] = useState('');
  const [loadingExam, setLoadingExam] = useState(true);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  // ── Enter exam on mount ──
  useEffect(() => {
    if (currentUser && examId) {
      enterExam();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentUser, examId]);

  async function enterExam() {
    try {
      // First get exam info for title
      const examDetail = await apiRequest(`/exams/${examId}`);
      setExamTitle(examDetail.title);
      setExamType(examDetail.exam_type);
      setTotalDuration(examDetail.duration_minutes * 60);

      // Enter the exam
      const data = await apiRequest(`/exams/${examId}/enter`, { method: 'POST' });
      setSession(data.session);
      setQuestions(data.questions);
      setRemaining(data.session.remaining_seconds);

      if (data.session.submitted) {
        setSubmitted(true);
      } else if (data.session.remaining_seconds <= 0) {
        setExpired(true);
      } else {
        startTimer(data.session.remaining_seconds);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingExam(false);
    }
  }

  function startTimer(seconds) {
    let time = seconds;
    timerRef.current = setInterval(() => {
      time -= 1;
      setRemaining(time);
      if (time <= 0) {
        clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    }, 1000);
  }

  // ── Copy protection ──
  useEffect(() => {
    function preventCopy(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
      }
    }
    function preventContext(e) {
      e.preventDefault();
    }
    document.addEventListener('keydown', preventCopy);
    document.addEventListener('contextmenu', preventContext);
    return () => {
      document.removeEventListener('keydown', preventCopy);
      document.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  // ── Answer handlers ──
  function handleMCQSelect(questionId, optionIndex) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], selected_option: optionIndex }
    }));
  }

  function handleWrittenChange(questionId, text) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer_text: text }
    }));
  }

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);

    const answerList = questions.map(q => ({
      question_id: q.id,
      selected_option: answers[q.id]?.selected_option ?? null,
      answer_text: answers[q.id]?.answer_text ?? null,
    }));

    try {
      await apiRequest(`/exams/${examId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });
      setSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err) {
      // If time expired server-side
      if (err.message.includes('expired') || err.message.includes('Time')) {
        setExpired(true);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, submitted, questions, answers, examId]);

  async function handleAutoSubmit() {
    setExpired(true);
    // Try to submit whatever is answered
    const answerList = questions.map(q => ({
      question_id: q.id,
      selected_option: answers[q.id]?.selected_option ?? null,
      answer_text: answers[q.id]?.answer_text ?? null,
    }));
    try {
      await apiRequest(`/exams/${examId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      });
      setSubmitted(true);
    } catch {
      // Timer expired — that's expected
    }
  }

  // ── Formatting ──
  function formatTime(s) {
    if (s == null) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function timerClass() {
    if (remaining == null || totalDuration == null) return 'safe';
    const pct = remaining / totalDuration;
    if (pct <= 0.1) return 'danger';
    if (pct <= 0.25) return 'warning';
    return 'safe';
  }

  function answeredCount() {
    return questions.filter(q => {
      const a = answers[q.id];
      if (!a) return false;
      if (q.question_type === 'mcq') return a.selected_option != null;
      return a.answer_text && a.answer_text.trim().length > 0;
    }).length;
  }

  // ── Guards ──
  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;

  if (loadingExam) {
    return (
      <div className="exam-page">
        <div className="exam-loading">
          <div className="spinner-dark"></div>
          <p>Entering exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-page">
        <div className="exam-submitted-container">
          <div className="expired-card" style={{ border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div className="expired-icon">⚠️</div>
            <h2 style={{ color: '#fbbf24' }}>{error}</h2>
            <p>You may have already submitted or the exam is no longer available.</p>
            <Link to={`/classroom/${classroomId}`} className="back-btn">
              ← Back to Classroom
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="exam-page">
        <div className="exam-submitted-container">
          <div className="submitted-card">
            <div className="check-icon">✅</div>
            <h2>Exam Submitted</h2>
            <p>Your answers have been recorded. Your teacher will grade them soon.</p>
            <Link to={`/classroom/${classroomId}`} className="back-btn">
              ← Back to Classroom
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-page exam-protected">
      {/* Expired overlay */}
      {expired && (
        <div className="exam-expired-overlay">
          <div className="expired-card">
            <div className="expired-icon">⏰</div>
            <h2>Time's Up!</h2>
            <p>Your exam time has expired. Your answers have been auto-submitted.</p>
            <Link to={`/classroom/${classroomId}`} className="back-btn">
              ← Back to Classroom
            </Link>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="exam-topbar">
        <div className="exam-title-bar">
          <h2>{examTitle}</h2>
          <span className="exam-type-badge">{examType}</span>
        </div>
        <div className={`exam-timer ${timerClass()}`}>
          <Clock size={18} />
          {formatTime(remaining)}
        </div>
      </div>

      {/* Timer progress bar */}
      <div className="timer-progress-bar">
        <div
          className={`timer-progress-fill ${timerClass()}`}
          style={{
            width: totalDuration ? `${(remaining / totalDuration) * 100}%` : '100%',
          }}
        />
      </div>

      {/* Questions */}
      <div className="exam-questions-container">
        {questions.map((q, index) => (
          <div key={q.id} className="question-card">
            <div className="question-header">
              <div className="question-number">{index + 1}</div>
              <span className={`question-type-label ${q.question_type}`}>
                {q.question_type}
              </span>
            </div>
            <div className="question-text">{q.question_text}</div>

            {q.question_type === 'mcq' && q.options && (
              <div className="mcq-options">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`mcq-option ${answers[q.id]?.selected_option === oi ? 'selected' : ''}`}
                    onClick={() => handleMCQSelect(q.id, oi)}
                  >
                    <div className="option-radio"></div>
                    <span className="option-letter">{String.fromCharCode(65 + oi)}.</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {q.question_type === 'written' && (
              <div className="written-answer">
                <textarea
                  placeholder="Write your answer here..."
                  value={answers[q.id]?.answer_text || ''}
                  onChange={(e) => handleWrittenChange(q.id, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Bar */}
      <div className="exam-submit-bar">
        <div className="submit-info">
          <strong>{answeredCount()}</strong> of <strong>{questions.length}</strong> answered
        </div>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Send size={16} />
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  );
}

export default LiveExam;
