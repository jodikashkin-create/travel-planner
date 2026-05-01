import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip, deleteTrip, generateItinerary, searchHotels, searchRestaurants } from '../api'
import Button from '../components/Button'
import HotelCard from '../components/HotelCard'
import RestaurantCard from '../components/RestaurantCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import './TripDetail.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatItinerary(text) {
  if (!text) return []

  const lines = text.split('\n')
  const blocks = []
  let currentBlock = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check if line is a day header (starts with Day, ##, or **)
    const dayMatch = trimmed.match(/^(?:#{1,3}\s*)?(?:\*\*)?(?:Day\s+\d+|DAY\s+\d+)/i)
    if (dayMatch) {
      if (currentBlock) blocks.push(currentBlock)
      const headerText = trimmed.replace(/^#{1,3}\s*/, '').replace(/\*\*/g, '').trim()
      currentBlock = { header: headerText, items: [] }
    } else if (currentBlock) {
      // Clean up markdown formatting
      const cleaned = trimmed
        .replace(/^\*\*(.+?)\*\*/, '$1')
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
      if (cleaned) currentBlock.items.push(cleaned)
    } else {
      // No day header yet, create a general block
      if (!currentBlock) {
        currentBlock = { header: '', items: [] }
      }
      const cleaned = trimmed
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
      if (cleaned) currentBlock.items.push(cleaned)
    }
  }

  if (currentBlock) blocks.push(currentBlock)
  return blocks
}

function ItineraryView({ itinerary }) {
  if (!itinerary) return null

  const content = typeof itinerary === 'string'
    ? itinerary
    : itinerary.content || itinerary.text || JSON.stringify(itinerary)

  const blocks = formatItinerary(content)

  if (blocks.length === 0) {
    return (
      <div className="itinerary-raw">
        <p>{content}</p>
      </div>
    )
  }

  const dayColors = [
    'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
    'linear-gradient(135deg, #4ECDC4, #6FE0D8)',
    'linear-gradient(135deg, #A855F7, #C084FC)',
    'linear-gradient(135deg, #FF9F43, #FFD93D)',
    'linear-gradient(135deg, #74B9FF, #A0D2FF)',
    'linear-gradient(135deg, #FF6EB4, #FF9ED2)',
  ]

  return (
    <div className="itinerary-blocks">
      {blocks.map((block, i) => (
        <div key={i} className="itinerary-block" style={{ animationDelay: `${i * 0.1}s` }}>
          {block.header && (
            <div className="itinerary-block__header" style={{ background: dayColors[i % dayColors.length] }}>
              <span className="itinerary-block__day-icon">📍</span>
              <h3>{block.header}</h3>
            </div>
          )}
          <div className="itinerary-block__body">
            {block.items.map((item, j) => (
              <div key={j} className="itinerary-block__item">
                <span className="itinerary-block__bullet">•</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('itinerary')
  const [generating, setGenerating] = useState({
    itinerary: false,
    hotels: false,
    restaurants: false,
  })
  const [genError, setGenError] = useState({
    itinerary: '',
    hotels: '',
    restaurants: '',
  })

  const loadTrip = useCallback(async () => {
    try {
      const data = await getTrip(id)
      setTrip(data)
    } catch (err) {
      setError('Failed to load trip details.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadTrip()
  }, [loadTrip])

  const handleGenerate = async (type) => {
    setGenerating((prev) => ({ ...prev, [type]: true }))
    setGenError((prev) => ({ ...prev, [type]: '' }))

    try {
      const generators = {
        itinerary: generateItinerary,
        hotels: searchHotels,
        restaurants: searchRestaurants,
      }

      await generators[type](id)
      await loadTrip()
    } catch (err) {
      setGenError((prev) => ({
        ...prev,
        [type]: `Failed to generate ${type}. Please try again.`,
      }))
      console.error(err)
    } finally {
      setGenerating((prev) => ({ ...prev, [type]: false }))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return

    try {
      await deleteTrip(id)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      alert('Failed to delete trip.')
    }
  }

  if (loading) {
    return (
      <div className="trip-detail page-container">
        <LoadingSpinner message="Loading trip details..." />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="trip-detail page-container">
        <EmptyState
          emoji="😕"
          title="Oops!"
          message={error || 'Trip not found.'}
          action={
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          }
        />
      </div>
    )
  }

  const hasItinerary = trip.itinerary && (typeof trip.itinerary === 'string' ? trip.itinerary.length > 0 : true)
  const hasHotels = Array.isArray(trip.hotels) && trip.hotels.length > 0
  const hasRestaurants = Array.isArray(trip.restaurants) && trip.restaurants.length > 0

  const tabs = [
    { key: 'itinerary', label: '🗺️ Itinerary', hasData: hasItinerary },
    { key: 'hotels', label: '🏨 Hotels', hasData: hasHotels },
    { key: 'restaurants', label: '🍽️ Restaurants', hasData: hasRestaurants },
  ]

  const genMessages = {
    itinerary: 'Creating your perfect itinerary... Our AI is planning an amazing trip for you!',
    hotels: 'Searching for the best hotels... Finding the perfect places to stay!',
    restaurants: 'Discovering amazing restaurants... Getting the tastiest recommendations!',
  }

  return (
    <div className="trip-detail page-container">
      <div className="trip-detail__hero">
        <div className="trip-detail__hero-content">
          <button className="trip-detail__back" onClick={() => navigate('/dashboard')}>
            ← Back to trips
          </button>
          <h1 className="trip-detail__destination">
            🌍 {trip.destination}
          </h1>
          <p className="trip-detail__dates">
            📅 {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
          </p>
          {trip.preferences && (
            <p className="trip-detail__preferences">
              💡 {trip.preferences}
            </p>
          )}
        </div>
        <button className="trip-detail__delete" onClick={handleDelete} title="Delete trip">
          🗑️ Delete
        </button>
      </div>

      <div className="trip-detail__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`trip-detail__tab ${activeTab === tab.key ? 'trip-detail__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.hasData && <span className="trip-detail__tab-dot"></span>}
          </button>
        ))}
      </div>

      <div className="trip-detail__content">
        {/* ITINERARY TAB */}
        {activeTab === 'itinerary' && (
          <div className="trip-detail__section">
            {generating.itinerary ? (
              <LoadingSpinner message={genMessages.itinerary} size="large" />
            ) : hasItinerary ? (
              <>
                <div className="trip-detail__section-header">
                  <h2>Your Itinerary</h2>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleGenerate('itinerary')}
                  >
                    🔄 Regenerate
                  </Button>
                </div>
                <ItineraryView itinerary={trip.itinerary} />
              </>
            ) : (
              <>
                {genError.itinerary && (
                  <p className="trip-detail__gen-error">{genError.itinerary}</p>
                )}
                <EmptyState
                  emoji="🗺️"
                  title="No itinerary yet"
                  message="Let our AI create a personalized day-by-day itinerary for your trip!"
                  action={
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => handleGenerate('itinerary')}
                    >
                      Generate Itinerary ✨
                    </Button>
                  }
                />
              </>
            )}
          </div>
        )}

        {/* HOTELS TAB */}
        {activeTab === 'hotels' && (
          <div className="trip-detail__section">
            {generating.hotels ? (
              <LoadingSpinner message={genMessages.hotels} size="large" />
            ) : hasHotels ? (
              <>
                <div className="trip-detail__section-header">
                  <h2>Hotel Recommendations</h2>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleGenerate('hotels')}
                  >
                    🔄 Search Again
                  </Button>
                </div>
                <div className="trip-detail__card-grid">
                  {trip.hotels.map((hotel, i) => (
                    <HotelCard key={i} hotel={hotel} index={i} />
                  ))}
                </div>
              </>
            ) : (
              <>
                {genError.hotels && (
                  <p className="trip-detail__gen-error">{genError.hotels}</p>
                )}
                <EmptyState
                  emoji="🏨"
                  title="No hotel recommendations yet"
                  message="Search for the best hotels at your destination with AI-powered recommendations!"
                  action={
                    <Button
                      variant="secondary"
                      size="large"
                      onClick={() => handleGenerate('hotels')}
                    >
                      Search Hotels 🔍
                    </Button>
                  }
                />
              </>
            )}
          </div>
        )}

        {/* RESTAURANTS TAB */}
        {activeTab === 'restaurants' && (
          <div className="trip-detail__section">
            {generating.restaurants ? (
              <LoadingSpinner message={genMessages.restaurants} size="large" />
            ) : hasRestaurants ? (
              <>
                <div className="trip-detail__section-header">
                  <h2>Restaurant Recommendations</h2>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleGenerate('restaurants')}
                  >
                    🔄 Search Again
                  </Button>
                </div>
                <div className="trip-detail__card-grid">
                  {trip.restaurants.map((restaurant, i) => (
                    <RestaurantCard key={i} restaurant={restaurant} index={i} />
                  ))}
                </div>
              </>
            ) : (
              <>
                {genError.restaurants && (
                  <p className="trip-detail__gen-error">{genError.restaurants}</p>
                )}
                <EmptyState
                  emoji="🍽️"
                  title="No restaurant picks yet"
                  message="Discover amazing local restaurants and eateries with AI-powered recommendations!"
                  action={
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => handleGenerate('restaurants')}
                    >
                      Find Restaurants 🔍
                    </Button>
                  }
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TripDetail
