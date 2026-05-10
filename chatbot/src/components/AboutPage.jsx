import React from 'react';

function MydeenLogo({ size = 72 }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 100 100" width={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad-about" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b"></stop>
          <stop offset="30%" stopColor="#ef4444"></stop>
          <stop offset="70%" stopColor="#4f46e5"></stop>
          <stop offset="100%" stopColor="#3b82f6"></stop>
        </linearGradient>
      </defs>
      <path d="M50 40L60 50L50 60L40 50Z" fill="url(#logo-grad-about)" opacity="0.8"></path>
      <path d="M50 15C52 25 58 32 68 34C58 36 52 43 50 53C48 43 42 36 32 34C42 32 48 25 50 15Z" fill="none" stroke="url(#logo-grad-about)" strokeWidth="2"></path>
      <path d="M75 25C70 32 68 42 75 50C68 58 70 68 75 75C68 70 58 68 50 75C42 68 32 70 25 75C30 68 32 58 25 50C32 42 30 32 25 25C30 32 40 34 50 25C60 34 70 32 75 25Z" fill="none" stroke="url(#logo-grad-about)" strokeWidth="2"></path>
      <circle cx="50" cy="50" fill="none" opacity="0.6" r="30" stroke="url(#logo-grad-about)" strokeWidth="1.5"></circle>
      <circle cx="50" cy="50" fill="none" opacity="0.3" r="40" stroke="url(#logo-grad-about)" strokeWidth="1"></circle>
    </svg>
  );
}

export default function AboutPage() {
  return (
    <main className="main-canvas page-view" id="about-page" style={{ padding: '40px 20px', maxWidth: '640px', margin: '0 auto' }}>
      
      {/* Header section: sleek, text-driven */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <MydeenLogo size={42} />
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '500', color: 'var(--color-on-surface)', letterSpacing: '-0.02em', margin: 0 }}>Mydeen AI</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginTop: '4px', letterSpacing: '0.02em' }}>VERSION 1.1.0</p>
          </div>
        </div>
        <p style={{ fontSize: '15px', color: 'var(--color-on-surface)', lineHeight: '1.6', maxWidth: '540px', fontWeight: '400' }}>
          Engineered with precision to act as your ultimate personal study assistant. Built to help you learn faster, understand complex concepts deeply, and ace your exams with total confidence.
        </p>
      </div>

      {/* Capabilities: minimalist list, no boxy borders */}
      <div style={{ marginBottom: '48px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>Capabilities</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { icon: "auto_awesome",    text: "AI-powered explanations", desc: "State-of-the-art intelligent synthesis and generation." },
            { icon: "travel_explore",  text: "Live Web Search", desc: "Real-time data retrieval for up-to-the-minute accuracy." },
            { icon: "edit_note",       text: "Smart note generation", desc: "Instant lecture summarization and key takeaways." },
            { icon: "quiz",            text: "Exam-focused Q&A", desc: "Rigorous practice with dynamically generated test questions." },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '20px', marginTop: '2px' }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-on-surface)', marginBottom: '4px' }}>{f.text}</p>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', lineHeight: '1.5' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer info: clean, subtle card */}
      <div style={{ marginBottom: '48px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>Developer</h3>
        <div style={{ padding: '20px', background: 'var(--color-surface-container-low)', borderRadius: '12px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)', fontSize: '16px', fontWeight: '500', flexShrink: 0 }}>
            M
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--color-on-surface)', marginBottom: '2px' }}>Mohamed Mydeen S</p>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '12px' }}>Full Stack Developer & AI Enthusiast</p>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', lineHeight: '1.5', marginBottom: '16px' }}>
              Focused on crafting seamless, premium AI experiences. Mydeen AI leverages cutting-edge LLMs and real-time integrations to provide an unparalleled learning ecosystem.
            </p>
            <a href="https://mydeen.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-primary)', textDecoration: 'none' }}>
              View Portfolio <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_outward</span>
            </a>
          </div>
        </div>
      </div>

    </main>
  );
}
