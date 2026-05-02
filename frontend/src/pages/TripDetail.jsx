import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip, deleteTrip, generateItinerary, searchHotels, searchRestaurants, getGenerationStatus } from '../api'
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

const DAY_COLORS = [
  'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
  'linear-gradient(135deg, #4ECDC4, #6FE0D8)',
  'linear-gradient(135deg, #A855F7, #C084FC)',
  'linear-gradient(135deg, #FF9F43, #FFD93D)',
  'linear-gradient(135deg, #74B9FF, #A0D2FF)',
  'linear-gradient(135deg, #FF6EB4, #FF9ED2)',
  'linear-gradient(135deg, #00B894, #55EFC4)',
  'linear-gradient(135deg, #E17055, #FAB1A0)',
]

function StructuredItineraryView({ data }) {
  return (
    <div className="itinerary-structured">
      {/* Trip Summary */}
      {data.summary && (
        <div className="itinerary-summary">
          <p>{data.summary}</p>
        </div>
      )}

      {/* Day-by-day cards */}
      {data.days && data.days.map((day, i) => (
        <div key={i} className="itinerary-block" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="itinerary-block__header" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }}>
            <span className="itinerary-block__day-icon">📍</span>
            <h3>Day {day.day}{day.title ? ` — ${day.title}` : ''}</h3>
            {day.date && <span className="itinerary-block__date">{formatDate(day.date)}</span>}
          </div>
          <div className="itinerary-block__body">
            {/* Activities */}
            {day.activities && day.activities.map((act, j) => (
              <div key={j} className="itinerary-activity">
                <div className="itinerary-activity__time">{act.time || ''}</div>
                <div className="itinerary-activity__content">
                  <strong>{act.activity}</strong>
                  {act.description && <p className="itinerary-activity__desc">{act.description}</p>}
                  <div className="itinerary-activity__meta">
                    {act.location && <span className="itinerary-activity__location">📍 {act.location}</span>}
                    {act.estimated_cost && <span className="itinerary-activity__cost">💰 {act.estimated_cost}</span>}
                  </div>
                </div>
              </div>
            ))}

            {/* Meals */}
            {day.meals && (
              <div className="itinerary-meals">
                <h4>🍽️ Meals</h4>
                <div className="itinerary-meals__grid">
                  {day.meals.breakfast && (
                    <div className="itinerary-meal">
                      <span className="itinerary-meal__label">🌅 Breakfast</span>
                      <span>{day.meals.breakfast}</span>
                    </div>
                  )}
                  {day.meals.lunch && (
                    <div className="itinerary-meal">
                      <span className="itinerary-meal__label">☀️ Lunch</span>
                      <span>{day.meals.lunch}</span>
                    </div>
                  )}
                  {day.meals.dinner && (
                    <div className="itinerary-meal">
                      <span className="itinerary-meal__label">🌙 Dinner</span>
                      <span>{day.meals.dinner}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily tips */}
            {day.tips && (
              <div className="itinerary-day-tip">
                <span>💡</span> <span>{day.tips}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Budget estimate */}
      {data.budget_estimate && (
        <div className="itinerary-budget">
          <h3>💰 Budget Estimate</h3>
          <div className="itinerary-budget__grid">
            {data.budget_estimate.accommodation_per_night && (
              <div className="itinerary-budget__item">
                <span className="itinerary-budget__label">🏨 Accommodation/night</span>
                <span className="itinerary-budget__value">{data.budget_estimate.accommodation_per_night}</span>
              </div>
            )}
            {data.budget_estimate.food_per_day && (
              <div className="itinerary-budget__item">
                <span className="itinerary-budget__label">🍽️ Food/day</span>
                <span className="itinerary-budget__value">{data.budget_estimate.food_per_day}</span>
              </div>
            )}
            {data.budget_estimate.activities_total && (
              <div className="itinerary-budget__item">
                <span className="itinerary-budget__label">🎯 Activities total</span>
                <span className="itinerary-budget__value">{data.budget_estimate.activities_total}</span>
              </div>
            )}
            {data.budget_estimate.estimated_total && (
              <div className="itinerary-budget__item itinerary-budget__item--total">
                <span className="itinerary-budget__label">📊 Estimated Total</span>
                <span className="itinerary-budget__value">{data.budget_estimate.estimated_total}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Packing tips */}
      {data.packing_tips && data.packing_tips.length > 0 && (
        <div className="itinerary-packing">
          <h3>🧳 Packing Tips</h3>
          <div className="itinerary-packing__list">
            {data.packing_tips.map((tip, i) => (
              <span key={i} className="itinerary-packing__tag">{tip}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FallbackItineraryView({ content }) {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  return (
    <div className="itinerary-raw">
      <pre>{text}</pre>
    </div>
  )
}

function ItineraryView({ itinerary }) {
  if (!itinerary) return null

  // If the itinerary is a structured object with days array, use the structured view
  if (typeof itinerary === 'object' && itinerary !== null) {
    // Check if it has content field (from old DB format)
    const data = itinerary.content || itinerary
    if (typeof data === 'object' && data.days && Array.isArray(data.days)) {
      return <StructuredItineraryView data={data} />
    }
    // If it has a raw field, show the raw text
    if (data.raw) {
      return <FallbackItineraryView content={data.raw} />
    }
  }

  // Fallback for string or unrecognized format
  return <FallbackItineraryView content={itinerary} />
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

  const pollRef = useRef({})

  const handleGenerate = async (type) => {
    setGenerating((prev) => ({ ...prev, [type]: true }))
    setGenError((prev) => ({ ...prev, [type]: '' }))

    try {
      const generators = {
        itinerary: generateItinerary,
        hotels: searchHotels,
        restaurants: searchRestaurants,
      }

      // Start the background generation (returns immediately)
      await generators[type](id)

      // Poll for completion every 3 seconds
      if (pollRef.current[type]) clearInterval(pollRef.current[type])

      pollRef.current[type] = setInterval(async () => {
        try {
          const status = await getGenerationStatus(id)
          const taskStatus = status[type]

          if (taskStatus === 'done') {
            clearInterval(pollRef.current[type])
            pollRef.current[type] = null
            await loadTrip()
            setGenerating((prev) => ({ ...prev, [type]: false }))
          } else if (taskStatus && taskStatus.startsWith('error:')) {
            clearInterval(pollRef.current[type])
            pollRef.current[type] = null
            setGenError((prev) => ({
              ...prev,
              [type]: `Failed to generate ${type}. Please try again.`,
            }))
            setGenerating((prev) => ({ ...prev, [type]: false }))
          }
          // If still "generating", keep polling
        } catch (pollErr) {
          console.error('Poll error:', pollErr)
        }
      }, 3000)
    } catch (err) {
      setGenError((prev) => ({
        ...prev,
        [type]: `Failed to start ${type} generation. Please try again.`,
      }))
      setGenerating((prev) => ({ ...prev, [type]: false }))
      console.error(err)
    }
  }

  // Clean up polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollRef.current).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [])

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
