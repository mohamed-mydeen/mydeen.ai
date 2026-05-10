import React, { useState, useEffect, useRef } from 'react';
import { VIEW } from '../constants';
import { useAuth } from '../context/AuthContext';

/* ─── Premium Settings Components ────────────────────────────────────── */

const SettingsGroup = ({ children }) => (
  <div className="claude-settings-group">
    {children}
  </div>
);

const SettingsRow = ({ icon, title, subtitle, onClick, rightElement, isDanger }) => (
  <div 
    className={`claude-settings-row ${isDanger ? 'claude-settings-row--danger' : ''} ${onClick ? 'claude-settings-row--clickable' : ''}`} 
    onClick={onClick}
  >
    <div className="claude-settings-row__left">
      <span className="material-symbols-outlined claude-row-icon">{icon}</span>
      <div className="claude-settings-row__text">
        <p className="claude-row-title">{title}</p>
        {subtitle && <p className="claude-row-subtitle">{subtitle}</p>}
      </div>
    </div>
    <div className="claude-settings-row__right">
      {rightElement}
      {onClick && !rightElement && (
        <span className="material-symbols-outlined claude-chevron">chevron_right</span>
      )}
    </div>
  </div>
);

const PremiumSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="claude-dropdown" ref={dropdownRef}>
      <div className="claude-dropdown__trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{value}</span>
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>
      {isOpen && (
        <div className="claude-dropdown__menu">
          {options.map((opt) => (
            <div
              key={opt}
              className={`claude-dropdown__option ${value === opt ? 'claude-dropdown__option--active' : ''}`}
              style={{ fontFamily: opt !== 'Default' ? opt : 'inherit' }}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main Settings Page ─────────────────────────────────────────────── */

export default function SettingsPage({ onNavigate, onLogout, onClearHistory, language, setLanguage }) {
  const { user: supaUser } = useAuth();
  
  // Customization States
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("accent_color") || "#3b82f6");
  const [fontFamily, setFontFamily]   = useState(() => localStorage.getItem("font_family") || "Inter");
  
  useEffect(() => {
    document.documentElement.style.setProperty('--color-brand-blue', accentColor);
    localStorage.setItem("accent_color", accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-main', `'${fontFamily}', sans-serif`);
    localStorage.setItem("font_family", fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem("user_language", language);
  }, [language]);

  const displayEmail = supaUser?.email || "User";

  const ACCENT_COLORS = [
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Purple', color: '#8b5cf6' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Teal', color: '#14b8a6' }
  ];

  const FONT_OPTIONS = ["Inter", "Poppins", "Outfit", "Lexend", "Roboto", "JetBrains Mono"];

  return (
    <main className="claude-settings-canvas page-transition">
      {/* Header */}
      <header className="claude-settings-header">
        <button className="claude-header-btn" onClick={() => onNavigate(VIEW.HOME)}>
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="claude-header-title">Settings</h2>
        <button className="claude-header-btn" onClick={() => onNavigate(VIEW.ABOUT)}>
          <span className="material-symbols-outlined">info</span>
        </button>
      </header>

      <div className="claude-settings-scroll-area">
        
        {/* Account Card */}
        <div className="claude-account-card">
          <span className="claude-account-email">{displayEmail}</span>
          <span className="claude-badge-free">Free</span>
        </div>

        {/* Group 1: Account */}
        <SettingsGroup>
          <SettingsRow 
            icon="account_circle" 
            title="Profile" 
            onClick={() => onNavigate(VIEW.PROFILE)} 
          />
        </SettingsGroup>

        {/* Group 3: Appearance */}
        <SettingsGroup>
          <SettingsRow 
            icon="dark_mode" 
            title="Color mode" 
            subtitle="System"
            onClick={() => {}} 
          />
          <SettingsRow 
            icon="format_size" 
            title="Font style" 
            subtitle={fontFamily}
            rightElement={<PremiumSelect value={fontFamily} options={FONT_OPTIONS} onChange={setFontFamily} />}
          />
        </SettingsGroup>

        {/* Group 4: Custom Accent (Premium Addition) */}
        <SettingsGroup>
          <div className="claude-settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '16px' }}>
            <div className="claude-settings-row__left">
              <span className="material-symbols-outlined claude-row-icon">palette</span>
              <div className="claude-settings-row__text">
                <p className="claude-row-title">Accent Color</p>
                <p className="claude-row-subtitle">Theme highlight</p>
              </div>
            </div>
            <div className="claude-color-grid">
              {ACCENT_COLORS.map(c => (
                <button 
                  key={c.color}
                  className={`claude-color-circle ${accentColor === c.color ? 'active' : ''}`}
                  style={{ backgroundColor: c.color }}
                  onClick={() => setAccentColor(c.color)}
                />
              ))}
            </div>
          </div>
        </SettingsGroup>

        {/* Group 5: Data */}
        <SettingsGroup>
          <SettingsRow 
            icon="delete_sweep" 
            title="Clear Recent Chats" 
            isDanger={true}
            onClick={onClearHistory} 
          />
          <SettingsRow 
            icon="logout" 
            title="Logout" 
            isDanger={true}
            onClick={onLogout} 
          />
        </SettingsGroup>

        <div className="claude-settings-footer">
          <p>Mydeen AI Version 1.1.0</p>
        </div>
      </div>
    </main>
  );
}
