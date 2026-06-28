import { useEffect, useMemo, useState } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import './Home.css'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const roleLabels = {
  student: 'Student',
  teacher: 'Teacher',
  staff: 'Stuff',
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Request failed')
  }
  return data
}

function Home() {
  const [currentUser, setCurrentUser] = useState(null)
  const [visibleUsers, setVisibleUsers] = useState(null)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: 'CSE',
  })
  const [selectedRole, setSelectedRole] = useState('student')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const activeRole = currentUser?.role || selectedRole

  const roleButtons = useMemo(
    () => [
      { key: 'student', label: 'Student' },
      { key: 'teacher', label: 'Teacher' },
      { key: 'staff', label: 'Stuff' },
    ],
    [],
  )

  async function loadVisibleUsers() {
    const data = await apiRequest('/users/visible')
    setVisibleUsers(data)
  }

  useEffect(() => {
    let isMounted = true

    apiRequest('/auth/me')
      .then(async (data) => {
        const visible = await apiRequest('/users/visible')
        if (isMounted) {
          setCurrentUser(data.user)
          setVisibleUsers(visible)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null)
          setVisibleUsers(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  function selectRole(role) {
    setSelectedRole(role)
    setForm((previous) => ({
      ...previous,
      role,
    }))
  }

  async function submitAuth(event) {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const payload =
        mode === 'register'
          ? form
          : {
              email: form.email,
              password: form.password,
            }
      const data = await apiRequest(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setCurrentUser(data.user)
      await loadVisibleUsers()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' })
    setCurrentUser(null)
    setVisibleUsers(null)
  }

  function updateForm(event) {
    const { name, value } = event.target
    if (name === 'role') {
      setSelectedRole(value)
    }
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  return (
    <div className="app-shell">
      <Navbar currentUser={currentUser} onLogout={logout} />

      <main className="workspace">
        <section className="role-panel">
          <div>
            <p className="eyebrow">Abstract Factory Assignment</p>
            <h1>Campus users by role</h1>
            <p>
              Select a role, register or log in, and view the other available user groups from MongoDB.
            </p>
          </div>

          <div className="role-buttons" aria-label="Role selection">
            {roleButtons.map((role) => (
              <button
                className={activeRole === role.key ? 'active' : ''}
                disabled={isLoading}
                key={role.key}
                onClick={() => selectRole(role.key)}
                type="button"
              >
                {role.label}
              </button>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <aside className="auth-panel">
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

            <form onSubmit={submitAuth}>
              {mode === 'register' && (
                <>
                  <label>
                    Name
                    <input name="name" onChange={updateForm} required value={form.name} />
                  </label>
                  <label>
                    Role
                    <select name="role" onChange={updateForm} value={form.role}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="staff">Stuff</option>
                    </select>
                  </label>
                  <label>
                    Department
                    <input name="department" onChange={updateForm} value={form.department} />
                  </label>
                </>
              )}

              <label>
                Email
                <input name="email" onChange={updateForm} required type="email" value={form.email} />
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
                />
              </label>

              <button className="primary-action" disabled={isLoading} type="submit">
                {mode === 'register' ? 'Create Account' : 'Login'}
              </button>
            </form>

            {currentUser && (
              <div className="session-box">
                <strong>{roleLabels[currentUser.role]}</strong>
                <span>{currentUser.email}</span>
              </div>
            )}

            {message && <p className="status-text">{message}</p>}
          </aside>

          <section className="users-area">
            <div className="section-heading">
              <p className="eyebrow">Visible Users</p>
              <h2>
                {currentUser
                  ? `${roleLabels[currentUser.role]} dashboard`
                  : 'Login to view users'}
              </h2>
            </div>

            <div className="user-columns">
              {visibleUsers?.columns?.map((column) => (
                <article className="user-column" key={column.role}>
                  <h3>{roleLabels[column.role]}</h3>
                  {column.users.length ? (
                    column.users.map((user) => (
                      <div className="user-row" key={user.id}>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.department || 'General'}</span>
                        </div>
                        <small>{user.email}</small>
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">No users found.</p>
                  )}
                </article>
              ))}

              {!visibleUsers && (
                <>
                  <article className="user-column empty-state">
                    <h3>Column One</h3>
                    <p>Teacher, student, or stuff users appear here.</p>
                  </article>
                  <article className="user-column empty-state">
                    <h3>Column Two</h3>
                    <p>The selected role never sees its own group.</p>
                  </article>
                </>
              )}
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Home
