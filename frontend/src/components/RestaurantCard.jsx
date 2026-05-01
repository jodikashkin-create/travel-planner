import './RestaurantCard.css'

function RestaurantCard({ restaurant, index = 0 }) {
  const cuisine = restaurant.cuisine || restaurant.type || ''
  const rating = restaurant.rating || ''
  const priceLevel = restaurant.price_level || restaurant.priceLevel || ''
  const location = restaurant.location || restaurant.area || restaurant.neighborhood || ''

  return (
    <div className="restaurant-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="restaurant-card__icon-area">
        <span className="restaurant-card__icon">🍽️</span>
      </div>
      <div className="restaurant-card__content">
        <h4 className="restaurant-card__name">{restaurant.name}</h4>
        {cuisine && (
          <p className="restaurant-card__cuisine">
            <span>🍳</span> {cuisine}
          </p>
        )}
        {location && (
          <p className="restaurant-card__location">
            <span>📍</span> {location}
          </p>
        )}
        {restaurant.description && (
          <p className="restaurant-card__description">{restaurant.description}</p>
        )}
        <div className="restaurant-card__meta">
          {rating && (
            <span className="restaurant-card__rating">
              ⭐ {rating}
            </span>
          )}
          {priceLevel && (
            <span className="restaurant-card__price">
              {priceLevel}
            </span>
          )}
          {restaurant.meal && (
            <span className="restaurant-card__meal">{restaurant.meal}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RestaurantCard
