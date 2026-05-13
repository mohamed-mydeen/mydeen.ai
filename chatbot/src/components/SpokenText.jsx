import React, { useMemo } from "react";

/**
 * SpokenText – Word-by-word highlighter for premium AI voice experience.
 * Synchronizes with browser SpeechSynthesis boundary events.
 */
const SpokenText = ({ text, currentCharIndex, isSpeaking, accentColor }) => {
  // Split text into words while preserving whitespace and character positions
  const words = useMemo(() => {
    if (!text) return [];
    
    const result = [];
    let currentPos = 0;
    
    // Use regex to split by whitespace but keep the whitespace as part of the "word" or separate
    // Actually, simpler: find all words and their start indices
    const regex = /\S+/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      result.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
        // Include following whitespace
        trailingSpace: text.slice(match.index + match[0].length, regex.lastIndex) || ""
      });
    }
    
    return result;
  }, [text]);

  if (!text) return null;

  // Fallback: If not speaking or not supported, just show normal text
  if (!isSpeaking && currentCharIndex === 0) {
    return <p className="spoken-text-static">{text}</p>;
  }

  return (
    <div className="spoken-text-container">
      {words.map((w, idx) => {
        const isRead = currentCharIndex > w.start || (isSpeaking && currentCharIndex >= w.start);
        const isCurrent = isSpeaking && currentCharIndex >= w.start && currentCharIndex < w.end;
        
        return (
          <span 
            key={idx}
            className={`spoken-word ${isRead ? 'read' : 'unread'} ${isCurrent ? 'current' : ''}`}
            style={{
              '--accent': accentColor,
              transitionDelay: `${idx * 10}ms`
            }}
          >
            {w.word}
            <span className="word-space"> </span>
          </span>
        );
      })}
    </div>
  );
};

export default React.memo(SpokenText);
