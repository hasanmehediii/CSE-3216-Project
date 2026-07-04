import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, apiRequest, API_URL } from '../context/AuthContext';
import { Bell } from 'lucide-react';
import './Navbar.css';

function Navbar() {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ws = useRef(null);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      connectWebSocket();
    }
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [currentUser]);

  function connectWebSocket() {
    const wsUrl = API_URL.replace('http', 'ws') + `/notifications/ws/${currentUser.id}`;
    ws.current = new WebSocket(wsUrl);
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_notification') {
        setNotifications(prev => {
          // Keep only 3 notifications max in UI as well
          const updated = [message.data, ...prev];
          return updated.slice(0, 3);
        });
        setUnreadCount(prev => prev + 1);
      }
    };
  }

  async function loadNotifications() {
    try {
      const data = await apiRequest(`/notifications`);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error(err);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return null;

  return (
    <div className="navbar-container">
      <nav className="pill-navbar">
        <Link to={currentUser ? "/dashboard" : "/"} className="brand">
          INU
        </Link>

        <div className="nav-links">
          {currentUser && (
            <>
              <Link to="/dashboard" className="nav-item">Dashboard</Link>
              <Link to="/profile" className="nav-item">Profile</Link>
              <Link to="/routine" className="nav-item">Routine</Link>
            </>
          )}
        </div>

        <div className="nav-actions">
          {currentUser ? (
            <div className="user-menu">
              <div className="notification-wrapper">
                <button className="bell-btn" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                
                {showNotifications && (
                  <div className="notification-dropdown">
                    <h3>Notifications</h3>
                    {notifications.length === 0 ? (
                      <p className="empty-notif">No new notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`notif-item ${n.is_read ? '' : 'unread'}`}
                          onClick={() => {
                            if (!n.is_read) markAsRead(n.id);
                            navigate(`/classroom/${n.classroom_id}`);
                            setShowNotifications(false);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <p>{n.message}</p>
                          <small>{new Date(n.created_at).toLocaleString()}</small>
                          {!n.is_read && <div className="read-indicator"></div>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <span className="user-greeting">Hi, {currentUser.name}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="auth-menu">
              <Link to="/auth" className="nav-item">Login</Link>
              <Link to="/auth" className="primary-btn-small">Register</Link>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Navbar;
