import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h2>INU</h2>
          <p>Infinite Loop University</p>
          <p className="tagline">Empowering the next generation of leaders.</p>
        </div>
        
        <div className="footer-links">
          <div className="link-group">
            <h3>Academics</h3>
            <a href="#programs">Programs</a>
            <a href="#research">Research</a>
            <a href="#faculty">Faculty</a>
          </div>
          
          <div className="link-group">
            <h3>Campus Life</h3>
            <a href="#housing">Housing</a>
            <a href="#events">Events</a>
            <a href="#facilities">Facilities</a>
          </div>
          
          <div className="link-group">
            <h3>Connect</h3>
            <a href="#contact">Contact Us</a>
            <a href="#alumni">Alumni</a>
            <a href="#support">Support INU</a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Infinite Loop University. All rights reserved.</p>
        <div className="legal-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
