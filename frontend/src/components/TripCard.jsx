import { Link } from 'react-router-dom'
import './TripCard.css'

const GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
  'linear-gradient(135deg, #4ECDC4 0%, #6FE0D8 100%)',
  'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
  'linear-gradient(135deg, #FF9F43 0%, #FFD93D 100%)',
  'linear-gradient(135deg, #74B9FF 0%, #A0D2FF 100%)',
  'linear-gradient(135deg, #FF6EB4 0%, #FF9ED2 100%)',
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TripCard({ trip, index = 0 }) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const hasItinerary = trip.itinerary && trip.itinerary.length > 0
  const hasHotels = trip.hotels && trip.hotels.length > 0
  const hasRestaurants = trip.restaurants && trip.restaurants.length > 0

  return (
    <Link to={`/trips/${trip.id}`} className="trip-card" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="trip-card__header" style={{ background: gradient }}>
        <span className="trip-card__destination-emoji">🌍</span>
        <h3 className="trip-card__destination">{trip.destination}</h3>
      </div>
      <div className="trip-card__body">
        <div className="trip-card__dates">
          <span className="trip-card__date-icon">📅</span>
          <span>{formatDate(trip.start_date)} - {formatDate(trip.end_date)}</span>
        </div>
        <div className="trip-card__badges">
          <span className={`trip-card__badge ${hasItinerary ? 'trip-card__badge--active' : ''}`}>
            🗺️ Itinerary
          </span>
          <span className={`trip-card__badge ${hasHotels ? 'trip-card__badge--active' : ''}`}>
            🏨 Hotels
          </span>
          <span className={`trip-card__badge ${hasRestaurants ? 'trip-card__badge--active' : ''}`}>
            🍽️ Restaurants
          </span>
        </div>
      </div>
    </Link>
  )
}

export default TripCard
