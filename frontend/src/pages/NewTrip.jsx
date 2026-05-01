import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTrip } from '../api'
import Button from '../components/Button'
import './NewTrip.css'

function NewTrip({ user }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    preferences: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.destination.trim()) {
      setError('Please enter a destination')
      return
    }
    if (!form.start_date) {
      setError('Please select a start date')
      return
    }
    if (!form.end_date) {
      setError('Please select an end date')
      return
    }
    if (form.end_date < form.start_date) {
      setError('End date must be after start date')
      return
    }

    setLoading(true)
    setError('')

    try {
      const trip = await createTrip({
        user_id: user.id,
        destination: form.destination.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        preferences: form.preferences.trim(),
      })
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError('Failed to create trip. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Default min date is today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="new-trip page-container">
      <div className="new-trip__wrapper">
        <div className="new-trip__header">
          <span className="new-trip__header-emoji">🌍</span>
          <h1 className="new-trip__title">Plan a New Trip</h1>
          <p className="new-trip__subtitle">
            Tell us where you want to go and we'll create the perfect plan!
          </p>
        </div>

        <form className="new-trip__form" onSubmit={handleSubmit}>
          <div className="new-trip__field">
            <label className="new-trip__label" htmlFor="destination">
              <span>📍</span> Where are you going?
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              className="new-trip__input"
              placeholder="e.g., Tokyo, Japan"
              value={form.destination}
              onChange={handleChange}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="new-trip__row">
            <div className="new-trip__field">
              <label className="new-trip__label" htmlFor="start_date">
                <span>📅</span> Start Date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="new-trip__input"
                min={today}
                value={form.start_date}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="new-trip__field">
              <label className="new-trip__label" htmlFor="end_date">
                <span>📅</span> End Date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className="new-trip__input"
                min={form.start_date || today}
                value={form.end_date}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="new-trip__field">
            <label className="new-trip__label" htmlFor="preferences">
              <span>💡</span> Trip Preferences (optional)
            </label>
            <textarea
              id="preferences"
              name="preferences"
              className="new-trip__textarea"
              placeholder="Tell us what you're into! E.g., budget-friendly, family with kids, foodie adventures, cultural experiences, nightlife, outdoor activities..."
              rows={4}
              value={form.preferences}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {error && <p className="new-trip__error">{error}</p>}

          <div className="new-trip__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Trip ✈️'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewTrip
