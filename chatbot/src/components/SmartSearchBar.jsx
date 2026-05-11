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
        {/* Left Side: Plus/Add Button */}
        <div className="smart-input-left">
          <button 
            type="button" 
            className={`new-search-btn-add ${isMenuOpen ? "active" : ""}`}
            onClick={onPlusClick}
            disabled={isProcessing}
          >
            <span className="material-symbols-outlined">
              {isProcessing ? "sync" : isMenuOpen ? "close" : "add"}
            </span>
          </button>
        </div>

        {/* Center: Input Area */}
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

        {/* Right Side: Grouped Actions */}
        <div className="new-search-actions-group">
          {/* Voice Assistant - Blue styled */}
          {onVoiceClick && !query.trim() && (
            <button
              type="button"
              className="smart-action-btn smart-voice-assistant-btn"
              onClick={onVoiceClick}
              title="Voice Assistant"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 0 12px rgba(134, 59, 255, 0.3)'
              }}
            >
              <div className="mini-assistant-icon">
                <div className="mini-orb-layer layer-one"></div>
                <div className="mini-orb-layer layer-two"></div>
                <div className="mini-orb-layer layer-three"></div>
                <div className="mini-orb-core"></div>
              </div>
            </button>
          )}

          {/* Mic Button */}
          {!query.trim() && (
            <button
              type="button"
              className={`smart-action-btn ${isListening ? "active" : ""}`}
              onClick={startListening}
              disabled={isProcessing}
            >
              <span className="material-symbols-outlined">{isListening ? "graphic_eq" : "mic"}</span>
            </button>
          )}

          {/* Web Search Toggle (Only when typing) */}
          {onToggleWebSearch && query.trim() && (
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

          {/* Send Button */}
          {query.trim() && (
            <button type="submit" className="smart-send-btn">
              <span className="material-symbols-outlined">arrow_upward</span>
            </button>
          )}
        </div>
      </form>
    </footer>
  );
}

