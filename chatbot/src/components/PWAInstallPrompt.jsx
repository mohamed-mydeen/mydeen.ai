import { useState, useEffect } from "react";

/**
 * PWAInstallPrompt
 * Shows a native-style install banner on Android (beforeinstallprompt)
 * and iOS-specific instructions for "Add to Home Screen".
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Already dismissed this session
    if (sessionStorage.getItem("pwa-prompt-dismissed")) return;

    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 45s
      const timer = setTimeout(() => setShow(true), 45000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome: listen for the browser event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 30s of usage
      const timer = setTimeout(() => setShow(true), 30000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShow(false);
    }
    dismiss();
  };

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  };

  if (!show || dismissed) return null;

  return (
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-label="Install Mydeen AI">
      <div className="pwa-install-sheet">
        {/* Drag handle */}
        <div className="pwa-install-handle" />

        <div className="pwa-install-content">
          {/* App icon + info */}
          <div className="pwa-install-app-row">
            <div className="pwa-install-app-icon">
              <svg fill="none" height="44" viewBox="0 0 100 100" width="44" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad-pwa" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b"></stop>
                    <stop offset="30%" stopColor="#ef4444"></stop>
                    <stop offset="70%" stopColor="#4f46e5"></stop>
                    <stop offset="100%" stopColor="#3b82f6"></stop>
                  </linearGradient>
                </defs>
                <path d="M50 40L60 50L50 60L40 50Z" fill="url(#logo-grad-pwa)" opacity="0.8"></path>
                <path d="M50 15C52 25 58 32 68 34C58 36 52 43 50 53C48 43 42 36 32 34C42 32 48 25 50 15Z" fill="none" stroke="url(#logo-grad-pwa)" strokeWidth="2"></path>
                <path d="M75 25C70 32 68 42 75 50C68 58 70 68 75 75C68 70 58 68 50 75C42 68 32 70 25 75C30 68 32 58 25 50C32 42 30 32 25 25C30 32 40 34 50 25C60 34 70 32 75 25Z" fill="none" stroke="url(#logo-grad-pwa)" strokeWidth="2"></path>
                <circle cx="50" cy="50" fill="none" opacity="0.6" r="30" stroke="url(#logo-grad-pwa)" strokeWidth="1.5"></circle>
                <circle cx="50" cy="50" fill="none" opacity="0.3" r="40" stroke="url(#logo-grad-pwa)" strokeWidth="1"></circle>
              </svg>
            </div>
            <div className="pwa-install-app-info">
              <p className="pwa-install-app-name">Mydeen AI</p>
              <p className="pwa-install-app-desc">Install for the best experience</p>
            </div>
          </div>

          {isIOS ? (
            /* iOS instructions */
            <div className="pwa-install-ios">
              <p className="pwa-install-ios-text">
                To install this app on your iPhone:
              </p>
              <ol className="pwa-install-ios-steps">
                <li>
                  <span className="material-symbols-outlined pwa-install-step-icon">ios_share</span>
                  Tap the <strong>Share</strong> button in Safari
                </li>
                <li>
                  <span className="material-symbols-outlined pwa-install-step-icon">add_box</span>
                  Tap <strong>"Add to Home Screen"</strong>
                </li>
                <li>
                  <span className="material-symbols-outlined pwa-install-step-icon">check_circle</span>
                  Tap <strong>"Add"</strong> to confirm
                </li>
              </ol>
            </div>
          ) : (
            /* Android / Chrome CTA */
            <p className="pwa-install-tagline">
              Get instant access, offline support &amp; a faster experience — just like a native app.
            </p>
          )}

          <div className="pwa-install-actions">
            {!isIOS && (
              <button
                id="pwa-install-btn"
                className="pwa-install-btn-primary"
                onClick={handleInstall}
              >
                <span className="material-symbols-outlined">download</span>
                Install App
              </button>
            )}
            <button
              id="pwa-dismiss-btn"
              className="pwa-install-btn-secondary"
              onClick={dismiss}
            >
              {isIOS ? "Got it" : "Not now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
