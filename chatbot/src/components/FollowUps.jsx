import React from 'react';

export default function FollowUps({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="follow-ups-container">
      <h3 className="follow-ups-title">Follow-ups</h3>
      <div className="follow-ups-list">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className="follow-up-item"
            onClick={() => onSelect(suggestion)}
            type="button"
          >
            <span className="follow-up-icon">↳</span>
            <span className="follow-up-text">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
