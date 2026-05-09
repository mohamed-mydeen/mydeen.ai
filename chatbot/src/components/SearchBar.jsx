import { useState } from "react";

export default function SearchBar({ onSubmit }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSubmit?.(query.trim());
  };

  return (
    <form
      className="search-bar-wrapper"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Ask anything"
    >
      {/* Left search icon */}
      <span className="search-bar__icon material-symbols-outlined" aria-hidden="true">
        search
      </span>

      {/* Input */}
      <input
        id="main-search-input"
        className="search-bar__input"
        type="text"
        placeholder="Ask anything for your exams..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search query"
      />

      {/* Submit button */}
      <button
        id="main-search-submit"
        className="search-bar__submit"
        type="submit"
        aria-label="Submit question"
      >
        <span className="material-symbols-outlined">arrow_upward</span>
      </button>
    </form>
  );
}
