import React, { useState, useEffect, useRef } from "react";

const SUGGESTIONS = [
  "Current CM of TN?",
  "AI startups in India",
  "Explain quantum computing simply",
  "Skills for engineering students",
  "World news today",
  "Taj Mahal mystery",
  "TNPSC exam preparation tips",
  "AI courses for beginners",
  "Chola Empire history",
];

const QUICK_CHIPS = [
  { label: "CM of TN", icon: "person" },
  { label: "AI Trends", icon: "auto_awesome" },
  { label: "TNPSC Tips", icon: "school" },
  { label: "Startup News", icon: "rocket_launch" },
];

export default function SmartSearchBar({ 
  onSubmit, 
  onPlusClick, 
  isProcessing, 
  isMenuOpen,
  webSearchEnabled,
  onToggleWebSearch,
  showChips = true,
  showTypewriter = true,
  onVoiceClick
}) {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Typewriter effect logic
  useEffect(() => {
    if (!showTypewriter) return;

    let currentText = SUGGESTIONS[suggestionIndex];
    let i = 0;
    let typingInterval;

    if (isTyping) {
      typingInterval = setInterval(() => {
        setPlaceholder(currentText.substring(0, i + 1));
        i++;
        if (i === currentText.length) {
          clearInterval(typingInterval);
          setTimeout(() => setIsTyping(false), 2500); 
        }
      }, 50);
    } else {
      typingInterval = setInterval(() => {
        setPlaceholder(currentText.substring(0, i));
        i--;
        if (i < 0) {
          clearInterval(typingInterval);
          setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
          setIsTyping(true);
        }
      }, 30);
    }

    return () => clearInterval(typingInterval);
  }, [suggestionIndex, isTyping, showTypewriter]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (query.trim()) {
      onSubmit?.(query.trim());
      setQuery("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit(e);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <footer className="smart-search-container ios-glass-container">
      {/* Dynamic Suggestion Chips Above Input */}
      {showChips && (
        <div className="smart-chips-wrapper">
          <div className="smart-chips-scroll">
            {QUICK_CHIPS.map((chip, idx) => (
              <button 
                key={idx} 
                className="smart-chip"
                onClick={() => onSubmit?.(chip.label)}
              >
                <span className="material-symbols-outlined smart-chip-icon">{chip.icon}</span>
                <span className="smart-chip-label">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="smart-input-bar ios-glass-bar" onSubmit={handleSubmit}>
        <button 
          type="button" 
          className={`new-search-btn-add ${isMenuOpen ? "active" : ""}`}
          onClick={onPlusClick}
          disabled={isProcessing}
          style={{ marginRight: '12px' }}
        >
          <span className="material-symbols-outlined">
            {isProcessing ? "sync" : isMenuOpen ? "close" : "add"}
          </span>
        </button>

        <div className="new-search-input-wrap">
          <div className="placeholder-container">
            {showTypewriter && !query && (
              <span className="animated-placeholder">
                {placeholder}
                <span className="typing-cursor">|</span>
              </span>
            )}
            <input
              className="smart-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              autoComplete="off"
              placeholder={!showTypewriter ? "Ask Mydeen..." : ""}
            />
          </div>
        </div>

        <div className="new-search-actions">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Web Search Toggle */}
            {onToggleWebSearch && (
              <button
                type="button"
                className={`smart-action-btn ${webSearchEnabled ? "active" : ""}`}
                onClick={onToggleWebSearch}
                title="Web Search"
              >
                <span className="material-symbols-outlined">
                  {webSearchEnabled ? "travel_explore" : "language"}
                </span>
              </button>
            )}

            {query.trim() && (
              <button type="submit" className="smart-send-btn">
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className={`smart-action-btn ${isListening ? "active" : ""}`}
          onClick={startListening}
          disabled={isProcessing}
          style={{ marginLeft: '8px' }}
        >
          <span className="material-symbols-outlined">{isListening ? "graphic_eq" : "mic"}</span>
        </button>

        {onVoiceClick && (
          <button
            type="button"
            className="smart-action-btn smart-voice-assistant-btn"
            onClick={onVoiceClick}
            title="Voice Assistant"
            style={{ marginLeft: '6px' }}
          >
            <span className="material-symbols-outlined">assistant</span>
          </button>
        )}
      </form>
    </footer>
  );
}
