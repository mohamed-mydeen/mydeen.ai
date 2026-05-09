import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = still loading
  const [user,    setUser]      = useState(null);

  useEffect(() => {
    /* ── 1. Load existing session from storage on mount ── */
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      setUser(session?.user ?? null);
    });

    /* ── 2. Listen for all future auth state changes ── */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session ?? null);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /* ── Google OAuth ── */
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin, // returns here after Google consent
      },
    });
    if (error) throw error;
  }

  /* ── Email/Password login (keeps backward-compat with backend JWT) ── */
  async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  /* ── Email/Password sign-up ── */
  async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  /* ── Phone Auth ── */
  async function signInWithPhone(phone) {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }

  async function verifyOTP(phone, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;
    return data;
  }

  /* ── Logout ── */
  async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem("auth_token"); // clear legacy token too
    setSession(null);
    setUser(null);
  }

  /* ── Get current JWT access token (for API calls) ── */
  async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? localStorage.getItem("auth_token");
  }

  const value = {
    session,
    user,
    isLoading:        session === undefined,   // true only during first load
    isAuthenticated:  !!session,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithPhone,
    verifyOTP,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
