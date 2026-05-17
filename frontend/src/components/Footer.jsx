const footerLinks = ['Technical Specs', 'Sustainability', 'Journal', 'Privacy Policy']

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Slice 3D</strong>
        <p>(c) 2024 Slice 3D. Precision-crafted tech-gourmet excellence.</p>
      </div>

      <nav className="footer-links" aria-label="Footer navigation">
        {footerLinks.map((link) => (
          <button type="button" key={link}>
            {link}
          </button>
        ))}
      </nav>

      <div className="footer-icons" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </footer>
  )
}

export default Footer
