import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTrips } from '../api'
import TripCard from '../components/TripCard'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import './Dashboard.css'

function Dashboard({ user }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTrips()
  }, [user.id])

  const loadTrips = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTrips(user.id)
      setTrips(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to load trips. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard page-container">
        <LoadingSpinner message="Loading your trips..." />
      </div>
    )
  }

  return (
    <div className="dashboard page-container">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            Welcome back, {user.username}! 👋
          </h1>
          <p className="dashboard__subtitle">
            {trips.length > 0
              ? `You have ${trips.length} trip${trips.length !== 1 ? 's' : ''} planned`
              : 'Ready to plan your next adventure?'
            }
          </p>
        </div>
        <Link to="/new-trip">
          <Button variant="primary" size="large">
            ➕ Plan New Trip
          </Button>
        </Link>
      </div>

      {error && (
        <div className="dashboard__error">
          <p>{error}</p>
          <Button variant="outline" size="small" onClick={loadTrips}>
            Retry
          </Button>
        </div>
      )}

      {!error && trips.length === 0 && (
        <EmptyState
          emoji="🌎"
          title="No trips yet!"
          message="Start planning your dream vacation. Our AI will help you create the perfect itinerary, find great hotels, and discover amazing restaurants."
          action={
            <Link to="/new-trip">
              <Button variant="primary" size="large">
                Plan Your First Trip ✈️
              </Button>
            </Link>
          }
        />
      )}

      {trips.length > 0 && (
        <div className="dashboard__grid">
          {trips.map((trip, index) => (
            <TripCard key={trip.id} trip={trip} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
