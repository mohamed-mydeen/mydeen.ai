import { useState } from "react";
import { VIEW } from "../constants";

const NAV_ITEMS = [
  { view: VIEW.HOME,     icon: "home",     label: "Home"     },
  { view: VIEW.MEMORIES, icon: "psychology", label: "Memories" },
  { view: VIEW.SETTINGS, icon: "settings", label: "Settings" },
  { view: VIEW.ABOUT,    icon: "info",     label: "About"    },
];

export default function Sidebar({ 
  isOpen, 
  onClose, 
  onNavigate, 
  currentView, 
  history = [],
  activeSessionId,
  onRename,
  onDelete,
  onArchive,
  userProfile
}) {
  const [editingSid, setEditingSid] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenSid, setMenuOpenSid] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const recentChats = history
    .filter(h => !h.archived)
    .filter(h => {
      const q = (h.query || "").toLowerCase();
      const s = (searchQuery || "").toLowerCase();
      return q.includes(s);
    });

  const startEditing = (sid, title) => {
    setEditingSid(sid);
    setEditTitle(title);
    setMenuOpenSid(null);
  };

  const saveRename = (sid) => {
    if (editTitle.trim()) {
      onRename(sid, editTitle.trim());
    }
    setEditingSid(null);
  };

  const toggleMenu = (e, sid) => {
    e.stopPropagation();
    setMenuOpenSid(menuOpenSid === sid ? null : sid);
  };

  return (
    <div className={`sidebar-container ${isOpen ? "sidebar-container--open" : ""}`}>
      <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`} role="dialog" aria-modal="true">
        {/* Top Header */}
        <div className="sidebar__top-bar">
          <div className="sidebar__logo">
            <svg fill="none" height="32" viewBox="0 0 100 100" width="32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-side" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b"></stop>
                  <stop offset="30%" stopColor="#ef4444"></stop>
                  <stop offset="70%" stopColor="#4f46e5"></stop>
                  <stop offset="100%" stopColor="#3b82f6"></stop>
                </linearGradient>
              </defs>
              <path d="M50 40L60 50L50 60L40 50Z" fill="url(#logo-grad-side)" opacity="0.8"></path>
              <path d="M50 15C52 25 58 32 68 34C58 36 52 43 50 53C48 43 42 36 32 34C42 32 48 25 50 15Z" fill="none" stroke="url(#logo-grad-side)" strokeWidth="4"></path>
              <path d="M75 25C70 32 68 42 75 50C68 58 70 68 75 75C68 70 58 68 50 75C42 68 32 70 25 75C30 68 32 58 25 50C32 42 30 32 25 25C30 32 40 34 50 25C60 34 70 32 75 25Z" fill="none" stroke="url(#logo-grad-side)" strokeWidth="4"></path>
              <circle cx="50" cy="50" fill="none" opacity="0.6" r="30" stroke="url(#logo-grad-side)" strokeWidth="3"></circle>
              <circle cx="50" cy="50" fill="none" opacity="0.3" r="40" stroke="url(#logo-grad-side)" strokeWidth="2"></circle>
            </svg>
          </div>
          <button className="sidebar__toggle-icon" onClick={onClose}>
            <span className="material-symbols-outlined">side_navigation</span>
          </button>
        </div>

        <nav className="sidebar__nav">
          {/* Primary Actions */}
          <div className="sidebar__actions">
            <button className="sidebar__action-item" onClick={() => { onNavigate('NEW_CHAT'); onClose(); }}>
              <span className="material-symbols-outlined">edit_square</span>
              <span>New chat</span>
            </button>

            <div className="sidebar__search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input 
                type="text" 
                placeholder="Search chats" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className={`sidebar__action-item ${currentView === VIEW.MEMORIES ? 'sidebar__action-item--active' : ''}`} onClick={() => { onNavigate(VIEW.MEMORIES); onClose(); }}>
              <span className="material-symbols-outlined">psychology</span>
              <span>Memories</span>
            </button>
            <button className={`sidebar__action-item ${currentView === VIEW.ABOUT ? 'sidebar__action-item--active' : ''}`} onClick={() => { onNavigate(VIEW.ABOUT); onClose(); }}>
              <span className="material-symbols-outlined">info</span>
              <span>About</span>
            </button>
            <button className={`sidebar__action-item ${currentView === VIEW.SETTINGS ? 'sidebar__action-item--active' : ''}`} onClick={() => { onNavigate(VIEW.SETTINGS); onClose(); }}>
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </button>
          </div>

          {/* Recents Section */}
          <div className="sidebar__recents-section">
            <h3 
              className="sidebar__section-title" 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            >
              Recents <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.6, transform: isHistoryOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>expand_more</span>
            </h3>
            {isHistoryOpen && (
              <ul className="sidebar__history-list">
                {recentChats.length === 0 ? (
                  <li className="sidebar__history-empty">No recent chats</li>
                ) : (
                  recentChats.map((item) => (
                    <li key={item.id} className={`sidebar__history-wrapper ${activeSessionId === item.sid ? "sidebar__history-wrapper--active" : ""}`}>
                      {editingSid === item.sid ? (
                        <div className="sidebar__edit-wrap">
                          <input 
                            autoFocus
                            className="sidebar__edit-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename(item.sid)}
                            onBlur={() => saveRename(item.sid)}
                          />
                        </div>
                      ) : (
                        <div className="sidebar__history-item-container">
                          <button type="button" className="sidebar__history-item" onClick={() => { onNavigate(VIEW.HOME, item.query, true, item.sid); onClose(); }}>
                            <span className="sidebar__history-text">{item.query || "Untitled Chat"}</span>
                          </button>
                          <button className="sidebar__history-more" onClick={(e) => toggleMenu(e, item.sid)}>
                            <span className="material-symbols-outlined">more_horiz</span>
                          </button>
                          {menuOpenSid === item.sid && (
                            <div className="sidebar__history-dropdown">
                              <button onClick={() => startEditing(item.sid, item.query)}>
                                <span className="material-symbols-outlined">edit</span> Rename
                              </button>
                              <button onClick={() => { onArchive(item.sid, true); setMenuOpenSid(null); }}>
                                <span className="material-symbols-outlined">archive</span> Archive
                              </button>
                              <button className="sidebar__dropdown--danger" onClick={() => { onDelete(item.sid); setMenuOpenSid(null); }}>
                                <span className="material-symbols-outlined">delete</span> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </nav>

      </aside>
    </div>
  );
}
