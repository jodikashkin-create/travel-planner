import { useState } from 'react'
import { getOrCreateUser } from '../api'
import Button from '../components/Button'
import './Home.css'

function Home({ onLogin }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Please enter a username')
      return
    }
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      const user = await getOrCreateUser(trimmed)
      onLogin(user)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <div className="home__bg">
        <div className="home__bg-shape home__bg-shape--1"></div>
        <div className="home__bg-shape home__bg-shape--2"></div>
        <div className="home__bg-shape home__bg-shape--3"></div>
      </div>

      <div className="home__content">
        <div className="home__hero">
          <div className="home__emojis">
            <span className="home__emoji home__emoji--1">✈️</span>
            <span className="home__emoji home__emoji--2">🌍</span>
            <span className="home__emoji home__emoji--3">🏖️</span>
            <span className="home__emoji home__emoji--4">🗺️</span>
            <span className="home__emoji home__emoji--5">🌄</span>
          </div>

          <h1 className="home__title">
            Plan Your Dream Trip
            <br />
            <span className="home__title-highlight">with AI ✈️</span>
          </h1>

          <p className="home__subtitle">
            Get personalized itineraries, hotel recommendations,
            and restaurant picks — all powered by AI.
          </p>

          <form className="home__form" onSubmit={handleSubmit}>
            <div className="home__input-group">
              <input
                type="text"
                className="home__input"
                placeholder="Choose a username to get started..."
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                }}
                disabled={loading}
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={loading}
              >
                {loading ? 'Loading...' : "Let's Go! 🚀"}
              </Button>
            </div>
            {error && <p className="home__error">{error}</p>}
          </form>

          <div className="home__features">
            <div className="home__feature">
              <span className="home__feature-icon">🗺️</span>
              <span className="home__feature-text">AI Itineraries</span>
            </div>
            <div className="home__feature">
              <span className="home__feature-icon">🏨</span>
              <span className="home__feature-text">Hotel Search</span>
            </div>
            <div className="home__feature">
              <span className="home__feature-icon">🍽️</span>
              <span className="home__feature-text">Restaurant Picks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
