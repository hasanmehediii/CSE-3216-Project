import { useState, useEffect } from 'react';
import { useAuth, apiRequest } from '../context/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import './ExamResult.css';

function ExamResult() {
  const { currentUser, loading } = useAuth();
  const { classroomId, examId } = useParams();

  const [result, setResult] = useState(null);
  const [exam, setExam] = useState(null);
  const [loadingResult, setLoadingResult] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && examId) {
      loadData();
    }
  }, [currentUser, examId]);

  async function loadData() {
    try {
      // Get exam title
      const examData = await apiRequest(`/exams/${examId}`);
      setExam(examData);
      
      // Get student result
      const resultData = await apiRequest(`/exams/${examId}/result`);
      setResult(resultData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingResult(false);
    }
  }

  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role !== 'student') return <Navigate to={`/classroom/${classroomId}`} replace />;

  if (loadingResult) {
    return (
      <div className="exam-result-page">
        <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-result-page">
        <div className="result-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div className="award-icon">⚠️</div>
          <h1 style={{ color: '#f87171' }}>Cannot View Results</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>{error}</p>
          <Link to={`/classroom/${classroomId}`} className="back-btn">
            Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-result-page">
      <div className="result-card">
        <div className="award-icon">🏆</div>
        <h1>Exam Results</h1>
        <div className="exam-title">{exam?.title}</div>

        <div className="marks-display">
          <div className="marks-value">{result.marks ?? '—'}</div>
          <div className="marks-label">Total Marks</div>
        </div>

        {result.feedback && (
          <div className="feedback-display">
            <h4>Teacher Feedback</h4>
            <p>{result.feedback}</p>
          </div>
        )}

        <Link to={`/classroom/${classroomId}`} className="back-btn">
          Back to Classroom
        </Link>
      </div>
    </div>
  );
}

export default ExamResult;
