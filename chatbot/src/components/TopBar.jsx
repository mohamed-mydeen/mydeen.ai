export default function TopBar({ onLogoClick, onMenuClick, onProfileClick, onNewChatClick, onBack, showBack, showMenu }) {
  return (
    <header className="new-top-bar">
      <div className="top-bar-container">
        
        {/* LEFT CIRCLE */}
        <div className="top-bar-left">
          {(showMenu || showBack) && (
            <button 
              type="button" 
              className={`floating-nav-btn ${!showBack ? "nav-btn-hamburger" : ""}`} 
              onClick={showBack ? onBack : onMenuClick} 
              aria-label={showBack ? "Go back" : "Open menu"}
            >
              <span className="material-symbols-outlined">
                {showBack ? "arrow_back" : "menu"}
              </span>
            </button>
          )}
        </div>

        {/* CENTER TEXT */}
        <div className="top-bar-center" onClick={onLogoClick} role="button" tabIndex="0">
          <span className="top-bar-logo-text">Mydeen AI</span>
        </div>

        {/* RIGHT */}
        <div className="top-bar-right">
          <button type="button" className="floating-nav-btn" aria-label="Account/Profile" onClick={onProfileClick}>
            <span className="material-symbols-outlined">
              account_circle
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
