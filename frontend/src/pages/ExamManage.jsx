import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth, apiRequest } from '../context/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Send, BookOpen, Clock, Users, Plus, X,
  CheckCircle, AlertTriangle, Eye, Award, Bell
} from 'lucide-react';
import './ExamManage.css';

function ExamManage() {
  const { currentUser, loading } = useAuth();
  const { classroomId, examId } = useParams();

  const [exam, setExam] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingExam, setLoadingExam] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Draft: question editor state
  const [editQuestions, setEditQuestions] = useState([]);

  // Grading: marks state
  const [marksMap, setMarksMap] = useState({});       // { studentId: { marks, feedback } }

  useEffect(() => {
    if (currentUser && examId) {
      loadExam();
    }
  }, [currentUser, examId]);

  async function loadExam() {
    try {
      const data = await apiRequest(`/exams/${examId}`);
      setExam(data);

      if (data.state === 'draft') {
        setEditQuestions(data.questions || []);
      }

      if (data.state === 'in_progress') {
        loadSessions();
      }

      if (data.state === 'closed' || data.state === 'graded') {
        // Initialize marks map from existing data
        const mm = {};
        (data.submissions || []).forEach(s => {
          mm[s.student_id] = {
            marks: s.marks ?? '',
            feedback: s.feedback ?? '',
          };
        });
        setMarksMap(mm);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingExam(false);
    }
  }

  async function loadSessions() {
    try {
      const data = await apiRequest(`/exams/${examId}/sessions`);
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  }

  // ── Draft: Question Management ──

  function addQuestion(type) {
    const newQ = {
      id: `temp-${Date.now()}-${Math.random()}`,
      question_text: '',
      question_type: type,
      options: type === 'mcq' ? ['', '', '', ''] : null,
      correct_option: type === 'mcq' ? 0 : null,
    };
    setEditQuestions(prev => [...prev, newQ]);
  }

  function updateQuestion(index, field, value) {
    setEditQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function updateOption(qIndex, oIndex, value) {
    setEditQuestions(prev => {
      const updated = [...prev];
      const opts = [...(updated[qIndex].options || [])];
      opts[oIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  }

  function removeQuestion(index) {
    setEditQuestions(prev => prev.filter((_, i) => i !== index));
  }

  async function saveQuestions() {
    setActionLoading('save');
    try {
      const payload = editQuestions.map(q => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_option: q.correct_option,
      }));
      await apiRequest(`/exams/${examId}/questions`, {
        method: 'PUT',
        body: JSON.stringify({ questions: payload }),
      });
      await loadExam();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  // ── State Transitions ──

  async function handlePublish() {
    setActionLoading('publish');
    try {
      // Save questions first if needed
      if (editQuestions.length > 0) {
        const payload = editQuestions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_option: q.correct_option,
        }));
        await apiRequest(`/exams/${examId}/questions`, {
          method: 'PUT',
          body: JSON.stringify({ questions: payload }),
        });
      }
      await apiRequest(`/exams/${examId}/publish`, { method: 'PUT' });
      await loadExam();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  async function handleClose() {
    setActionLoading('close');
    try {
      await apiRequest(`/exams/${examId}/close`, { method: 'PUT' });
      await loadExam();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  async function handleAssignMarks() {
    setActionLoading('marks');
    try {
      const marksList = Object.entries(marksMap)
        .filter(([_, v]) => v.marks !== '' && v.marks != null)
        .map(([studentId, v]) => ({
          student_id: studentId,
          marks: parseFloat(v.marks),
          feedback: v.feedback || null,
        }));
      if (marksList.length === 0) {
        setError('Please assign marks to at least one student');
        setActionLoading('');
        return;
      }
      await apiRequest(`/exams/${examId}/marks`, {
        method: 'PUT',
        body: JSON.stringify({ marks: marksList }),
      });
      await loadExam();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  async function handleNotify() {
    setActionLoading('notify');
    try {
      await apiRequest(`/exams/${examId}/notify`, { method: 'PUT' });
      setError('');
      alert('Students have been notified of their results!');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  // ── Guards ──
  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role !== 'teacher') return <Navigate to="/dashboard" replace />;

  if (loadingExam) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="manage-loading">
          <div className="spinner"></div>
          <p>Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="manage-exam-page">
          <p style={{ color: 'var(--danger)' }}>{error || 'Exam not found'}</p>
        </div>
      </div>
    );
  }

  const stateLabel = {
    draft: 'Draft',
    published: 'Published',
    in_progress: 'In Progress',
    closed: 'Closed',
    graded: 'Graded',
  };

  return (
    <div className="page-container">
      <Navbar />
      <main className="manage-exam-page">
        {/* Header */}
        <div className="exam-manage-header">
          <Link to={`/classroom/${classroomId}`} className="back-link">
            <ArrowLeft size={16} /> Back to Classroom
          </Link>
          <h1>{exam.title}</h1>
          <div className="exam-header-meta">
            <span className="meta-badge type-badge">{exam.exam_type}</span>
            <span className="meta-badge duration-badge">
              <Clock size={12} /> {exam.duration_minutes} min
            </span>
            <span className={`meta-badge state-badge state-${exam.state}`}>
              {stateLabel[exam.state]}
            </span>
            <span className="meta-badge type-badge">
              {exam.total_questions} questions
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: 'var(--danger)',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="exam-action-buttons">
          {exam.state === 'draft' && (
            <>
              <button
                className="action-btn"
                onClick={saveQuestions}
                disabled={actionLoading === 'save'}
              >
                <CheckCircle size={16} />
                {actionLoading === 'save' ? 'Saving...' : 'Save Questions'}
              </button>
              <button
                className="action-btn primary"
                onClick={handlePublish}
                disabled={actionLoading === 'publish'}
              >
                <Send size={16} />
                {actionLoading === 'publish' ? 'Publishing...' : 'Publish Exam'}
              </button>
            </>
          )}
          {(exam.state === 'published' || exam.state === 'in_progress') && (
            <button
              className="action-btn danger"
              onClick={handleClose}
              disabled={actionLoading === 'close'}
            >
              <AlertTriangle size={16} />
              {actionLoading === 'close' ? 'Closing...' : 'Close Exam'}
            </button>
          )}
          {exam.state === 'closed' && (
            <button
              className="action-btn success"
              onClick={handleAssignMarks}
              disabled={actionLoading === 'marks'}
            >
              <Award size={16} />
              {actionLoading === 'marks' ? 'Saving...' : 'Save & Grade'}
            </button>
          )}
          {exam.state === 'graded' && (
            <button
              className="action-btn primary"
              onClick={handleNotify}
              disabled={actionLoading === 'notify'}
            >
              <Bell size={16} />
              {actionLoading === 'notify' ? 'Notifying...' : 'Notify Students'}
            </button>
          )}
        </div>

        {/* ═══ DRAFT STATE: Question Editor ═══ */}
        {exam.state === 'draft' && (
          <div className="manage-section">
            <h3><BookOpen size={18} /> Questions</h3>
            <div className="question-editor">
              {editQuestions.map((q, qi) => (
                <div key={q.id || qi} className="question-form-group">
                  <span className="q-number">Q{qi + 1}</span>
                  <button className="remove-q-btn" onClick={() => removeQuestion(qi)}>
                    <X size={16} />
                  </button>

                  <label>Question ({q.question_type})</label>
                  <textarea
                    value={q.question_text}
                    onChange={(e) => updateQuestion(qi, 'question_text', e.target.value)}
                    placeholder="Enter your question..."
                    rows={2}
                  />

                  {q.question_type === 'mcq' && (
                    <>
                      <label>Options</label>
                      <div className="options-grid">
                        {(q.options || ['', '', '', '']).map((opt, oi) => (
                          <div key={oi} className="option-input-group">
                            <span className="opt-label">{String.fromCharCode(65 + oi)}.</span>
                            <input
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="correct-select">
                        <label style={{ marginBottom: 0 }}>Correct Answer:</label>
                        <select
                          value={q.correct_option ?? 0}
                          onChange={(e) => updateQuestion(qi, 'correct_option', parseInt(e.target.value))}
                        >
                          {(q.options || []).map((_, oi) => (
                            <option key={oi} value={oi}>{String.fromCharCode(65 + oi)}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div className="add-question-btns">
                {(exam.exam_type === 'mcq' || exam.exam_type === 'both') && (
                  <button className="add-q-btn" onClick={() => addQuestion('mcq')}>
                    <Plus size={16} /> Add MCQ
                  </button>
                )}
                {(exam.exam_type === 'written' || exam.exam_type === 'both') && (
                  <button className="add-q-btn" onClick={() => addQuestion('written')}>
                    <Plus size={16} /> Add Written
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PUBLISHED STATE: Question Preview ═══ */}
        {exam.state === 'published' && (
          <div className="manage-section">
            <h3><Eye size={18} /> Questions (Published)</h3>
            {(exam.questions || []).map((q, qi) => (
              <div key={q.id} className="question-preview">
                <div className="qp-number">Q{qi + 1} · {q.question_type.toUpperCase()}</div>
                <div className="qp-text">{q.question_text}</div>
                {q.question_type === 'mcq' && q.options && (
                  <div className="qp-options">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`qp-option ${q.correct_option === oi ? 'correct' : ''}`}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                        {q.correct_option === oi && ' ✓'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ IN_PROGRESS STATE: Live Sessions ═══ */}
        {exam.state === 'in_progress' && (
          <>
            <div className="manage-section">
              <h3><Eye size={18} /> Questions</h3>
              {(exam.questions || []).map((q, qi) => (
                <div key={q.id} className="question-preview">
                  <div className="qp-number">Q{qi + 1} · {q.question_type.toUpperCase()}</div>
                  <div className="qp-text">{q.question_text}</div>
                </div>
              ))}
            </div>

            <div className="manage-section">
              <h3>
                <Users size={18} /> Live Sessions
                <button
                  className="action-btn"
                  onClick={loadSessions}
                  style={{ marginLeft: 'auto', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Refresh
                </button>
              </h3>
              {sessions.length === 0 ? (
                <div className="manage-empty">
                  <Users size={32} />
                  <p>No students have entered yet.</p>
                </div>
              ) : (
                <div className="sessions-grid">
                  {sessions.map(s => (
                    <div key={s.student_id} className="session-card">
                      <div className="student-name">{s.student_name}</div>
                      <div>
                        {s.submitted ? (
                          <span className="session-status done">Submitted</span>
                        ) : s.remaining_seconds > 0 ? (
                          <span className="session-status active">
                            {Math.floor(s.remaining_seconds / 60)}m left
                          </span>
                        ) : (
                          <span className="session-status done">Time expired</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ CLOSED STATE: Grading Interface ═══ */}
        {exam.state === 'closed' && (
          <>
            <div className="manage-section">
              <h3><Award size={18} /> Grade Students</h3>
              {(exam.submissions || []).length === 0 ? (
                <div className="manage-empty">
                  <Users size={32} />
                  <p>No submissions received.</p>
                </div>
              ) : (
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Marks</th>
                      <th>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(exam.submissions || []).map(s => (
                      <tr key={s.student_id}>
                        <td><strong>{s.student_name}</strong></td>
                        <td>
                          {s.submitted ? (
                            <span className="status-submitted">Submitted</span>
                          ) : (
                            <span className="status-pending">Not submitted</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="mark-input"
                            value={marksMap[s.student_id]?.marks ?? ''}
                            onChange={(e) => setMarksMap(prev => ({
                              ...prev,
                              [s.student_id]: {
                                ...prev[s.student_id],
                                marks: e.target.value,
                              }
                            }))}
                            min="0"
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="feedback-input"
                            value={marksMap[s.student_id]?.feedback ?? ''}
                            onChange={(e) => setMarksMap(prev => ({
                              ...prev,
                              [s.student_id]: {
                                ...prev[s.student_id],
                                feedback: e.target.value,
                              }
                            }))}
                            placeholder="Optional feedback"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Student Answers Review */}
            {(exam.submissions || []).filter(s => s.submitted).map(s => (
              <div key={s.student_id} className="manage-section">
                <h3><Eye size={18} /> {s.student_name}'s Answers</h3>
                <div className="student-answers-section">
                  {(s.answers || []).map((ans, ai) => {
                    const question = (exam.questions || []).find(q => q.id === ans.question_id);
                    if (!question) return null;
                    return (
                      <div key={ai} className="student-answer-row">
                        <div className="sa-question">
                          Q{ai + 1}. {question.question_text}
                        </div>
                        {question.question_type === 'mcq' ? (
                          <div className={`sa-answer ${ans.selected_option === question.correct_option ? 'correct' : 'incorrect'}`}>
                            Answer: {ans.selected_option != null && question.options
                              ? `${String.fromCharCode(65 + ans.selected_option)}. ${question.options[ans.selected_option]}`
                              : 'No answer'}
                            {ans.selected_option === question.correct_option ? ' ✓' : ` (Correct: ${String.fromCharCode(65 + question.correct_option)})`}
                          </div>
                        ) : (
                          <div className="sa-answer">
                            {ans.answer_text || 'No answer'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ═══ GRADED STATE: Results Summary ═══ */}
        {exam.state === 'graded' && (
          <div className="manage-section">
            <h3><Award size={18} /> Results</h3>
            {(exam.submissions || []).length === 0 ? (
              <div className="manage-empty">
                <p>No submissions.</p>
              </div>
            ) : (
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Marks</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {(exam.submissions || []).map(s => (
                    <tr key={s.student_id}>
                      <td><strong>{s.student_name}</strong></td>
                      <td><strong>{s.marks ?? '—'}</strong></td>
                      <td>{s.feedback || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ExamManage;
