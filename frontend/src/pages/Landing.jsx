import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useScrollObserver } from '../hooks/useScrollObserver';
import './Landing.css';

function Landing() {
  const { currentUser, loading } = useAuth();
  const addToRefs = useScrollObserver();

  if (loading) return null;
  if (currentUser) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing-page">
      <Navbar />

      <main className="landing-content">
        <section className="hero-section" style={{ backgroundImage: "url('/banners.png')" }}>
          <div className="hero-overlay"></div>
          <div className="hero-text-container">
            <div className="hero-text fade-in-up visible">
              <h1 className="hero-title">Infinite Loop University INU</h1>
              <p className="hero-subtitle">
                Empowering the next generation of innovators, thinkers, and leaders. Join a vibrant academic community dedicated to excellence, research, and practical application.
              </p>
              <div className="hero-actions">
                <a href="/auth" className="primary-btn-large">Explore Programs</a>
                <a href="#about" className="secondary-btn-large">Learn More</a>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="info-section">
          <div className="info-container">
            <div className="info-row" ref={addToRefs}>
              <div className="info-text">
                <h2 className="section-heading">A Legacy of Excellence</h2>
                <p>
                  Founded in the heart of technological advancement, Infinite Loop University (INU) has grown from a specialized technical institute into a comprehensive global university. Our alumni lead some of the world's most innovative organizations. We believe in learning by doing, prioritizing hands-on experience and real-world problem-solving over traditional lectures.
                </p>
              </div>
              <div className="info-visual">
                <div className="visual-box visual-1"></div>
              </div>
            </div>

            <div className="info-row reverse" ref={addToRefs}>
              <div className="info-text">
                <h2 className="section-heading">State-of-the-Art Campus</h2>
                <p>
                  Nestled in the bustling innovation hub of the city, our campus features modern research facilities, collaborative student spaces, and advanced digital infrastructure. Whether you're working in our quantum computing labs or enjoying the serene green spaces, the INU campus is designed to inspire your best work.
                </p>
              </div>
              <div className="info-visual">
                <div className="visual-box visual-2"></div>
              </div>
            </div>

            <div className="info-row" ref={addToRefs}>
              <div className="info-text">
                <h2 className="section-heading">Industry-Aligned Curriculum</h2>
                <p>
                  With a rigorous curriculum designed by industry experts and leading academics, INU ensures that students are not just learning theory. Through our extensive internship programs and industry partnerships, every student graduates with a robust portfolio and a network of professional connections.
                </p>
              </div>
              <div className="info-visual">
                <div className="visual-box visual-3"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-section" ref={addToRefs}>
          <div className="stats-container">
            <div className="stat-card">
              <h3>50+</h3>
              <p>Undergraduate Programs</p>
            </div>
            <div className="stat-card">
              <h3>98%</h3>
              <p>Employment Rate</p>
            </div>
            <div className="stat-card">
              <h3>120</h3>
              <p>Research Labs</p>
            </div>
            <div className="stat-card">
              <h3>30k+</h3>
              <p>Global Alumni</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Landing;
