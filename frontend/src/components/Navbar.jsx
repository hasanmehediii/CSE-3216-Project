const navItems = ['Collections', 'Technology', 'Locations', 'Reserve']

function Navbar() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Slice 3D home">
        Slice 3D
      </a>

      <nav className="primary-nav" aria-label="Primary navigation">
        {navItems.map((item, index) => (
          <button className={index === 0 ? 'active' : ''} type="button" key={item}>
            {item}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <button className="icon-btn cart" type="button" aria-label="Cart"></button>
        <button className="icon-btn globe" type="button" aria-label="Language"></button>
        <button className="order-now" type="button">
          Order Now
        </button>
      </div>
    </header>
  )
}

export default Navbar
