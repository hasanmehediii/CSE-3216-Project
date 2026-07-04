import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth, apiRequest } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, loading } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadClassrooms();
    }
  }, [currentUser]);

  async function loadClassrooms() {
    try {
      const data = await apiRequest('/classrooms');
      setClassrooms(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateClassroom(e) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await apiRequest('/classrooms', {
        method: 'POST',
        body: JSON.stringify({ name: newClassroomName })
      });
      setNewClassroomName('');
      await loadClassrooms();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleJoinClassroom(e) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await apiRequest('/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ pin: joinPin })
      });
      setJoinPin('');
      await loadClassrooms();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;

  if (currentUser.role === 'staff') {
    return (
      <div className="page-container">
        <Navbar />
        <main className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '4rem', borderRadius: '24px', border: '1px solid var(--border)', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', background: 'linear-gradient(135deg, var(--gold) 0%, #ffdf80 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Coming Soon
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text)', lineHeight: '1.6' }}>
              We're currently building powerful tools for our Staff members. 
              Check back later to see the new features we're bringing to the University Management System!
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Welcome, {currentUser.name}</h1>
          <p className="role-badge">{currentUser.role}</p>
        </header>

        <div className="dashboard-content">
          <section className="classrooms-list">
            <h2>Your Classrooms</h2>
            {classrooms.length === 0 ? (
              <div className="empty-state">No classrooms found.</div>
            ) : (
              <div className="grid">
                {classrooms.map(c => (
                  <Link to={`/classroom/${c.id}`} key={c.id} className="classroom-card">
                    <h3>{c.name}</h3>
                    {currentUser.role === 'teacher' && <p>Join PIN: <strong>{c.join_pin}</strong></p>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="action-sidebar">
            {currentUser.role === 'teacher' ? (
              <div className="action-card">
                <h3>Create Classroom</h3>
                <form onSubmit={handleCreateClassroom}>
                  <input
                    type="text"
                    value={newClassroomName}
                    onChange={e => setNewClassroomName(e.target.value)}
                    placeholder="Classroom Name"
                    required
                    minLength={3}
                  />
                  <button type="submit" disabled={isLoading} className="primary-btn">Create</button>
                </form>
              </div>
            ) : currentUser.role === 'student' ? (
              <div className="action-card">
                <h3>Join Classroom</h3>
                <form onSubmit={handleJoinClassroom}>
                  <input
                    type="text"
                    value={joinPin}
                    onChange={e => setJoinPin(e.target.value)}
                    placeholder="6-digit PIN"
                    required
                    minLength={6}
                    maxLength={6}
                  />
                  <button type="submit" disabled={isLoading} className="primary-btn">Join</button>
                </form>
              </div>
            ) : null}
            {error && <p className="error-text">{error}</p>}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
