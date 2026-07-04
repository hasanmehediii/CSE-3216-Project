import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth, apiRequest } from '../context/AuthContext';
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
      <Navbar />

      <main className="auth-container">
        <div className="auth-card">
          <h2>Welcome to INU</h2>
          <p className="auth-subtitle">Infinite Loop University Portal</p>
          
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
                  Name
                  <input name="name" onChange={updateForm} required value={form.name} placeholder="John Doe" />
                </label>
                <div className="form-row">
                  <label>
                    Role
                    <select name="role" onChange={updateForm} value={form.role}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>
                  <label>
                    Department
                    <input name="department" onChange={updateForm} value={form.department} placeholder="e.g. CSE" />
                  </label>
                </div>
              </>
            )}

            <label>
              Email
              <input name="email" onChange={updateForm} required type="email" value={form.email} placeholder="you@university.edu" />
            </label>
            <label>
              Password
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
      </main>
    </div>
  );
}

export default Auth;
