import React from 'react';
import { VIEW } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage({ onNavigate }) {
  const { user: supaUser } = useAuth();
  
  const displayName  = supaUser?.user_metadata?.full_name || supaUser?.user_metadata?.name || "User";
  const displayEmail = supaUser?.email || "";
  const phone        = localStorage.getItem("user_phone") || supaUser?.phone || "Not set";

  return (
    <main className="claude-settings-canvas page-transition-slide">
      <header className="claude-settings-header">
        <button className="claude-header-btn" onClick={() => onNavigate(VIEW.SETTINGS)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="claude-header-title">Profile</h2>
        <div style={{ width: '44px' }} /> {/* Spacer */}
      </header>

      <div className="claude-settings-scroll-area">
        <div className="claude-settings-group">
          <div className="claude-settings-row">
            <div className="claude-settings-row__left">
              <span className="material-symbols-outlined claude-row-icon">person</span>
              <div className="claude-settings-row__text">
                <p className="claude-row-title">Full Name</p>
                <p className="claude-row-subtitle">{displayName}</p>
              </div>
            </div>
          </div>
          
          <div className="claude-settings-row">
            <div className="claude-settings-row__left">
              <span className="material-symbols-outlined claude-row-icon">mail</span>
              <div className="claude-settings-row__text">
                <p className="claude-row-title">Email Address</p>
                <p className="claude-row-subtitle">{displayEmail}</p>
              </div>
            </div>
          </div>

          <div className="claude-settings-row">
            <div className="claude-settings-row__left">
              <span className="material-symbols-outlined claude-row-icon">phone</span>
              <div className="claude-settings-row__text">
                <p className="claude-row-title">Phone Number</p>
                <p className="claude-row-subtitle">{phone}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="claude-settings-footer">
          <p>Manage your account details</p>
        </div>
      </div>
    </main>
  );
}
