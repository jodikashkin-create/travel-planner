import './HotelCard.css'

function HotelCard({ hotel, index = 0 }) {
  const priceLevel = hotel.price_level || hotel.priceLevel || ''
  const rating = hotel.rating || ''
  const location = hotel.location || hotel.area || hotel.neighborhood || ''

  return (
    <div className="hotel-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="hotel-card__icon-area">
        <span className="hotel-card__icon">🏨</span>
      </div>
      <div className="hotel-card__content">
        <h4 className="hotel-card__name">{hotel.name}</h4>
        {location && (
          <p className="hotel-card__location">
            <span>📍</span> {location}
          </p>
        )}
        {hotel.description && (
          <p className="hotel-card__description">{hotel.description}</p>
        )}
        <div className="hotel-card__meta">
          {rating && (
            <span className="hotel-card__rating">
              ⭐ {rating}
            </span>
          )}
          {priceLevel && (
            <span className="hotel-card__price">
              {priceLevel}
            </span>
          )}
          {hotel.type && (
            <span className="hotel-card__type">{hotel.type}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default HotelCard
