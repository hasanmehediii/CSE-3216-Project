import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth, apiRequest, API_URL } from '../context/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import {
  Paperclip, Send, Users, Info, Hash, FileText, User,
  BookOpen, Clock, Plus, ChevronRight, Award
} from 'lucide-react';
import './Classroom.css';

function Classroom() {
  const { currentUser, loading } = useAuth();
  const { id } = useParams();
  
  const [classroom, setClassroom] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState({ teacher: null, students: [] });
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // ── Exam state ──
  const [exams, setExams] = useState([]);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [newExam, setNewExam] = useState({
    title: '',
    exam_type: 'mcq',
    duration_minutes: 30,
  });
  const [examLoading, setExamLoading] = useState(false);

  useEffect(() => {
    if (currentUser && id) {
      loadClassroom();
      loadPosts();
      loadMembers();
      loadExams();
    }
  }, [currentUser, id]);

  async function loadClassroom() {
    try {
      const data = await apiRequest(`/classrooms/${id}`);
      setClassroom(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPosts() {
    try {
      const data = await apiRequest(`/posts/${id}`);
      setPosts(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMembers() {
    try {
      const data = await apiRequest(`/classrooms/${id}/members`);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadExams() {
    try {
      const data = await apiRequest(`/exams/classroom/${id}`);
      setExams(data);
    } catch (err) {
      console.error(err);
    }
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

  async function handleCreateExam(e) {
    e.preventDefault();
    setExamLoading(true);
    try {
      await apiRequest('/exams', {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: id,
          title: newExam.title,
          exam_type: newExam.exam_type,
          duration_minutes: parseInt(newExam.duration_minutes),
          questions: [],
        }),
      });
      setNewExam({ title: '', exam_type: 'mcq', duration_minutes: 30 });
      setShowCreateExam(false);
      await loadExams();
    } catch (err) {
      console.error(err);
    } finally {
      setExamLoading(false);
    }
  }

  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  
  if (!classroom) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading classroom details...</p>
        </div>
      </div>
    );
  }

  const stateColors = {
    draft: { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' },
    published: { bg: '#dbeafe', color: '#2563eb', label: 'Published' },
    in_progress: { bg: '#fef3c7', color: '#d97706', label: 'In Progress' },
    closed: { bg: '#fef2f2', color: '#ef4444', label: 'Closed' },
    graded: { bg: '#ecfdf5', color: '#10b981', label: 'Graded' },
  };

  return (
    <div className="page-container">
      <Navbar />
      <main className="classroom-main">
        {/* Banner Area */}
        <header className="classroom-header-banner">
          <div className="header-badge">Classroom</div>
          <h1>{classroom.name}</h1>
          <div className="header-meta">
            <span className="teacher-name-meta">
              Teacher: {members.teacher ? members.teacher.name : 'Loading...'}
            </span>
          </div>
        </header>

        <div className="classroom-layout">
          {/* Main Feed Section */}
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
                      <Paperclip size={18} />
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
                      <Send size={16} /> Post Announcement
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="posts-list">
              {posts.map(post => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="avatar">
                      {members.teacher ? members.teacher.name.charAt(0) : 'T'}
                    </div>
                    <div>
                      <strong>{members.teacher ? members.teacher.name : 'Teacher'}</strong>
                      <small>{new Date(post.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                  <div className="post-content">
                    <p>{post.content}</p>
                    {post.file_url && (
                      <a href={`${API_URL}${post.file_url}`} target="_blank" rel="noreferrer" className="attachment">
                        <FileText size={16} />
                        <span>{post.file_name}</span>
                      </a>
                    )}
                  </div>
                  
                  <div className="comments-section">
                    <div className="comments-list">
                      {post.comments.map(c => (
                        <div key={c.id} className="comment">
                          <div className="comment-avatar">
                            {c.user_name ? c.user_name.charAt(0) : 'U'}
                          </div>
                          <div className="comment-bubble">
                            <strong>{c.user_name}</strong>
                            <p>{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form className="comment-form" onSubmit={(e) => handleCommentSubmit(e, post.id)}>
                      <input type="text" name="comment" placeholder="Add a class comment..." required />
                      <button type="submit"><Send size={16} /></button>
                    </form>
                  </div>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="empty-feed-card">
                  <FileText size={40} strokeWidth={1.5} />
                  <h3>No announcements yet</h3>
                  <p>Check back later or check with your teacher.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar Section */}
          <aside className="classroom-sidebar">
            <div className="sidebar-tabs">
              <button 
                className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                <Info size={16} />
                <span>Info</span>
              </button>
              <button 
                className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                <Users size={16} />
                <span>Members</span>
              </button>
              <button 
                className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
                onClick={() => setActiveTab('exams')}
              >
                <BookOpen size={16} />
                <span>Exams</span>
              </button>
            </div>

            <div className="sidebar-card">
              {activeTab === 'info' && (
                <div className="info-tab-content">
                  <div className="info-item">
                    <span className="info-label">Class Name</span>
                    <span className="info-val">{classroom.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Enrolled</span>
                    <span className="info-val">{classroom.students.length} students</span>
                  </div>
                  {currentUser.role === 'teacher' && (
                    <div className="info-item pin-box">
                      <span className="info-label">Join PIN</span>
                      <span className="info-val pin-display">
                        <Hash size={14} />
                        {classroom.join_pin}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <div className="members-tab-content">
                  <div className="member-group">
                    <h4>Teacher</h4>
                    {members.teacher ? (
                      <div className="member-row teacher">
                        <div className="member-avatar teacher-avatar">
                          <User size={14} />
                        </div>
                        <div className="member-details">
                          <strong>{members.teacher.name}</strong>
                          <span>{members.teacher.email}</span>
                          {members.teacher.department && (
                            <span className="dept-tag">{members.teacher.department}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="no-members">No teacher assigned.</p>
                    )}
                  </div>

                  <div className="member-group">
                    <div className="group-header">
                      <h4>Students</h4>
                      <span className="member-count">{members.students.length}</span>
                    </div>
                    <div className="members-list-scroll">
                      {members.students.length > 0 ? (
                        members.students.map(student => (
                          <div key={student.id} className="member-row">
                            <div className="member-avatar">
                              {student.name.charAt(0)}
                            </div>
                            <div className="member-details">
                              <strong>{student.name}</strong>
                              <span>{student.email}</span>
                              {student.department && (
                                <span className="dept-tag">{student.department}</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-members">No students enrolled yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'exams' && (
                <div className="exams-tab-content">
                  {/* Teacher: Create Exam */}
                  {currentUser.role === 'teacher' && (
                    <div className="exam-create-section">
                      {!showCreateExam ? (
                        <button
                          className="create-exam-btn"
                          onClick={() => setShowCreateExam(true)}
                        >
                          <Plus size={16} /> New Exam
                        </button>
                      ) : (
                        <form className="create-exam-form" onSubmit={handleCreateExam}>
                          <input
                            type="text"
                            placeholder="Exam title..."
                            value={newExam.title}
                            onChange={(e) => setNewExam(p => ({ ...p, title: e.target.value }))}
                            required
                            minLength={3}
                          />
                          <div className="exam-form-row">
                            <select
                              value={newExam.exam_type}
                              onChange={(e) => setNewExam(p => ({ ...p, exam_type: e.target.value }))}
                            >
                              <option value="mcq">MCQ</option>
                              <option value="written">Written</option>
                              <option value="both">Both</option>
                            </select>
                            <div className="duration-input-group">
                              <input
                                type="number"
                                value={newExam.duration_minutes}
                                onChange={(e) => setNewExam(p => ({ ...p, duration_minutes: e.target.value }))}
                                min={1}
                                max={300}
                              />
                              <span className="duration-suffix">min</span>
                            </div>
                          </div>
                          <div className="exam-form-actions">
                            <button type="submit" disabled={examLoading} className="exam-submit-btn">
                              {examLoading ? 'Creating...' : 'Create'}
                            </button>
                            <button
                              type="button"
                              className="exam-cancel-btn"
                              onClick={() => setShowCreateExam(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Exam List */}
                  <div className="exam-list">
                    {exams.length === 0 ? (
                      <div className="exam-empty">
                        <BookOpen size={28} strokeWidth={1.5} />
                        <p>No exams yet</p>
                      </div>
                    ) : (
                      exams.map(exam => {
                        const sc = stateColors[exam.state] || stateColors.draft;
                        const linkTo = currentUser.role === 'teacher'
                          ? `/classroom/${id}/exam/${exam.id}/manage`
                          : (exam.state === 'published' || exam.state === 'in_progress')
                            ? `/classroom/${id}/exam/${exam.id}`
                            : exam.state === 'graded'
                              ? `/classroom/${id}/exam/${exam.id}/result`
                              : null;

                        const card = (
                          <div className="exam-card" key={exam.id}>
                            <div className="exam-card-top">
                              <div className="exam-card-title">{exam.title}</div>
                              <span
                                className="exam-state-badge"
                                style={{ background: sc.bg, color: sc.color }}
                              >
                                {sc.label}
                              </span>
                            </div>
                            <div className="exam-card-meta">
                              <span className="exam-meta-item">
                                <BookOpen size={12} /> {exam.exam_type}
                              </span>
                              <span className="exam-meta-item">
                                <Clock size={12} /> {exam.duration_minutes}m
                              </span>
                              <span className="exam-meta-item">
                                {exam.total_questions} Q
                              </span>
                            </div>
                            {linkTo && (
                              <div className="exam-card-action">
                                <ChevronRight size={16} />
                              </div>
                            )}
                          </div>
                        );

                        return linkTo ? (
                          <Link to={linkTo} key={exam.id} className="exam-card-link">
                            {card}
                          </Link>
                        ) : (
                          <div key={exam.id}>{card}</div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Classroom;
