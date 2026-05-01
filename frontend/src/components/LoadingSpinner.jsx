import './LoadingSpinner.css'

function LoadingSpinner({ message = 'Loading...', size = 'medium' }) {
  return (
    <div className={`spinner spinner--${size}`}>
      <div className="spinner__emojis">
        <span className="spinner__emoji spinner__emoji--1">✈️</span>
        <span className="spinner__emoji spinner__emoji--2">🌍</span>
        <span className="spinner__emoji spinner__emoji--3">🏨</span>
        <span className="spinner__emoji spinner__emoji--4">🍽️</span>
      </div>
      <div className="spinner__ring"></div>
      <p className="spinner__message">{message}</p>
    </div>
  )
}

export default LoadingSpinner
