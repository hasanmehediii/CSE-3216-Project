import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import './Profile.css';

function Profile() {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
      <Navbar />
      <main className="profile-main">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">{currentUser.name.charAt(0)}</div>
            <h2>{currentUser.name}</h2>
            <span className="role-badge">{currentUser.role}</span>
          </div>
          
          <div className="profile-details">
            <div className="detail-item">
              <label>Email</label>
              <p>{currentUser.email}</p>
            </div>
            <div className="detail-item">
              <label>Department</label>
              <p>{currentUser.department || 'N/A'}</p>
            </div>
          </div>
          
          <div className="profile-actions">
            <button className="primary-btn">Edit Profile</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
