import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTrip } from '../api'
import Button from '../components/Button'
import './NewTrip.css'

const POPULAR_DESTINATIONS = [
  '🇫🇷 Paris', '🇯🇵 Tokyo', '🇮🇩 Bali', '🇺🇸 New York',
  '🇮🇹 Rome', '🇪🇸 Barcelona', '🇹🇭 Thailand', '🇮🇸 Iceland',
  '🇲🇦 Morocco', '🇵🇪 Peru'
]

const ACCOMMODATION_OPTIONS = [
  { id: 'coastal', emoji: '🏖️', label: 'Coastal / Beachfront' },
  { id: 'city_center', emoji: '🏙️', label: 'City Center' },
  { id: 'pool_resort', emoji: '🏊', label: 'Pool & Resort' },
  { id: 'mountain', emoji: '🏔️', label: 'Mountain / Nature' },
  { id: 'boutique', emoji: '🏡', label: 'Boutique / Charming' },
  { id: 'luxury', emoji: '💎', label: 'Luxury' },
  { id: 'budget', emoji: '💰', label: 'Budget-Friendly' },
  { id: 'unique', emoji: '🏕️', label: 'Unique / Adventure' },
]

const EXPERIENCE_OPTIONS = [
  { id: 'active', emoji: '🏃', label: 'Active & Adventure' },
  { id: 'cultural', emoji: '🎨', label: 'Cultural & Historical' },
  { id: 'food_wine', emoji: '🍷', label: 'Food & Wine' },
  { id: 'relaxation', emoji: '🧘', label: 'Relaxation & Wellness' },
  { id: 'nightlife', emoji: '🌙', label: 'Nightlife & Social' },
  { id: 'photography', emoji: '📸', label: 'Photography & Scenic' },
  { id: 'shopping', emoji: '🛍️', label: 'Shopping' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Family-Friendly' },
]

const RESTAURANT_OPTIONS = [
  { id: 'social_media', emoji: '📱', label: 'Social Media Hype', desc: 'Trending, Instagram-famous spots' },
  { id: 'local_gems', emoji: '💎', label: 'Local Gems', desc: 'Hidden spots the locals love' },
  { id: 'mix', emoji: '🔀', label: 'Mix of Both', desc: 'Best of both worlds' },
]

const DOWNTIME_OPTIONS = [
  { id: '0', emoji: '😤', label: 'None — pack it all in!', hours: '0' },
  { id: '1', emoji: '😌', label: 'A little breather', hours: '1' },
  { id: '2', emoji: '😎', label: 'Balanced', hours: '2' },
  { id: '3', emoji: '🧘', label: 'Plenty of chill time', hours: '3' },
  { id: '4', emoji: '🏖️', label: 'Maximum relaxation', hours: '4+' },
]

const STEP_META = [
  { emoji: '📍', title: 'Where are you dreaming of going?', subtitle: 'Pick a destination or type your own' },
  { emoji: '📅', title: 'When are you traveling?', subtitle: 'Select your travel dates for seasonal tips' },
  { emoji: '🏨', title: 'What kind of stay are you looking for?', subtitle: 'Select all that appeal to you' },
  { emoji: '🎯', title: 'What kind of experiences excite you?', subtitle: 'Select all that sound fun' },
  { emoji: '🍽️', title: "What's your dining style?", subtitle: 'This helps us find the right restaurants' },
  { emoji: '🌟', title: 'Anything specific you want to explore?', subtitle: 'Neighborhoods, attractions, must-sees — totally optional' },
  { emoji: '⏰', title: 'How much free time do you want each day?', subtitle: 'We\'ll build downtime into your itinerary' },
  { emoji: '✨', title: 'Here\'s your trip at a glance', subtitle: 'Review everything before we build your itinerary' },
]

const TOTAL_STEPS = 8

function NewTrip({ user }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState('forward')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const destinationRef = useRef(null)
  const stepContainerRef = useRef(null)

  const [form, setForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    accommodation_type: [],
    experience_type: [],
    restaurant_pref: '',
    hotspots: '',
    downtime_hours: '',
  })

  useEffect(() => {
    if (step === 0 && destinationRef.current) {
      destinationRef.current.focus()
    }
  }, [step])

  // Scroll the step container into view on step change
  useEffect(() => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [step])

  const today = new Date().toISOString().split('T')[0]

  const tripDays = () => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date)
      const end = new Date(form.end_date)
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      if (diff > 0) return diff
    }
    return 0
  }

  const canProceed = () => {
    switch (step) {
      case 0: return form.destination.trim().length > 0
      case 1: return form.start_date && form.end_date && form.end_date >= form.start_date
      case 2: return form.accommodation_type.length > 0
      case 3: return form.experience_type.length > 0
      case 4: return form.restaurant_pref !== ''
      case 5: return true // optional
      case 6: return form.downtime_hours !== ''
      case 7: return true // review
      default: return false
    }
  }

  const goNext = () => {
    if (!canProceed()) return
    setDirection('forward')
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    setError('')
  }

  const goBack = () => {
    setDirection('backward')
    setStep((s) => Math.max(s - 1, 0))
    setError('')
  }

  const goToStep = (target) => {
    setDirection(target > step ? 'forward' : 'backward')
    setStep(target)
    setError('')
  }

  const toggleMultiSelect = (field, id) => {
    setForm((prev) => {
      const current = prev[field]
      if (current.includes(id)) {
        return { ...prev, [field]: current.filter((x) => x !== id) }
      }
      return { ...prev, [field]: [...current, id] }
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    // Build preferences string from all selections for backward compatibility
    const prefParts = []
    if (form.accommodation_type.length > 0) {
      const accLabels = form.accommodation_type.map((id) => {
        const opt = ACCOMMODATION_OPTIONS.find((o) => o.id === id)
        return opt ? opt.label : id
      })
      prefParts.push('Accommodation: ' + accLabels.join(', '))
    }
    if (form.experience_type.length > 0) {
      const expLabels = form.experience_type.map((id) => {
        const opt = EXPERIENCE_OPTIONS.find((o) => o.id === id)
        return opt ? opt.label : id
      })
      prefParts.push('Experiences: ' + expLabels.join(', '))
    }
    if (form.restaurant_pref) {
      const restOpt = RESTAURANT_OPTIONS.find((o) => o.id === form.restaurant_pref)
      prefParts.push('Restaurants: ' + (restOpt ? restOpt.label : form.restaurant_pref))
    }
    if (form.downtime_hours) {
      const dtOpt = DOWNTIME_OPTIONS.find((o) => o.id === form.downtime_hours)
      prefParts.push('Downtime: ' + (dtOpt ? dtOpt.label : form.downtime_hours + ' hours'))
    }
    if (form.hotspots.trim()) {
      prefParts.push('Special interests: ' + form.hotspots.trim())
    }

    try {
      const trip = await createTrip({
        user_id: user.id,
        destination: form.destination.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        preferences: prefParts.join('. '),
        accommodation_type: form.accommodation_type,
        experience_type: form.experience_type,
        restaurant_pref: form.restaurant_pref,
        hotspots: form.hotspots.trim(),
        downtime_hours: form.downtime_hours,
      })
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError('Failed to create trip. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent= () => {
    const animClass = direction === 'forward' ? 'wizard-step--enter-forward' : 'wizard-step--enter-backward'

    switch (step) {
      case 0:
        return (
          <div className={`wizard-step ${animClass}`} key="step-0">
            <input
              ref={destinationRef}
              type="text"
              className="wizard-input wizard-input--large"
              placeholder="e.g., Tokyo, Japan"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && canProceed() && goNext()}
            />
            <div className="wizard-chips-label">Or pick a popular destination:</div>
            <div className="wizard-chips">
              {POPULAR_DESTINATIONS.map((dest) => {
                const name = dest.replace(/^[^\s]+\s/, '')
                const isSelected = form.destination === name
                return (
                  <button
                    key={dest}
                    type="button"
                    className={`wizard-chip ${isSelected ? 'wizard-chip--selected' : ''}`}
                    onClick={() => setForm({ ...form, destination: name })}
                  >
                    {dest}
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 1:
        return (
          <div className={`wizard-step ${animClass}`} key="step-1">
            <div className="wizard-dates-row">
              <div className="wizard-date-field">
                <label className="wizard-field-label">Start Date</label>
                <input
                  type="date"
                  className="wizard-input"
                  min={today}
                  value={form.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      start_date: newStart,
                      end_date: prev.end_date && prev.end_date < newStart ? '' : prev.end_date,
                    }))
                  }}
                />
              </div>
              <div className="wizard-date-field">
                <label className="wizard-field-label">End Date</label>
                <input
                  type="date"
                  className="wizard-input"
                  min={form.start_date || today}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            {tripDays() > 0 && (
              <div className="wizard-duration-badge">
                <span className="wizard-duration-emoji">🎉</span>
                That's <strong>{tripDays()} {tripDays() === 1 ? 'day' : 'days'}</strong> of adventure!
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className={`wizard-step ${animClass}`} key="step-2">
            <div className="wizard-chips wizard-chips--grid">
              {ACCOMMODATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wizard-chip wizard-chip--card ${form.accommodation_type.includes(opt.id) ? 'wizard-chip--selected' : ''}`}
                  onClick={() => toggleMultiSelect('accommodation_type', opt.id)}
                >
                  <span className="wizard-chip-emoji">{opt.emoji}</span>
                  <span className="wizard-chip-text">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className={`wizard-step ${animClass}`} key="step-3">
            <div className="wizard-chips wizard-chips--grid">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wizard-chip wizard-chip--card ${form.experience_type.includes(opt.id) ? 'wizard-chip--selected' : ''}`}
                  onClick={() => toggleMultiSelect('experience_type', opt.id)}
                >
                  <span className="wizard-chip-emoji">{opt.emoji}</span>
                  <span className="wizard-chip-text">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className={`wizard-step ${animClass}`} key="step-4">
            <div className="wizard-chips wizard-chips--stacked">
              {RESTAURANT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wizard-chip wizard-chip--radio ${form.restaurant_pref === opt.id ? 'wizard-chip--selected' : ''}`}
                  onClick={() => setForm({ ...form, restaurant_pref: opt.id })}
                >
                  <span className="wizard-chip-emoji">{opt.emoji}</span>
                  <div className="wizard-chip-info">
                    <span className="wizard-chip-text">{opt.label}</span>
                    <span className="wizard-chip-desc">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className={`wizard-step ${animClass}`} key="step-5">
            <textarea
              className="wizard-textarea"
              placeholder="Tell us about specific places, neighborhoods, activities, or anything you've heard about that you want to check out..."
              value={form.hotspots}
              onChange={(e) => setForm({ ...form, hotspots: e.target.value })}
              rows={5}
            />
          </div>
        )

      case 6:
        return (
          <div className={`wizard-step ${animClass}`} key="step-6">
            <div className="wizard-chips wizard-chips--stacked">
              {DOWNTIME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wizard-chip wizard-chip--radio ${form.downtime_hours === opt.id ? 'wizard-chip--selected' : ''}`}
                  onClick={() => setForm({ ...form, downtime_hours: opt.id })}
                >
                  <span className="wizard-chip-emoji wizard-chip-emoji--lg">{opt.emoji}</span>
                  <div className="wizard-chip-info">
                    <span className="wizard-chip-text">{opt.label}</span>
                    <span className="wizard-chip-desc">{opt.hours} {opt.hours === '1' ? 'hour' : 'hours'} of downtime</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 7:
        return (
          <div className={`wizard-step ${animClass}`} key="step-7">
            <div className="wizard-review">
              <ReviewSection
                label="Destination"
                emoji="📍"
                value={form.destination}
                onEdit={() => goToStep(0)}
              />
              <ReviewSection
                label="Dates"
                emoji="📅"
                value={form.start_date && form.end_date
                  ? `${formatDate(form.start_date)} - ${formatDate(form.end_date)} (${tripDays()} days)`
                  : ''}
                onEdit={() => goToStep(1)}
              />
              <ReviewSection
                label="Accommodation"
                emoji="🏨"
                value={form.accommodation_type.map((id) => {
                  const opt = ACCOMMODATION_OPTIONS.find((o) => o.id === id)
                  return opt ? `${opt.emoji} ${opt.label}` : id
}).join(', ')}
onEdit={() => goToStep(2)}
              />
              <ReviewSection
                label="Experiences"
                emoji="🎯"
                value={form.experience_type.map((id) => {
                  const opt = EXPERIENCE_OPTIONS.find((o) => o.id === id)
                  return opt ? `${opt.emoji} ${opt.label}` : id
                }).join(', ')}
                onEdit={() => goToStep(3)}
              />
              <ReviewSection
                label="Dining Style"
                emoji="🍽️"
                value={(() => {
                  const opt = RESTAURANT_OPTIONS.find((o) => o.id === form.restaurant_pref)
                  return opt ? `${opt.emoji} ${opt.label}` : ''
                })()}
                onEdit={() => goToStep(4)}
              />
              {form.hotspots.trim() && (
                <ReviewSection
                  label="Special Interests"
                  emoji="🌟"
                  value={form.hotspots}
                  onEdit={() => goToStep(5)}
                />
              )}
              <ReviewSection
                label="Daily Downtime"
                emoji="⏰"
                value={(() => {
                  const opt = DOWNTIME_OPTIONS.find((o) => o.id === form.downtime_hours)
                  return opt ? `${opt.emoji} ${opt.label}` : ''
                })()}
                onEdit={() => goToStep(6)}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="new-trip page-container" ref={stepContainerRef}>
      <div className="wizard-wrapper">
        {/* Progress bar */}
        <div className="wizard-progress">
          <div
            className="wizard-progress__bar"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="wizard-dots">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`wizard-dot ${i === step ? 'wizard-dot--active' : ''} ${i < step ? 'wizard-dot--completed' : ''}`}
              onClick={() => i < step && goToStep(i)}
              disabled={i > step}
              aria-label={`Step ${i + 1}`}
            />
          ))}
          <span className="wizard-step-count">Step {step + 1} of {TOTAL_STEPS}</span>
        </div>

        {/* Step header */}
        <div className="wizard-header">
          <span className="wizard-header__emoji">{STEP_META[step].emoji}</span>
          <h1 className="wizard-header__title">{STEP_META[step].title}</h1>
          <p className="wizard-header__subtitle">{STEP_META[step].subtitle}</p>
        </div>

        {/* Step content */}
        <div className="wizard-content">
          {renderStepContent()}
        </div>

        {/* Error */}
        {error && <p className="wizard-error">{error}</p>}

        {/* Navigation */}
        <div className="wizard-nav">
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={loading}
            >
              Back
            </Button>
          )}
          {step === 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
          )}

          <div className="wizard-nav__spacer" />

          {step === 5 && !form.hotspots.trim() && (
            <Button
              type="button"
              variant="ghost"
              onClick={goNext}
              disabled={loading}
            >
              Skip
            </Button>
          )}

          {step < TOTAL_STEPS - 1 && (
            <Button
              type="button"
              variant="primary"
              onClick={goNext}
              disabled={!canProceed() || loading}
            >
              Next
            </Button>
          )}

          {step === TOTAL_STEPS - 1 && (
            <Button
              type="button"
              variant="primary"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create My Trip ✈️'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewSection({ label, emoji, value, onEdit }) {
  return (
    <div className="review-section">
      <div className="review-section__header">
        <span className="review-section__label">
          <span className="review-section__emoji">{emoji}</span>
          {label}
        </span>
        <button type="button" className="review-section__edit" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="review-section__value">{value}</div>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default NewTrip
