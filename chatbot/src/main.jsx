import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

// ── Register Vite-PWA Service Worker ─────────────────────────────────────
import { registerSW } from "virtual:pwa-register";

registerSW({
  // Auto-update: silently update the SW in background
  onRegisteredSW(swUrl, registration) {
    // Check for SW updates every hour
    if (registration) {
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    }
  },
  onOfflineReady() {
    console.log("[PWA] App ready for offline use");
  },
  onNeedRefresh() {
    // New content available — auto-reload (silent update)
    // You can replace this with a toast notification if desired
    console.log("[PWA] New content available, updating…");
  },
  onRegisterError(error) {
    console.warn("[PWA] SW registration failed:", error);
  },
});

// ── Prevent pull-to-refresh & navigation gestures ────────────────────────
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) e.preventDefault(); // block pinch zoom
}, { passive: false });

// Prevent contextmenu on long press (native app feel)
document.addEventListener("contextmenu", (e) => {
  if (!e.target.closest("input, textarea, a")) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
);
