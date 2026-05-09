import { useState, useEffect } from "react";
import { getMemories, updateMemories } from "../api/chatApi";

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
      setToast("Memories saved successfully!");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      console.error("Failed to save memories:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="main-canvas page-view">
        <div className="typing-indicator" style={{ margin: "auto" }}>
          <span /><span /><span />
        </div>
      </main>
    );
  }

  return (
    <main className="main-canvas page-view">
      <div className="memories-container">
        {/* Header with Back, Title, and Save Check */}
        <div className="memories-header">
          <div className="memories-header__left">
            <button className="memories-header__btn" onClick={onBack} aria-label="Go back">
              {/* Back icon removed */}
            </button>
            <h2 className="memories-header__title">Memories</h2>
          </div>
          <button
            className="memories-header__save-btn"
            onClick={handleSave}
            disabled={saving}
            aria-label="Save memories"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 28 }}>
              {saving ? "sync" : "check_circle"}
            </span>
          </button>
        </div>

        {/* Manage Memories Action Button */}
        <button className="memories-btn-manage" onClick={() => setToast("Memory index is up to date.")}>
          <span>Sync long-term memories</span>
          <span className="material-symbols-outlined">sync</span>
        </button>

        {/* Reference Saved Memories Toggle */}
        <div className="settings-item">
          <div className="settings-item__info">
            <span className="material-symbols-outlined">psychology</span>
            <div>
              <p className="settings-item__name">Reference saved memories</p>
              <p className="settings-item__desc">Lets Mydeen AI save and use memories when responding.</p>
            </div>
          </div>
          <button
            className={`toggle ${referenceSavedMemories ? "toggle--on" : ""}`}
            onClick={() => setReferenceSavedMemories(v => !v)}
            role="switch"
            aria-checked={referenceSavedMemories}
            aria-label="Reference saved memories"
          >
            <span className="toggle__thumb" />
          </button>
        </div>

        {/* Reference Chat History Toggle */}
        <div className="settings-item">
          <div className="settings-item__info">
            <span className="material-symbols-outlined">history</span>
            <div>
              <p className="settings-item__name">Reference Chat History</p>
              <p className="settings-item__desc">Lets Mydeen AI reference recent conversations when responding.</p>
            </div>
          </div>
          <button
            className={`toggle ${referenceChatHistory ? "toggle--on" : ""}`}
            onClick={() => setReferenceChatHistory(v => !v)}
            role="switch"
            aria-checked={referenceChatHistory}
            aria-label="Reference chat history"
          >
            <span className="toggle__thumb" />
          </button>
        </div>

        {/* Nickname Input */}
        <div className="memories-section">
          <label className="memories-section__label">Your nickname</label>
          <input
            type="text"
            className="memories-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="What should I call you?"
          />
        </div>

        {/* Occupation Input */}
        <div className="memories-section">
          <label className="memories-section__label">Your occupation</label>
          <input
            type="text"
            className="memories-input"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="e.g. Software developer, College student"
          />
        </div>

        {/* More About You Textarea */}
        <div className="memories-section">
          <label className="memories-section__label">More about you</label>
          <textarea
            className="memories-textarea"
            value={moreAboutYou}
            onChange={(e) => setMoreAboutYou(e.target.value)}
            placeholder="Interests, values, or preferences to keep in mind"
          />
        </div>
        
        {/* Explicit Save Button for UX */}
        <div className="memories-footer-action">
          <button 
            className="memories-save-full-btn" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined spin">sync</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Save Memories
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="memories-toast" role="status">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}
