import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function Routine() {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h1>Day Plan / Schedule</h1>
          <p style={{ color: 'var(--text)' }}>No classes scheduled for today.</p>
        </div>
      </main>
    </div>
  );
}

export default Routine;
