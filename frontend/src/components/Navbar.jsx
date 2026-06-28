function Navbar({ currentUser, onLogout }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Campus access home">
        Campus Access
      </a>

      <div className="header-actions">
        {currentUser ? (
          <>
            <span>{currentUser.name}</span>
            <button className="secondary-action" type="button" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <span>Factory Pattern Lab</span>
        )}
      </div>
    </header>
  )
}

export default Navbar
