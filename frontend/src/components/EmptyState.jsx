import './EmptyState.css'

function EmptyState({ emoji = '🌎', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__emoji">{emoji}</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__message">{message}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

export default EmptyState
