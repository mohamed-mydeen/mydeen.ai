/**
 * AuthContext.jsx
 * Custom auth context using our own FastAPI backend + Google OAuth.
 * No Supabase dependency.
 *
 * Auth flow:
 *  Google → redirect to /auth/google → backend handles OAuth → callback → token in URL
 *  Email  → POST /login or POST /register → token in response body
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_BASE, apiFetch } from "../lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "auth_token";
const USER_KEY  = "auth_user";

// ── Helpers ─────────────────────────────────────────────────────────────

function loadStored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function persist(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// ── Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const stored = loadStored();
  const [token,     setToken]     = useState(stored.token);
  const [user,      setUser]      = useState(stored.user);
  const [isLoading, setIsLoading] = useState(!!stored.token); // verify on mount if token exists

  /* ── On mount: verify existing token with backend ── */
  useEffect(() => {
    if (!stored.token) {
      setIsLoading(false);
      return;
    }
    apiFetch("/auth/me")
      .then((me) => {
        setUser(me);
        persist(stored.token, me);
      })
      .catch(() => {
        // Token invalid/expired — clear it
        persist(null, null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Google OAuth ── */
  function signInWithGoogle() {
    // Redirect browser to backend; backend handles the entire OAuth dance
    window.location.href = `${API_BASE}/auth/google`;
  }

  /* ── Handle the /auth/callback redirect after Google OAuth ── */
  const handleOAuthCallback = useCallback((searchParams) => {
    const t       = searchParams.get("token");
    const name    = searchParams.get("name")    || "";
    const email   = searchParams.get("email")   || "";
    const picture = searchParams.get("picture") || "";

    if (!t) return false;

    const me = { name, email, picture };
    persist(t, me);
    setToken(t);
    setUser(me);
    return true;
  }, []);

  /* ── Email / Password sign-in ── */
  async function signInWithEmail(email, password) {
    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persist(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  /* ── Email / Password sign-up ── */
  async function signUpWithEmail(email, password) {
    const data = await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persist(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  /* ── Logout ── */
  function logout() {
    persist(null, null);
    setToken(null);
    setUser(null);
  }

  /* ── Get current JWT (for API calls that need it inline) ── */
  function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  const value = {
    token,
    user,
    isLoading,
    isAuthenticated: !!token,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    handleOAuthCallback,
    logout,
    getAccessToken,
    // Legacy alias so existing code using session.access_token still works
    session: token ? { access_token: token } : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
