import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

function Navbar({ user, onLogout }) {
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/dashboard" className="navbar__brand">
          <span className="navbar__logo">✈️</span>
          <span className="navbar__title">TravelPlanner</span>
        </Link>

        <div className="navbar__links">
          <Link
            to="/dashboard"
            className={`navbar__link ${location.pathname === '/dashboard' ? 'navbar__link--active' : ''}`}
          >
            🗺️ My Trips
          </Link>
          <Link
            to="/new-trip"
            className={`navbar__link ${location.pathname === '/new-trip' ? 'navbar__link--active' : ''}`}
          >
            ➕ New Trip
          </Link>
        </div>

        <div className="navbar__user">
          <span className="navbar__avatar">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <span className="navbar__username">{user.username}</span>
          <button className="navbar__logout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
