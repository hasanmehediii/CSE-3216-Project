import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, apiRequest } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';
import './Auth.css';

function Auth() {
  const { currentUser, login, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: 'CSE',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) return null;
  
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  async function submitAuth(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const payload = mode === 'register' ? form : { email: form.email, password: form.password };
      const data = await apiRequest(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      login(data.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  return (
    <div className="auth-page">
      {/* Left Side — Auth Form */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <Link to="/" className="auth-brand">
            <GraduationCap size={28} />
            <span>INU</span>
          </Link>

          <div className="auth-card">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p className="auth-subtitle">
              {mode === 'login'
                ? 'Sign in to access your INU portal'
                : 'Join Infinite Loop University today'}
            </p>
            
            <div className="tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
                Login
              </button>
              <button
                className={mode === 'register' ? 'active' : ''}
                onClick={() => setMode('register')}
                type="button"
              >
                Register
              </button>
            </div>

            <form onSubmit={submitAuth} className="auth-form">
              {mode === 'register' && (
                <>
                  <label>
                    <span>Full Name</span>
                    <input name="name" onChange={updateForm} required value={form.name} placeholder="John Doe" />
                  </label>
                  <div className="form-row">
                    <label>
                      <span>Role</span>
                      <select name="role" onChange={updateForm} value={form.role}>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="staff">Staff</option>
                      </select>
                    </label>
                    <label>
                      <span>Department</span>
                      <input name="department" onChange={updateForm} value={form.department} placeholder="e.g. CSE" />
                    </label>
                  </div>
                </>
              )}

              <label>
                <span>Email Address</span>
                <input name="email" onChange={updateForm} required type="email" value={form.email} placeholder="you@university.edu" />
              </label>
              <label>
                <span>Password</span>
                <input
                  minLength={6}
                  name="password"
                  onChange={updateForm}
                  required
                  type="password"
                  value={form.password}
                  placeholder="••••••••"
                />
              </label>

              <button className="primary-btn" disabled={isLoading} type="submit">
                {isLoading ? 'Processing...' : (mode === 'register' ? 'Create Account' : 'Sign In')}
              </button>
              {message && <p className="error-message">{message}</p>}
            </form>
          </div>

          <p className="auth-footer-text">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="switch-mode-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side — Banner Image */}
      <div className="auth-right">
        <div className="auth-banner-overlay"></div>
        <div className="auth-banner-content">
          <h2>Infinite Loop University</h2>
          <p>Empowering the next generation of innovators, thinkers, and leaders.</p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
