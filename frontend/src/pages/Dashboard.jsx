import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth, apiRequest } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { BookOpen, Plus, LogIn, Users, Hash, Clock } from 'lucide-react';
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

  const accentColors = [
    { bg: '#eef2ff', border: '#4f46e5', text: '#4f46e5' },
    { bg: '#ecfdf5', border: '#10b981', text: '#10b981' },
    { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
    { bg: '#fce7f3', border: '#ec4899', text: '#ec4899' },
    { bg: '#f0f9ff', border: '#0ea5e9', text: '#0ea5e9' },
    { bg: '#faf5ff', border: '#8b5cf6', text: '#8b5cf6' },
  ];

  if (currentUser.role === 'staff') {
    return (
      <div className="page-container">
        <Navbar />
        <main className="dashboard-main">
          <div className="coming-soon-card">
            <div className="coming-soon-icon">🚀</div>
            <h1>Coming Soon</h1>
            <p>
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
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <p className="welcome-greeting">
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'},
            </p>
            <h1>{currentUser.name}</h1>
            <div className="welcome-meta">
              <span className="role-badge">{currentUser.role}</span>
              <span className="dept-badge">{currentUser.department || 'General'}</span>
            </div>
          </div>
          <div className="welcome-stats">
            <div className="mini-stat">
              <BookOpen size={20} />
              <div>
                <strong>{classrooms.length}</strong>
                <span>Classrooms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Classrooms Section */}
          <section className="classrooms-section">
            <div className="section-title">
              <h2>Your Classrooms</h2>
              <span className="count-badge">{classrooms.length}</span>
            </div>
            {classrooms.length === 0 ? (
              <div className="empty-card">
                <BookOpen size={40} strokeWidth={1.5} />
                <h3>No classrooms yet</h3>
                <p>
                  {currentUser.role === 'teacher'
                    ? 'Create your first classroom to get started.'
                    : 'Join a classroom using a PIN from your teacher.'}
                </p>
              </div>
            ) : (
              <div className="classroom-grid">
                {classrooms.map((c, index) => {
                  const accent = accentColors[index % accentColors.length];
                  return (
                    <Link to={`/classroom/${c.id}`} key={c.id} className="classroom-card">
                      <div className="card-accent" style={{ background: accent.border }}></div>
                      <div className="card-body">
                        <div className="card-icon" style={{ background: accent.bg, color: accent.text }}>
                          <BookOpen size={20} />
                        </div>
                        <h3>{c.name}</h3>
                        <div className="card-meta">
                          {currentUser.role === 'teacher' && (
                            <span className="pin-tag">
                              <Hash size={13} />
                              {c.join_pin}
                            </span>
                          )}
                          <span className="students-tag">
                            <Users size={13} />
                            {c.students?.length || 0} students
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Action Sidebar */}
          <aside className="action-sidebar">
            {currentUser.role === 'teacher' ? (
              <div className="action-card">
                <div className="action-card-header">
                  <div className="action-icon">
                    <Plus size={18} />
                  </div>
                  <h3>Create Classroom</h3>
                </div>
                <p className="action-desc">Start a new classroom and share the PIN with your students.</p>
                <form onSubmit={handleCreateClassroom}>
                  <input
                    type="text"
                    value={newClassroomName}
                    onChange={e => setNewClassroomName(e.target.value)}
                    placeholder="e.g. Software Engineering 101"
                    required
                    minLength={3}
                  />
                  <button type="submit" disabled={isLoading} className="primary-btn">
                    <Plus size={16} />
                    Create Classroom
                  </button>
                </form>
              </div>
            ) : currentUser.role === 'student' ? (
              <div className="action-card">
                <div className="action-card-header">
                  <div className="action-icon join-icon">
                    <LogIn size={18} />
                  </div>
                  <h3>Join Classroom</h3>
                </div>
                <p className="action-desc">Enter the 6-digit PIN provided by your teacher.</p>
                <form onSubmit={handleJoinClassroom}>
                  <input
                    type="text"
                    value={joinPin}
                    onChange={e => setJoinPin(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    required
                    minLength={6}
                    maxLength={6}
                    className="pin-input"
                  />
                  <button type="submit" disabled={isLoading} className="primary-btn">
                    <LogIn size={16} />
                    Join Classroom
                  </button>
                </form>
              </div>
            ) : null}
            {error && <p className="error-text">{error}</p>}

            {/* Quick Info Card */}
            <div className="info-card">
              <Clock size={16} />
              <div>
                <strong>Today</strong>
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
