import { useState, useEffect, useRef } from "react";


import { useAuth } from "../context/AuthContext";

function MydeenLogo() {
  return (
    <svg fill="none" height="40" viewBox="0 0 100 100" width="40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad-auth" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b"></stop>
          <stop offset="30%" stopColor="#ef4444"></stop>
          <stop offset="70%" stopColor="#4f46e5"></stop>
          <stop offset="100%" stopColor="#3b82f6"></stop>
        </linearGradient>
      </defs>
      <path d="M50 40L60 50L50 60L40 50Z" fill="url(#logo-grad-auth)" opacity="0.8"></path>
      <path d="M50 15C52 25 58 32 68 34C58 36 52 43 50 53C48 43 42 36 32 34C42 32 48 25 50 15Z" fill="none" stroke="url(#logo-grad-auth)" strokeWidth="2"></path>
      <path d="M75 25C70 32 68 42 75 50C68 58 70 68 75 75C68 70 58 68 50 75C42 68 32 70 25 75C30 68 32 58 25 50C32 42 30 32 25 25C30 32 40 34 50 25C60 34 70 32 75 25Z" fill="none" stroke="url(#logo-grad-auth)" strokeWidth="2"></path>
      <circle cx="50" cy="50" fill="none" opacity="0.6" r="30" stroke="url(#logo-grad-auth)" strokeWidth="1.5"></circle>
      <circle cx="50" cy="50" fill="none" opacity="0.3" r="40" stroke="url(#logo-grad-auth)" strokeWidth="1"></circle>
    </svg>
  );
}

/* ─── Multi-step Auth Form ────────────────────────────────────── */
function AuthPanel({ onLogin }) {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail 
  } = useAuth();

  const [mode,          setMode]          = useState("login");   // "login" | "signup"
  const [step,          setStep]          = useState("email");   // "email" | "password"
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [confirm,       setConfirm]       = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [showConf,      setShowConf]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState("");

  const emailRef = useRef(null);
  const passRef  = useRef(null);

  const isSignup = mode === "signup";

  /* Auto-focus active input */
  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    else                  passRef.current?.focus();
  }, [step, mode]);

  /* Reset on mode change */
  const switchMode = (m) => {
    setMode(m);
    setStep("email");
    setEmail("");
    setPassword("");
    setConfirm("");
    setError("");
  };

  /* ── Google OAuth ── */
  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  /* Email Flow Step 1: email → next */
  const handleEmailNext = (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) return setError("Please enter your email.");
    if (!trimmed.includes("@")) return setError("Please enter a valid email address.");
    setStep("password");
  };

  /* Email Flow Step 2: submit credentials via Supabase ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) return setError("Please enter your password.");
    if (isSignup) {
      if (password.length < 6)  return setError("Password must be at least 6 characters.");
      if (password !== confirm)  return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signUpWithEmail(email.trim(), password);
        setError("Check your email for a confirmation link!");
        setLoading(false);
      } else {
        await signInWithEmail(email.trim(), password);
        onLogin();
      }
    } catch (err) {
      setError(err.message || (isSignup ? "Sign up failed." : "Login failed."));
      setLoading(false);
    }
  };

  const anyLoading = loading || googleLoading;

  return (
    <div className="auth-panel">
      {/* ── Logo & Brand ── */}
      <div className="auth-panel__brand auth-icon--enter">
        <div className="auth-panel__logo">
          <MydeenLogo />
        </div>
        <span className="auth-panel__brand-name">Mydeen AI</span>
      </div>

      {/* ── Heading ── */}
      <div className="auth-panel__heading">
        <h1 className="auth-panel__title auth-title--enter">
          {step === "email"
            ? (isSignup ? "Create your account" : "Welcome back")
            : (isSignup ? "Set your password" : "Enter your password")}
        </h1>
        <p className="auth-panel__subtitle auth-subtitle--enter">
          {step === "email"
            ? (isSignup ? "Join thousands of students using Mydeen AI" : "Sign in to continue to Mydeen AI")
            : `Signing in as ${email}`}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="auth-tabs" role="tablist">
        <button
          role="tab" type="button"
          aria-selected={mode === "login"}
          className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
          onClick={() => switchMode("login")}
          disabled={anyLoading}
        >Sign In</button>
        <button
          role="tab" type="button"
          aria-selected={mode === "signup"}
          className={`auth-tab ${mode === "signup" ? "auth-tab--active" : ""}`}
          onClick={() => switchMode("signup")}
          disabled={anyLoading}
        >Sign Up</button>
      </div>

      {/* ── Step 1: Email ── */}
      {step === "email" && (
        <form className="auth-form" onSubmit={handleEmailNext} noValidate key={`${mode}-email-step`}>
          <div className="auth-field-group" style={{ "--field-i": 0 }}>
            <label htmlFor="auth-email" className="auth-label">Email Address</label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon">mail</span>
              <input
                ref={emailRef}
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={anyLoading}
              />
            </div>
          </div>

          {error && (
            <p className="auth-error" role="alert" key="email-error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={!email.trim() || anyLoading}
            style={{ "--field-i": 1 }}
          >
            Continue
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <div className="auth-divider"><span>or continue with</span></div>

          <div className="auth-social-row auth-social-row--center">
            {/* ── Google OAuth Button ── */}
            <button
              type="button"
              className="auth-social-btn auth-social-btn--full"
              onClick={handleGoogleSignIn}
              disabled={anyLoading}
              id="google-signin-btn"
            >
              {googleLoading ? (
                <span className="material-symbols-outlined auth-spin" style={{ fontSize: 18 }}>
                  progress_activity
                </span>
              ) : (
                <svg viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Password ── */}
      {step === "password" && (
        <form className="auth-form" onSubmit={handleSubmit} noValidate key={`${mode}-pass-step`}>
          <div className="auth-field-group" style={{ "--field-i": 0 }}>
            <label htmlFor="auth-password" className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon">lock</span>
              <input
                ref={passRef}
                id="auth-password"
                type={showPass ? "text" : "password"}
                className="auth-input"
                placeholder={isSignup ? "Create a strong password" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                disabled={anyLoading}
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                <span className="material-symbols-outlined">
                  {showPass ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="auth-field-group" style={{ "--field-i": 1 }}>
              <label htmlFor="auth-confirm" className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <span className="material-symbols-outlined auth-input-icon">lock_reset</span>
                <input
                  id="auth-confirm"
                  type={showConf ? "text" : "password"}
                  className="auth-input"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={anyLoading}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowConf(v => !v)}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined">
                    {showConf ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {!isSignup && (
            <div className="auth-forgot" style={{ "--field-i": 1 }}>
              <button type="button" className="auth-forgot-link">Forgot password?</button>
            </div>
          )}

          {error && (
            <p className="auth-error" role="alert" key="pass-error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            className="auth-btn auth-btn--primary"
            disabled={anyLoading || !password}
            style={{ "--field-i": isSignup ? 2 : 2 }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined auth-spin">progress_activity</span>
                {isSignup ? "Creating account…" : "Signing in…"}
              </>
            ) : (
              <>{isSignup ? "Create Account" : "Sign In"}<span className="material-symbols-outlined">arrow_forward</span></>
            )}
          </button>

          <button
            type="button"
            className="auth-btn auth-btn--ghost"
            onClick={() => { setStep("email"); setError(""); setPassword(""); setConfirm(""); }}
            disabled={anyLoading}
            style={{ "--field-i": isSignup ? 3 : 3 }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>
        </form>
      )}

      {/* ── Footer ── */}
      <p className="auth-footer">
        {isSignup ? "Already have an account? " : "New to Mydeen AI? "}
        <button
          type="button"
          className="auth-footer-link"
          onClick={() => switchMode(isSignup ? "login" : "signup")}
          disabled={anyLoading}
        >
          {isSignup ? "Sign In" : "Create account"}
        </button>
      </p>
    </div>
  );
}

/* ─── Image Panel ─────────────────────────────────────────────── */
function HeroPanel() {
  return (
    <div className="auth-hero">
      <div className="auth-hero__overlay" />
      <img src="/india_hero.png" alt="Taj Mahal at golden hour" className="auth-hero__img" />
      <div className="auth-hero__content">
        <h2 className="auth-hero__headline">
          Empower your studies with <em>intelligent</em> AI assistance
        </h2>
        <p className="auth-hero__desc desktop-only">
          Mydeen AI helps students across India ace their exams with smart,
          concise, exam-ready explanations — available 24/7.
        </p>
      </div>
    </div>
  );
}

/* ─── Main Login Page ─────────────────────────────────────────── */
export default function LoginPage({ onLogin }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="auth-root">
      <HeroPanel />
      <AuthPanel onLogin={onLogin} />
    </div>
  );
}
