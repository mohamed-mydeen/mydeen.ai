import React, { useState, useEffect } from "react";
import { getMemories, updateMemories } from "../api/chatApi";
import { VIEW } from "../constants";

/* ─── Shared Components for Premium Look ─────────────────────────────── */

const SettingsGroup = ({ children }) => (
  <div className="claude-settings-group">
    {children}
  </div>
);

const SettingsRow = ({ icon, title, subtitle, rightElement }) => (
  <div className="claude-settings-row">
    <div className="claude-settings-row__left">
      <span className="material-symbols-outlined claude-row-icon">{icon}</span>
      <div className="claude-settings-row__text">
        <p className="claude-row-title">{title}</p>
        {subtitle && <p className="claude-row-subtitle">{subtitle}</p>}
      </div>
    </div>
    <div className="claude-settings-row__right">
      {rightElement}
    </div>
  </div>
);

const Toggle = ({ active, onClick }) => (
  <button 
    className={`claude-toggle ${active ? 'active' : ''}`} 
    onClick={onClick}
    role="switch"
    aria-checked={active}
  >
    <span className="claude-toggle-thumb" />
  </button>
);

/* ─── Main Memories Page ─────────────────────────────────────────────── */

export default function MemoriesPage({ onBack }) {
  const [referenceSavedMemories, setReferenceSavedMemories] = useState(true);
  const [referenceChatHistory, setReferenceChatHistory] = useState(true);
  const [nickname, setNickname] = useState("");
  const [occupation, setOccupation] = useState("");
  const [moreAboutYou, setMoreAboutYou] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getMemories();
        setReferenceSavedMemories(data.referenceSavedMemories ?? true);
        setReferenceChatHistory(data.referenceChatHistory ?? true);
        setNickname(data.nickname || "");
        setOccupation(data.occupation || "");
        setMoreAboutYou(data.moreAboutYou || "");
      } catch (err) {
        console.error("Failed to load memories:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMemories({
        referenceSavedMemories,
        referenceChatHistory,
        nickname,
        occupation,
        moreAboutYou,
      });
      setToast("Memories updated");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      console.error("Failed to save memories:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="claude-settings-canvas" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="typing-indicator">
          <span /><span /><span />
        </div>
      </main>
    );
  }

  return (
    <main className="claude-settings-canvas page-transition-slide">
      {/* Header */}
      <header className="claude-settings-header">
        <button className="claude-header-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="claude-header-title">Memories</h2>
        <button className="claude-header-btn" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.5 : 1 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-brand-blue)' }}>
            {saving ? 'sync' : 'done'}
          </span>
        </button>
      </header>

      <div className="claude-settings-scroll-area">
        
        {/* Memory Control Card */}
        <SettingsGroup>
          <SettingsRow 
            icon="psychology" 
            title="Reference memories" 
            subtitle="Let Mydeen AI save and use memories"
            rightElement={
              <Toggle 
                active={referenceSavedMemories} 
                onClick={() => setReferenceSavedMemories(!referenceSavedMemories)} 
              />
            }
          />
          <SettingsRow 
            icon="history" 
            title="Reference chat history" 
            subtitle="Context from recent conversations"
            rightElement={
              <Toggle 
                active={referenceChatHistory} 
                onClick={() => setReferenceChatHistory(!referenceChatHistory)} 
              />
            }
          />
        </SettingsGroup>

        {/* Sync Button Card */}
        <div 
          className="claude-account-card claude-settings-row--clickable" 
          onClick={() => setToast("Memory index is up to date.")}
          style={{ cursor: 'pointer' }}
        >
          <div className="claude-settings-row__left">
            <span className="material-symbols-outlined claude-row-icon">sync</span>
            <p className="claude-row-title">Sync long-term memories</p>
          </div>
          <span className="material-symbols-outlined claude-chevron">chevron_right</span>
        </div>

        {/* Personal Details Card */}
        <SettingsGroup>
          <div className="claude-settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '20px' }}>
            <div style={{ width: '100%' }}>
              <p className="claude-row-title" style={{ marginBottom: '8px', fontSize: '14px', color: '#888888' }}>YOUR NICKNAME</p>
              <input 
                type="text" 
                className="claude-input-premium" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="What should I call you?"
              />
            </div>
            
            <div style={{ width: '100%' }}>
              <p className="claude-row-title" style={{ marginBottom: '8px', fontSize: '14px', color: '#888888' }}>YOUR OCCUPATION</p>
              <input 
                type="text" 
                className="claude-input-premium" 
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Software developer, College student"
              />
            </div>

            <div style={{ width: '100%' }}>
              <p className="claude-row-title" style={{ marginBottom: '8px', fontSize: '14px', color: '#888888' }}>MORE ABOUT YOU</p>
              <textarea 
                className="claude-input-premium" 
                style={{ minHeight: '100px', resize: 'none', paddingTop: '12px' }}
                value={moreAboutYou}
                onChange={(e) => setMoreAboutYou(e.target.value)}
                placeholder="Interests, values, or preferences..."
              />
            </div>
          </div>
        </SettingsGroup>

        {/* Save Button Card */}
        <div style={{ marginTop: '8px' }}>
          <button 
            className="claude-upgrade-btn" 
            style={{ width: '100%', borderRadius: '12px', padding: '16px' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Updating...' : 'Save All Memories'}
          </button>
        </div>

        <div className="claude-settings-footer">
          <p>Mydeen AI learns from your preferences to provide better help.</p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="claude-toast">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}
