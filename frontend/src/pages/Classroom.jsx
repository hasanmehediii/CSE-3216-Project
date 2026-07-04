import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth, apiRequest, API_URL } from '../context/AuthContext';
import { Navigate, useParams } from 'react-router-dom';
import { Paperclip, Send } from 'lucide-react';
import './Classroom.css';

function Classroom() {
  const { currentUser, loading } = useAuth();
  const { id } = useParams();
  
  const [classroom, setClassroom] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (currentUser && id) {
      loadClassroom();
      loadPosts();
    }
  }, [currentUser, id]);

  async function loadClassroom() {
    const data = await apiRequest(`/classrooms/${id}`);
    setClassroom(data);
  }

  async function loadPosts() {
    const data = await apiRequest(`/posts/${id}`);
    setPosts(data);
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    setIsPosting(true);
    
    const formData = new FormData();
    formData.append('classroom_id', id);
    formData.append('content', newPostContent);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData, 
      });
      if (!response.ok) throw new Error('Failed to post');
      
      setNewPostContent('');
      setSelectedFile(null);
      await loadPosts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleCommentSubmit(e, postId) {
    e.preventDefault();
    const input = e.target.elements.comment;
    if (!input.value) return;

    try {
      await apiRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: input.value })
      });
      input.value = '';
      await loadPosts();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  if (!classroom) return <div className="page-container"><Navbar /><div>Loading...</div></div>;

  return (
    <div className="page-container">
      <Navbar />
      <main className="classroom-main">
        <header className="classroom-header">
          <div>
            <h1>{classroom.name}</h1>
            <p>Teacher ID: {classroom.teacher_id}</p>
          </div>
        </header>

        <div className="classroom-layout">
          <div className="feed-section">
            {currentUser.role === 'teacher' && (
              <div className="create-post-card">
                <form onSubmit={handleCreatePost}>
                  <textarea
                    placeholder="Announce something to your class..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    required
                  />
                  <div className="post-actions">
                    <label className="file-upload-label">
                      <Paperclip size={20} />
                      <input 
                        type="file" 
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                      <span className="filename">
                        {selectedFile ? selectedFile.name : 'Attach file'}
                      </span>
                    </label>
                    <button type="submit" disabled={isPosting} className="primary-btn">
                      <Send size={18} /> Post
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="posts-list">
              {posts.map(post => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="avatar">T</div>
                    <div>
                      <strong>Teacher</strong>
                      <small>{new Date(post.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                  <div className="post-content">
                    <p>{post.content}</p>
                    {post.file_url && (
                      <a href={`${API_URL}${post.file_url}`} target="_blank" rel="noreferrer" className="attachment">
                        <Paperclip size={16} /> {post.file_name}
                      </a>
                    )}
                  </div>
                  
                  <div className="comments-section">
                    <div className="comments-list">
                      {post.comments.map(c => (
                        <div key={c.id} className="comment">
                          <strong>{c.user_name}</strong>: {c.content}
                        </div>
                      ))}
                    </div>
                    <form className="comment-form" onSubmit={(e) => handleCommentSubmit(e, post.id)}>
                      <input type="text" name="comment" placeholder="Add a class comment..." />
                      <button type="submit"><Send size={16} /></button>
                    </form>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <p className="empty-state">No posts yet.</p>}
            </div>
          </div>
          
          <aside className="classroom-sidebar">
            <div className="sidebar-card">
              <h3>Class Info</h3>
              <p>Total Students: {classroom.students.length}</p>
              {currentUser.role === 'teacher' && (
                <p>Join PIN: <strong>{classroom.join_pin}</strong></p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Classroom;
