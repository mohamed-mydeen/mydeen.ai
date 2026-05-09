export default function TopBar({ onLogoClick, onMenuClick, onProfileClick, onBack, showBack, showMenu }) {
  return (
    <header className="new-top-bar">
      <div className="new-top-bar__left">
        {showMenu && (
          <button type="button" className="new-top-bar__btn" onClick={onMenuClick} aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        
        {showBack && (
          <button type="button" className="new-top-bar__btn" onClick={onBack} aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}

        <div className="new-top-bar__logo" onClick={onLogoClick} role="button" tabIndex="0" style={{ cursor: 'pointer' }}>
          <span>mydeen.ai</span>
        </div>
      </div>

      <button type="button" className="new-top-bar__btn" aria-label="Account" onClick={onProfileClick}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          account_circle
        </span>
      </button>
    </header>
  );
}
