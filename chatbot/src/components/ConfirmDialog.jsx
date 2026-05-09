export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-dialog">
        <h3 id="confirm-title" className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__msg">{message}</p>
        <div className="confirm-dialog__actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel}>Cancel</button>
          <button
            className={`confirm-btn ${danger ? "confirm-btn--danger" : "confirm-btn--primary"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
