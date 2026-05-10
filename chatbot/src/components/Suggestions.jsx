import React, { useState, useEffect } from 'react';

const ALL_SUGGESTIONS = [
  { 
    img: 'https://images.unsplash.com/photo-1548013146-72479768bbaa?auto=format&fit=crop&q=80&w=100', 
    text: 'Who is the current CM of Tamil Nadu?' 
  },
  { 
    img: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=100', 
    text: 'Latest AI startups in India' 
  },
  { 
    img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=100', 
    text: 'Explain NEET exam pattern' 
  },
  { 
    img: 'https://images.unsplash.com/photo-1564507592333-c60657ece523?auto=format&fit=crop&q=80&w=100', 
    text: 'Taj Mahal colour mystery' 
  },
  { 
    img: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=100', 
    text: 'What’s happening in the world?' 
  },
  { 
    img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=100', 
    text: 'Top engineering skills in 2026' 
  },
  { 
    img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=100', 
    text: 'Best AI tools for students' 
  },
  {
    img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=100',
    text: 'Top places to visit in Chennai'
  }
];

export default function Suggestions({ onSelect, userName = "Mydeen" }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    // Pick 3 random suggestions for vertical stack
    const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  }, []);

  if (suggestions.length === 0) return null;

  return (
    <div className="sarvam-suggestions-wrapper">
      <div className="sarvam-greeting">
        <p className="sarvam-greeting-text">Hi {userName}, hope your day went well!</p>
        <h2 className="sarvam-heading">Let&apos;s make something happen.</h2>
      </div>
      
      <div className="sarvam-suggestions-list">
        {suggestions.map((sug, idx) => (
          <button 
            key={idx} 
            className="sarvam-suggestion-card"
            onClick={() => onSelect(sug.text)}
            type="button"
          >
            <div className="sarvam-card-thumb">
              <img src={sug.img} alt="" />
            </div>
            <span className="sarvam-card-text">{sug.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
