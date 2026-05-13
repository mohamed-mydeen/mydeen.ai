import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { streamSearchMessage } from "../api/chatApi";

import { useAuth } from "../context/AuthContext";
import Suggestions from "./Suggestions";
import FollowUps from "./FollowUps";
import SmartSearchBar from "./SmartSearchBar";

/* ─── Small sub-components ─────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg--ai" aria-label="AI is typing">
      <div className="chat-msg__bubble chat-msg__bubble--ai typing-indicator">
        <span /><span /><span />
      </div>
    </div>
  );
}

const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
  } catch {
    return null;
  }
};

const getSiteName = (url, title, source) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '').toLowerCase();
    
    // Hardcoded professional aliases
    if (domain.includes('wikipedia.org')) return 'Wikipedia';
    if (domain.includes('timesofindia')) return 'Times of India';
    if (domain.includes('thehindu.com')) return 'The Hindu';
    if (domain.includes('ndtv.com')) return 'NDTV';
    if (domain.includes('hindustantimes')) return 'Hindustan Times';
    if (domain.includes('indianexpress')) return 'Indian Express';
    if (domain.includes('josh.com')) return 'Jagran Josh';
    if (domain.includes('britannica.com')) return 'Britannica';
    if (domain.includes('reuters.com')) return 'Reuters';
    if (domain.includes('bloomberg.com')) return 'Bloomberg';
    if (domain.includes('bbc.co')) return 'BBC';
    if (domain.includes('cnn.com')) return 'CNN';
    if (domain.includes('quora.com')) return 'Quora';
    if (domain.includes('reddit.com')) return 'Reddit';
    if (domain.includes('github.com')) return 'GitHub';
    if (domain.includes('stackoverflow')) return 'Stack Overflow';
    if (domain.includes('medium.com')) return 'Medium';
    
    // Fallback: Capitalize the first part of domain
    const parts = domain.split('.');
    let name = parts[0];
    if (name.length <= 3) name = (parts[0] + ' ' + (parts[1] || '')).trim();
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return source || title?.slice(0, 15) || 'Web Source';
  }
};

/** Perplexity-style sources bar with real favicons */
function SourcesBar({ sources, onOpenSources }) {
  if (!sources || sources.length === 0) return null;
  const overflow = sources.length - 3;

  return (
    <div className="chatgpt-sources-container">
      <button
        className="chatgpt-sources-toggle"
        onClick={() => onOpenSources(sources)}
      >
        <div className="chatgpt-sources-avatars">
          {sources.slice(0, 3).map((s, i) => (
            <div key={i} className="chatgpt-sources-avatar" style={{ zIndex: 3 - i }}>
              {getFavicon(s.url) ? (
                <img
                  src={getFavicon(s.url)}
                  alt=""
                  className="chatgpt-sources-favicon"
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                />
              ) : null}
              <span className="chatgpt-sources-fallback" style={{display:'none'}}>
                {getSiteName(s.url, s.title, s.source).slice(0,1).toUpperCase()}
              </span>
            </div>
          ))}
          {overflow > 0 && (
            <div className="chatgpt-sources-avatar chatgpt-sources-avatar--more">
              +{overflow}
            </div>
          )}
        </div>
        <span className="chatgpt-sources-label">Sources</span>
      </button>
    </div>
  );
}

/** Live countdown banner shown during backend retry waits */
function RetryBanner({ attempt, totalRetries, secondsLeft }) {
  return (
    <div className="retry-banner" role="status" aria-live="polite">
      <span className="retry-banner__icon material-symbols-outlined">hourglass_top</span>
      <div className="retry-banner__text">
        <span className="retry-banner__title">Rate limited — queued &amp; retrying…</span>
        <span className="retry-banner__sub">
          Attempt {attempt} of {totalRetries} · retrying in{" "}
          <strong>{secondsLeft}s</strong>
        </span>
      </div>
      <div className="retry-banner__bar">
        <div
          className="retry-banner__fill"
          style={{ animationDuration: `${secondsLeft}s` }}
        />
      </div>
    </div>
  );
}

function MydeenLogo({ size = 72 }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 100 100" width={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad-chat" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b"></stop>
          <stop offset="30%" stopColor="#ef4444"></stop>
          <stop offset="70%" stopColor="#4f46e5"></stop>
          <stop offset="100%" stopColor="#3b82f6"></stop>
        </linearGradient>
      </defs>
      <path d="M50 40L60 50L50 60L40 50Z" fill="url(#logo-grad-chat)" opacity="0.8"></path>
      <path d="M50 15C52 25 58 32 68 34C58 36 52 43 50 53C48 43 42 36 32 34C42 32 48 25 50 15Z" fill="none" stroke="url(#logo-grad-chat)" strokeWidth="2"></path>
      <path d="M75 25C70 32 68 42 75 50C68 58 70 68 75 75C68 70 58 68 50 75C42 68 32 70 25 75C30 68 32 58 25 50C32 42 30 32 25 25C30 32 40 34 50 25C60 34 70 32 75 25Z" fill="none" stroke="url(#logo-grad-chat)" strokeWidth="2"></path>
      <circle cx="50" cy="50" fill="none" opacity="0.6" r="30" stroke="url(#logo-grad-chat)" strokeWidth="1.5"></circle>
      <circle cx="50" cy="50" fill="none" opacity="0.3" r="40" stroke="url(#logo-grad-chat)" strokeWidth="1"></circle>
    </svg>
  );
}

/** Perplexity/ChatGPT-style Image Gallery */
function ImageGallery({ images }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="chat-image-gallery">
      {images.map((img, idx) => (
        <a key={idx} href={img.source} target="_blank" rel="noopener noreferrer" className="chat-image-card">
          <img src={img.thumbnail || img.url} alt={img.title || "Reference image"} loading="lazy" />
          <div className="chat-image-card__overlay">
            <span className="chat-image-card__title">{img.title || "Image"}</span>
            <span className="chat-image-card__provider">{img.provider || getSiteName(img.source)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ── Safety Check Card for Chat UI ── */
function SafetyCheckCard({ data, loading, url }) {
  if (loading) {
    return (
      <div className="chat-safety-loading-minimal">
        <div className="chat-safety-spinner-small">
          <span className="material-symbols-outlined spinning">security</span>
        </div>
        <div className="chat-safety-loading-text">
          <p>Scanning <strong>{url}</strong> for risks...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const score = data.risk_score;
  const isDanger = score >= 70;
  const isWarning = score >= 45;
  const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

  const details = data.module_details || {};
  const domainInfo = details.domain_analysis || {};
  const sslInfo = details.ssl_analysis || {};

  return (
    <div className="chat-safety-report-inline">
      <div className="chat-safety-header-inline">
        <div className="chat-safety-badge-mini" style={{ backgroundColor: `${color}15`, color: color }}>
          <span className="material-symbols-outlined">
            {isDanger ? 'gpp_bad' : isWarning ? 'warning' : 'verified_user'}
          </span>
          {data.risk_category}
        </div>
        <div className="chat-safety-score-pill">
          Risk Score: <strong>{score}</strong>
        </div>
      </div>
      
      <div className="markdown-content">
        <ReactMarkdown>{data.ai_advice}</ReactMarkdown>
      </div>

      {/* Technical Metadata Grid */}
      <div className="chat-safety-details-grid">
        {domainInfo.domain_age_days !== undefined && (
          <div className="safety-detail-item">
            <span className="material-symbols-outlined">calendar_today</span>
            <div>
              <span className="label">Domain Age</span>
              <span className="value">{domainInfo.domain_age_days} days</span>
            </div>
          </div>
        )}
        {domainInfo.registrar && (
          <div className="safety-detail-item">
            <span className="material-symbols-outlined">business</span>
            <div>
              <span className="label">Registrar</span>
              <span className="value">{domainInfo.registrar.split(' ')[0]}</span>
            </div>
          </div>
        )}
        {sslInfo.issuer && (
          <div className="safety-detail-item">
            <span className="material-symbols-outlined">lock</span>
            <div>
              <span className="label">SSL Issuer</span>
              <span className="value">{sslInfo.issuer.split(',')[0].replace('O=', '').trim()}</span>
            </div>
          </div>
        )}
      </div>

      {data.all_issues.length > 0 && (
        <div className="chat-safety-findings-inline">
          <h5>Security Findings:</h5>
          <ul>
            {data.all_issues.slice(0, 3).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



function ChatMessage({ role, text, sources, images, suggestions, onEdit, onRegenerate, isLast, isStreaming, onOpenSources, onSelectSuggestion, type, loading, safety_data, url }) {
  const [shared, setShared] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const pressTimer = useRef(null);
  const isUser = role === 'user';

  // Handle Long Press for Mobile Actions
  const handleTouchStart = (e) => {
    if (!isUser) return;
    // Reset previous just in case
    if (pressTimer.current) clearTimeout(pressTimer.current);
    
    pressTimer.current = setTimeout(() => {
      setShowMobileMenu(true);
      // Provide subtle haptic feedback if available on Android/PWA
      if ('vibrate' in navigator) {
        navigator.vibrate(30); 
      }
    }, 550); // 550ms long press threshold
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleTouchMove = () => {
    // If user starts scrolling, cancel the long-press detection instantly
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const shareText = `Check out this explanation from Mydeen AI:\n\n${text}`;
    if (navigator.share) {
      navigator.share({
        title: "Mydeen AI Explanation",
        text: shareText,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className={`chat-msg ${isUser ? "chat-msg--user" : "chat-msg--ai"} ${type === 'safety_check' ? 'chat-msg--safety' : ''}`}>
      {!isUser && (
        <div className="chat-msg__avatar" aria-hidden="true">
          <MydeenLogo size={32} />
        </div>
      )}
      {isUser ? (
        <div 
          className={`chat-msg__user-container ${showMobileMenu ? 'chat-msg__user-container--active' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onContextMenu={(e) => { if (showMobileMenu) e.preventDefault(); }} /* Prevent context menu collision */
        >
          <div className="chat-msg__bubble chat-msg__bubble--user">
            <div className="chat-msg__text">{text}</div>
          </div>
          
          {/* Desktop Hover Actions / Secondary Context */}
          <div className="chat-msg__actions chat-msg__actions--user">
            <button
              type="button"
              className={`chat-msg__action-btn ${copied ? "chat-msg__action-btn--copied" : ""}`}
              onClick={handleCopy}
              title="Copy prompt"
              aria-label={copied ? "Copied" : "Copy prompt"}
            >
              <span className="material-symbols-outlined">
                {copied ? "check" : "content_copy"}
              </span>
            </button>
            <button
              type="button"
              className="chat-msg__action-btn"
              onClick={() => onEdit(text)}
              title="Edit prompt"
              aria-label="Edit prompt"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
          </div>

          {/* Mobile Floating Actions Popup */}
          {showMobileMenu && (
            <>
              <div 
                className="mobile-actions-backdrop" 
                onClick={(e) => { e.stopPropagation(); setShowMobileMenu(false); }} 
              />
              <div 
                className="mobile-actions-popup"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <button 
                  className="mobile-actions-item" 
                  onClick={(e) => { e.stopPropagation(); handleCopy(); setShowMobileMenu(false); }}
                >
                  <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
                  <span>{copied ? "Copied!" : "Copy text"}</span>
                </button>
                <div className="mobile-actions-divider" />
                <button 
                  className="mobile-actions-item" 
                  onClick={(e) => { e.stopPropagation(); onEdit(text); setShowMobileMenu(false); }}
                >
                  <span className="material-symbols-outlined">edit</span>
                  <span>Edit prompt</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="chat-msg__bubble-wrapper--ai">
          <div className="chat-msg__bubble chat-msg__bubble--ai">
            <div className="markdown-content">
              {type === 'safety_check' ? (
                <SafetyCheckCard data={safety_data} loading={loading} url={url} />
              ) : (
                <>
                  <ReactMarkdown>{text}</ReactMarkdown>
                  {isStreaming && <span className="streaming-cursor" />}
                  
                  {/* Inline Citation Pill inside bubble (ChatGPT style) */}
                  {!isStreaming && sources && sources.length > 0 && (
                    <div className="inline-citation-pill" title="View Sources">
                      {getSiteName(sources[0].url, sources[0].title, sources[0].source)}
                      {sources.length > 1 && <span className="inline-citation-pill__more">+{sources.length - 1}</span>}
                    </div>
                  )}
                </>
              )}
            </div>
            {!isStreaming && images && images.length > 0 && (
              <ImageGallery images={images} />
            )}
          </div>
          
          {!isStreaming && suggestions && suggestions.length > 0 && type !== 'safety_check' && (
            <FollowUps 
              suggestions={suggestions} 
              onSelect={(text) => onSelectSuggestion(text)} 
            />
          )}

          {!isStreaming && type !== 'safety_check' && (
            <div className="chat-msg__actions chat-msg__actions--ai">
              <button
                type="button"
                className={`chat-msg__action-btn ${copied ? "chat-msg__action-btn--copied" : ""}`}
                onClick={handleCopy}
                title="Copy response"
              >
                <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
              </button>
              <button 
                type="button" 
                className={`chat-msg__action-btn ${feedback === 'like' ? "chat-msg__action-btn--active" : ""}`} 
                onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                title="Good response"
                style={{ color: feedback === 'like' ? '#10b981' : 'var(--color-on-surface-variant)' }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: feedback === 'like' ? "'FILL' 1" : "none" }}>thumb_up</span>
              </button>
              <button 
                type="button" 
                className={`chat-msg__action-btn ${feedback === 'dislike' ? "chat-msg__action-btn--active" : ""}`} 
                onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
                title="Bad response"
                style={{ color: feedback === 'dislike' ? '#ef4444' : 'var(--color-on-surface-variant)' }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: feedback === 'dislike' ? "'FILL' 1" : "none" }}>thumb_down</span>
              </button>
              <button
                type="button"
                className={`chat-msg__action-btn ${shared ? "chat-msg__action-btn--copied" : ""}`}
                onClick={handleShare}
                title="Share response"
              >
                <span className="material-symbols-outlined">{shared ? "check" : "share"}</span>
              </button>
              
              {!isUser && (
                <button 
                  type="button" 
                  className={`chat-msg__action-btn ${isSpeaking ? 'chat-msg__action-btn--active' : ''}`} 
                  onClick={handleSpeak} 
                  title="Listen"
                >
                  <span className="material-symbols-outlined">{isSpeaking ? 'stop_circle' : 'volume_up'}</span>
                </button>
              )}


              
              {!isStreaming && sources && sources.length > 0 && (
                <>
                  <div className="chat-msg__actions-spacer" style={{ flex: 1 }}></div>
                  <SourcesBar sources={sources} onOpenSources={onOpenSources} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Chat Component ───────────────────────────────────────────── */

const RETRY_DELAYS = [10, 20, 30, 45];

export default function Chat({ 
  initialQuery = { text: "", isHistory: false, sessionId: null }, 
  onPlusClick, 
  isPlusMenuOpen, 
  isProcessing,
  language,
  onVoiceClick,
  pendingAttachment,
  setPendingAttachment
}) {
  const auth = useAuth();
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [sessionId, setSessionId]   = useState(initialQuery?.sessionId);
  const [retryState, setRetryState] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [searchSources, setSearchSources] = useState([]);
  const [searchImages, setSearchImages] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchStatus, setSearchStatus]         = useState(null);
  
  const [drawerSources, setDrawerSources] = useState(null);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

  const closeDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setDrawerSources(null);
      setIsDrawerClosing(false);
    }, 300);
  };

  const bottomRef      = useRef(null);
  const topRef         = useRef(null);
  const chatMessagesRef = useRef(null);
  const inputRef       = useRef(null);
  const initialSent    = useRef(false);
  const countdownTimer = useRef(null);

  useEffect(() => {
    if (loading || streamingMessage) {
      const scrollContainer = chatMessagesRef.current;
      if (scrollContainer) {
        const timeoutId = setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "auto"
          });
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [loading, streamingMessage]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleViewportChange = () => {
      const scrollContainer = chatMessagesRef.current;
      if (scrollContainer) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const keyboardHeight = windowHeight - viewportHeight;
        if (keyboardHeight > 100) {
          scrollContainer.style.paddingBottom = `${keyboardHeight + 80}px`;
          setTimeout(() => {
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
          }, 100);
        } else {
          scrollContainer.style.paddingBottom = "160px";
        }
      }
    };
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
      window.visualViewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBtn(isScrolledUp);
  };

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => () => clearInterval(countdownTimer.current), []);

  const handleEdit = useCallback((textToEdit) => {
    setInput(textToEdit);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (text, overrideHistory, currentSid, attachmentOverride) => {
    const trimmed = (text ?? input).trim();
    const activeAttachment = attachmentOverride !== undefined ? attachmentOverride : pendingAttachment;
    
    // Allow submitting if text exists OR a file attachment exists!
    if ((!trimmed && !activeAttachment) || loading) return;

    // ── Handle Safety Check Command ──
    if (trimmed.startsWith("SAFETY_CHECK:")) {
      const url = trimmed.replace("SAFETY_CHECK:", "");
      const userMsg = { role: "user", text: `Scan Website: ${url}` };
      const safetyMsg = { role: "assistant", type: "safety_check", loading: true, url };
      
      setMessages(prev => [...prev, userMsg, safetyMsg]);
      setInput("");
      setLoading(true);

      try {
        const token = await (auth.isAuthenticated ? auth.getAccessToken() : localStorage.getItem("auth_token"));
        const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${API_URL}/detect_deceptive`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ url })
        });
        const result = await response.json();
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === 'safety_check') {
            last.loading = false;
            last.safety_data = result;
          }
          return updated;
        });
      } catch (err) {
        console.error("Safety check error:", err);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === 'safety_check') {
            last.loading = false;
            last.error = "Failed to analyze URL";
          }
          return updated;
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── NEW: Handle Image Attachment Command (ChatGPT Style) ──
    if (activeAttachment && activeAttachment.type === 'image') {
      const imagePreviewUrl = activeAttachment.preview;
      const imageFile = activeAttachment.file;
      const userMsgText = trimmed || "Analyze this photo";

      // 1. Visually post User message WITH image in Chat history immediately!
      setMessages(prev => [...prev, { role: "user", text: userMsgText, images: [imagePreviewUrl] }]);
      setInput("");
      setLoading(true);
      setIsThinking(true);
      
      // Clear input bar visual preview state ASAP
      setPendingAttachment(null); 

      try {
        const token = await (auth.isAuthenticated ? auth.getAccessToken() : localStorage.getItem("auth_token"));
        const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        
        const formData = new FormData();
        formData.append("file", imageFile);
        if (trimmed) {
          formData.append("prompt", trimmed); // Send user's typing together with file!
        }

        const response = await fetch(`${API_URL}/vision/analyze`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });

        if (!response.ok) throw new Error("Vision analysis failed");
        const data = await response.json();
        
        setIsThinking(false);
        const resultText = data.text || "No analysis was returned.";
        
        // 2. Premium SimStream Effect for instantaneous response consistency
        let currentText = "";
        const chunkSize = 4; // Characters per tick
        for (let i = 0; i < resultText.length; i += chunkSize) {
          currentText = resultText.slice(0, i + chunkSize);
          setStreamingMessage(currentText);
          await new Promise(resolve => setTimeout(resolve, 12)); // 12ms micro-burst
        }
        
        // Finalize message commit
        setStreamingMessage("");
        setMessages(prev => [...prev, { 
          role: "assistant", 
          text: resultText 
        }]);

      } catch (err) {
        console.error("Vision error:", err);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          text: `⚠️ Failed to process image: ${err.message || "Internal server error"}` 
        }]);
      } finally {
        setIsThinking(false);
        setLoading(false);
      }
      return;
    }

    const sidToUse = currentSid !== undefined ? currentSid : sessionId;
    const newMessages = overrideHistory
      ? [...overrideHistory, { role: "user", text: trimmed }]
      : [...messages, { role: "user", text: trimmed }];

    // Optimised: Slice history window to the last 10 messages to save token usage and prevent overhead
    const historyToUse = newMessages.slice(0, -1).slice(-10).map(m => ({
      role: m.role,
      text: m.text || m.content || ""
    }));

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setIsThinking(true);
    setStreamingMessage("");
    setSearchStatus(null);
    setSearchSources([]);
    setSearchImages([]);
    setSearchSuggestions([]);

    (async () => {
      try {
        let fullReply = "";
        let finalSources = [];
        let finalImages = [];

        if (webSearchEnabled) {
          await streamSearchMessage(
            trimmed,
            historyToUse,
            sidToUse,
            false,
            (chunk) => {
              setIsThinking(false);
              setStreamingMessage(prev => prev + chunk);
              fullReply += chunk;
            },
            (statusUpdate) => setSearchStatus(statusUpdate),
            (sources) => {
              finalSources = sources;
              setSearchSources(sources);
              setSearchStatus({ status: "generating", message: "Generating response" });
            },
            (images) => {
              finalImages = images;
              setSearchImages(images);
            },
            (suggestions) => setSearchSuggestions(suggestions),
            (sid) => { 
              if (!sidToUse) {
                setSessionId(sid);
                if (initialQuery.sessionId && onSessionIdUpdate) {
                  onSessionIdUpdate(initialQuery.sessionId, sid);
                }
              }
            }
          );
        } else {
          await streamMessage(trimmed, historyToUse, sidToUse, (chunk) => {
            setIsThinking(false);
            setStreamingMessage(prev => prev + chunk);
            fullReply += chunk;
          }, (sid) => {
            if (!sidToUse) {
              setSessionId(sid);
              if (initialQuery.sessionId && onSessionIdUpdate) {
                onSessionIdUpdate(initialQuery.sessionId, sid);
              }
            }
          });
        }

        setMessages(p => [...p, { 
          role: "assistant", 
          text: fullReply, 
          sources: finalSources, 
          images: finalImages,
          suggestions: searchSuggestions
        }]);
        setStreamingMessage("");
        setSearchStatus(null);
      } catch (err) {
        console.error("Streaming error:", err);
        const errorMsg = err.message || "Unknown error";
        setMessages(p => [...p, { 
          role: "assistant", 
          text: `⚠️ Error: ${errorMsg}` 
        }]);
        setSearchStatus(null);
      } finally {
        setLoading(false);
        setIsThinking(false);
      }
    })();
  }, [input, messages, loading, sessionId, auth, webSearchEnabled, searchSuggestions]);

  const handleRegenerate = useCallback(() => {
    if (loading || messages.length === 0) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    handleSend(lastUser.text, messages.slice(0, -1));
  }, [messages, loading, handleSend]);

  const handleVisionCapture = useCallback(async (file) => {
    if (!file || loading) return;

    // 1. Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // 2. Add user message with image
    setMessages(prev => [...prev, { role: "user", text: "Analyzing Photo...", images: [previewUrl] }]);
    setLoading(true);
    setIsThinking(true);

    try {
      const token = await (auth.isAuthenticated ? auth.getAccessToken() : localStorage.getItem("auth_token"));
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/vision/analyze`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error("Vision analysis failed");

      const data = await response.json();
      
      // 3. Add AI response
      setMessages(prev => [...prev, { role: "ai", text: data.text }]);
    } catch (err) {
      console.error("Vision Error:", err);
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't process that image. Please try again." }]);
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  }, [auth, loading]);

  useEffect(() => {
    if (initialQuery?.text && !initialQuery.isHistory && !initialSent.current) {
      initialSent.current = true;
      handleSend(initialQuery.text, [], null);
    }
  }, [initialQuery, handleSend]);

  useEffect(() => {
    const fetchSessionHistory = async () => {
      try {
        const { getChatMessages } = await import("../api/chatApi");
        const isHistory = initialQuery?.isHistory || false;
        const sid = initialQuery?.sessionId;
        if (!isHistory || !sid) return;

        const data = await getChatMessages(sid);
        setMessages(data.map(m => ({ 
          role: m.role, 
          text: m.content, 
          sources: m.metadata?.sources, 
          images: m.metadata?.images,
          suggestions: m.metadata?.suggestions
        })));
        setSessionId(sid);
      } catch (err) {
        console.error("[Chat] Failed to load history:", err);
      }
    };
    fetchSessionHistory();
  }, [initialQuery?.sessionId, initialQuery?.isHistory]);


  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className={`chat-container ${isEmpty ? "chat-container--empty" : ""}`}>
      {!isEmpty && (
        <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
          <div ref={topRef} />
          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              role={msg.role === "assistant" ? "ai" : msg.role}
              text={msg.text}
              sources={msg.sources}
              images={msg.images}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              isLast={idx === messages.length - 1}
              onOpenSources={setDrawerSources}
              suggestions={msg.suggestions}
              onSelectSuggestion={(text) => handleSend(text)}
              type={msg.type}
              loading={msg.loading}
              safety_data={msg.safety_data}
              url={msg.url}
            />
          ))}

          {(isThinking || (searchStatus && !streamingMessage)) && (
            <div className="chat-msg chat-msg--ai">
              <div className="chat-msg__avatar"><MydeenLogo size={32} /></div>
              <div className="chat-msg__bubble-wrapper--ai">
                <div className="chat-msg__bubble chat-msg__bubble--ai">
                  {searchStatus ? (
                    <div className="search-status-banner--inline premium-transition" style={{ marginLeft: '-4px' }}>
                      <span className="material-symbols-outlined search-status-icon pulse-icon">
                        {searchStatus.status === "searching" ? "travel_explore" : "language"}
                      </span>
                      <span className="search-status-text">{searchStatus.message}</span>
                    </div>
                  ) : (
                    <div className="thinking-text">
                      {isThinking ? "Thinking" : "Generating"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {streamingMessage && (
            <ChatMessage
              role="ai"
              text={streamingMessage}
              sources={searchSources}
              images={searchImages}
              isStreaming={true}
              isLast={true}
              onSelectSuggestion={(text) => handleSend(text)}
            />
          )}

          {retryState && (
            <RetryBanner
              attempt={retryState.attempt}
              totalRetries={retryState.total}
              secondsLeft={retryState.secondsLeft}
            />
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {isEmpty && (
        <div className="chat-empty">
          <div className="sarvam-logo-wrapper"><MydeenLogo size={64} /></div>
          <Suggestions userName={auth.user?.name || "Mydeen"} onSelect={(text) => handleSend(text)} />
        </div>
      )}

      <SmartSearchBar 
        value={input}
        inputRef={inputRef}
        onSubmit={(text, attachment) => handleSend(text, undefined, undefined, attachment)}
        onPlusClick={onPlusClick}
        isProcessing={loading || isProcessing}
        isMenuOpen={isPlusMenuOpen}
        webSearchEnabled={webSearchEnabled}
        onToggleWebSearch={() => setWebSearchEnabled(v => !v)}
        showChips={false} 
        showTypewriter={false}
        onVoiceClick={onVoiceClick}
        onVisionCapture={handleVisionCapture}
        pendingAttachment={pendingAttachment}
        setPendingAttachment={setPendingAttachment}
      />


      {(drawerSources || isDrawerClosing) && (
        <>
          <div className={`bottom-drawer-overlay ${isDrawerClosing ? 'closing' : ''}`} onClick={closeDrawer} />
          <div className={`bottom-drawer ${isDrawerClosing ? 'closing' : ''}`}>
            <div className="bottom-drawer-header">
              <h3 className="bottom-drawer-title">Sources</h3>
              <button className="bottom-drawer-close" onClick={closeDrawer}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="drawer-sources-list">
              {drawerSources && drawerSources.length > 0 && (
                <>
                  <a href={drawerSources[0].url} target="_blank" rel="noopener noreferrer" className="drawer-source-item drawer-source-item--featured">
                    <div className="drawer-source-header">
                      <div className="drawer-source-icon"><img src={getFavicon(drawerSources[0].url)} alt="" onError={e => { e.target.style.display='none'; }} /></div>
                      <span className="drawer-source-site-name">{getSiteName(drawerSources[0].url, drawerSources[0].title, drawerSources[0].source)}</span>
                    </div>
                    <div className="drawer-source-info">
                      <span className="drawer-source-name">{drawerSources[0].title || drawerSources[0].url}</span>
                      {drawerSources[0].snippet && <p className="drawer-source-snippet">{drawerSources[0].snippet}</p>}
                    </div>
                  </a>
                  {drawerSources.length > 1 && (
                    <>
                      <div className="drawer-section-divider"></div>
                      <h4 className="drawer-section-title">More</h4>
                      {drawerSources.slice(1).map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="drawer-source-item">
                          <div className="drawer-source-header">
                            <div className="drawer-source-icon"><img src={getFavicon(s.url)} alt="" onError={e => { e.target.style.display='none'; }} /></div>
                            <span className="drawer-source-site-name">{getSiteName(s.url, s.title, s.source)}</span>
                          </div>
                          <div className="drawer-source-info">
                            <span className="drawer-source-name">{s.title || s.url}</span>
                            {s.snippet && <p className="drawer-source-snippet">{s.snippet}</p>}
                          </div>
                        </a>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showScrollBtn && (
        <button 
          type="button"
          className="chat-scroll-btn" 
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })} 
        >
          <span className="material-symbols-outlined">arrow_downward</span>
        </button>
      )}
    </div>
  );
}
