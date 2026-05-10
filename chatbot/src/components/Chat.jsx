import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { streamMessage, streamSearchMessage } from "../api/chatApi";
import { useAuth } from "../context/AuthContext";

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

function ChatMessage({ role, text, sources, onEdit, onRegenerate, isLast, isStreaming, onOpenSources }) {
  const [shared, setShared] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isUser = role === 'user';

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
    <div className={`chat-msg ${isUser ? "chat-msg--user" : "chat-msg--ai"}`}>
      {!isUser && (
        <div className="chat-msg__avatar" aria-hidden="true">
          <MydeenLogo size={32} />
        </div>
      )}
      {isUser ? (
        <div className="chat-msg__user-container">
          <div className="chat-msg__bubble chat-msg__bubble--user">
            <div className="chat-msg__text">{text}</div>
          </div>
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
        </div>
      ) : (
        <div className="chat-msg__bubble-wrapper--ai">
          <div className="chat-msg__bubble chat-msg__bubble--ai">
            <div className="markdown-content">
              <ReactMarkdown>{text}</ReactMarkdown>
              {isStreaming && <span className="streaming-cursor" />}
              
              {/* Inline Citation Pill inside bubble (ChatGPT style) */}
              {!isStreaming && sources && sources.length > 0 && (
                <div className="inline-citation-pill" title="View Sources">
                  {getSiteName(sources[0].url, sources[0].title, sources[0].source)}
                  {sources.length > 1 && <span className="inline-citation-pill__more">+{sources.length - 1}</span>}
                </div>
              )}
            </div>
          </div>
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
              style={{ color: feedback === 'like' ? '#10b981' : 'inherit' }}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: feedback === 'like' ? "'FILL' 1" : "none" }}>thumb_up</span>
            </button>
            <button 
              type="button" 
              className={`chat-msg__action-btn ${feedback === 'dislike' ? "chat-msg__action-btn--active" : ""}`} 
              onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
              title="Bad response"
              style={{ color: feedback === 'dislike' ? '#ef4444' : 'inherit' }}
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

            {!isUser && isLast && (
              <button type="button" className="chat-msg__action-btn" onClick={onRegenerate} title="Regenerate">
                <span className="material-symbols-outlined">cached</span>
              </button>
            )}
            
            {/* ChatGPT-style Action Bar Sources Button */}
            {!isStreaming && sources && sources.length > 0 && (
              <>
                <div className="chat-msg__actions-spacer" style={{ flex: 1 }}></div>
                <SourcesBar sources={sources} onOpenSources={onOpenSources} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Chat Component ───────────────────────────────────────────── */

/* Retry delay schedule mirrors backend RETRY_DELAYS = [10, 20, 30, 45] */
const RETRY_DELAYS = [10, 20, 30, 45];

export default function Chat({ 
  initialQuery = { text: "", isHistory: false, sessionId: null },
  onPlusClick,
  isPlusMenuOpen,
  isProcessing
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
  // ── Web Search State ────────────────────────────────────────────────────
  const [webSearchEnabled, setWebSearchEnabled] = useState(true); // ON by default
  const [searchStatus, setSearchStatus]         = useState(null);
  const [searchSources, setSearchSources]       = useState([]);
  
  // ── Drawer State ──
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
  const isHistoryLoad  = useRef(false);
  const inputRef       = useRef(null);
  const initialSent    = useRef(false);
  const countdownTimer = useRef(null);

  /* Auto-scroll during streaming or loading */
  useEffect(() => {
    if (loading || streamingMessage) {
      const scrollContainer = chatMessagesRef.current;
      if (scrollContainer) {
        // Use a slight delay to ensure the DOM has rendered the new content
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

  /* ── Mobile Keyboard Handling (Visual Viewport) ── */
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      const scrollContainer = chatMessagesRef.current;
      if (scrollContainer) {
        // Adjust padding to account for keyboard
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const keyboardHeight = windowHeight - viewportHeight;
        
        if (keyboardHeight > 100) {
          scrollContainer.style.paddingBottom = `${keyboardHeight + 80}px`;
          // Force scroll to bottom when keyboard opens
          setTimeout(() => {
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
          }, 100);
        } else {
          scrollContainer.style.paddingBottom = "160px"; // Default padding
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

  /* Focus input */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Cleanup countdown */
  useEffect(() => () => clearInterval(countdownTimer.current), []);

  /** Start a visible countdown for `seconds`, then resolve when done. */
  const waitWithCountdown = (attempt, totalRetries, seconds) =>
    new Promise((resolve) => {
      setRetryState({ attempt, total: totalRetries, secondsLeft: seconds });
      let remaining = seconds;
      countdownTimer.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownTimer.current);
          setRetryState(null);
          resolve();
        } else {
          setRetryState({ attempt, total: totalRetries, secondsLeft: remaining });
        }
      }, 1000);
    });

  const handleEdit = useCallback((textToEdit) => {
    setInput(textToEdit);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (text, overrideHistory, currentSid) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const sidToUse = currentSid !== undefined ? currentSid : sessionId;

    const newMessages = overrideHistory
      ? [...overrideHistory, { role: "user", text: trimmed }]
      : [...messages, { role: "user", text: trimmed }];

    const historyToUse = newMessages.slice(0, -1).map(m => ({
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

    (async () => {
      try {
        let fullReply = "";
        let finalSources = [];

        if (webSearchEnabled) {
          // ── Use live web search endpoint ──────────────────────────
          await streamSearchMessage(
            trimmed,
            historyToUse,
            sidToUse,
            false, // auto-detect (not forced)
            (chunk) => {
              setIsThinking(false);
              setStreamingMessage(prev => prev + chunk);
              fullReply += chunk;
            },
            (statusUpdate) => {
              setSearchStatus(statusUpdate);
            },
            (sources) => {
              finalSources = sources;
              setSearchSources(sources);
              setSearchStatus({ status: "generating", message: "Generating response..." });
            },
            (sid) => {
              if (!sidToUse) setSessionId(sid);
            }
          );
        } else {
          // ── Standard streaming endpoint ────────────────────────────
          await streamMessage(trimmed, historyToUse, sidToUse, (chunk) => {
            setIsThinking(false);
            setStreamingMessage(prev => prev + chunk);
            fullReply += chunk;
          }, (sid) => {
            if (!sidToUse) setSessionId(sid);
          });
        }

        setMessages(p => [...p, { role: "assistant", text: fullReply, sources: finalSources }]);
        setStreamingMessage("");
        setSearchStatus(null);
      } catch (err) {
        console.error("Streaming error:", err);
        const errorMsg = err.message || "Unknown error";
        setMessages(p => [...p, { 
          role: "assistant", 
          text: `⚠️ Error: ${errorMsg}\n\n(Please check if your backend is running and API key is valid)` 
        }]);
        setSearchStatus(null);
      } finally {
        setLoading(false);
        setIsThinking(false);
      }
    })();
  }, [input, messages, loading, sessionId]);

  const handleRegenerate = useCallback(() => {
    if (loading || messages.length === 0) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    handleSend(lastUser.text, messages.slice(0, -1));
  }, [messages, loading, handleSend]);


  useEffect(() => {
    if (initialQuery?.text && !initialQuery.isHistory && !initialSent.current) {
      initialSent.current = true;
      handleSend(initialQuery.text, [], null);
    }
  }, [initialQuery, handleSend]);

  /* Fetch specific session history if requested */
  useEffect(() => {
    const fetchSessionHistory = async () => {
      try {
        const { getAccessToken, isAuthenticated, isLoading: authLoading } = auth;
        if (authLoading) return;

        const isHistory = initialQuery?.isHistory || false;
        const queryText = initialQuery?.text || "";
        const sid = initialQuery?.sessionId;

        if (!isHistory) {
          return;
        }

        if (!sid) return;

        const token = await (isAuthenticated ? getAccessToken() : localStorage.getItem("auth_token"));
        if (!token) return;

        const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${API_URL}/history/${sid}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data.map(m => ({ role: m.role, text: m.content, sources: m.sources })));
          setSessionId(sid);
        }
      } catch (err) {
        console.error("[Chat] Failed to load history:", err);
      }
    };
    fetchSessionHistory();
  }, [auth.isAuthenticated, auth.isLoading, initialQuery?.sessionId, initialQuery?.text, initialQuery?.isHistory]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

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
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              isLast={idx === messages.length - 1}
              onOpenSources={setDrawerSources}
            />
          ))}

          {(isThinking || (searchStatus && !streamingMessage)) && (
            <div className="chat-msg chat-msg--ai">
              <div className="chat-msg__avatar">
                <MydeenLogo size={32} />
              </div>
              <div className="chat-msg__bubble-wrapper--ai">
                <div className="chat-msg__bubble chat-msg__bubble--ai">
                  {/* Exclusive logic: Show Wave OR Search Status, but not both */}
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
                      <div className="thinking-wave">
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                      </div>
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
              isStreaming={true}
              isLast={true}
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
          <MydeenLogo size={64} />
          <p>Ask me anything — I&apos;m ready to help you study!</p>
        </div>
      )}

      <footer className="new-search-container">
        <form
          className="new-search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="new-search-input-wrap">
            <input
              ref={inputRef}
              className="new-search-input"
              type="text"
              placeholder={isListening ? "Listening..." : "Ask Mydeen..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isProcessing}
            />
          </div>

          <div className="new-search-actions">
            <button 
              type="button" 
              aria-label="Add attachment" 
              className={`new-search-btn-add ${isProcessing ? "new-search-btn-add--loading" : ""} ${isPlusMenuOpen ? "new-search-btn-add--active" : ""}`}
              onClick={onPlusClick}
              disabled={isProcessing}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {isProcessing ? "sync" : isPlusMenuOpen ? "close" : "add"}
              </span>
            </button>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* Web Search Toggle */}
              <button
                type="button"
                aria-label={webSearchEnabled ? "Web search on" : "Web search off"}
                title={webSearchEnabled ? "Live web search ON — click to disable" : "Live web search OFF — click to enable"}
                className={`new-search-btn-mic web-search-toggle ${webSearchEnabled ? "web-search-toggle--on" : ""}`}
                onClick={() => setWebSearchEnabled(v => !v)}
                disabled={loading}
                style={{ width: '32px', height: '32px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {webSearchEnabled ? "travel_explore" : "language"}
                </span>
              </button>

              <button
                type="button"
                aria-label="Voice input"
                className={`new-search-btn-mic ${isListening ? "new-search-btn-mic--active" : ""}`}
                onClick={startListening}
                disabled={loading || isProcessing}
                style={{ width: '32px', height: '32px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{isListening ? "graphic_eq" : "mic"}</span>
              </button>

              {(input.trim() || isListening) && (
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={loading || isProcessing}
                  style={{ 
                    position: 'static', 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    marginLeft: '4px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_upward</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </footer>



      {/* Sources Drawer */}
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
                  {/* Featured first source */}
                  <a href={drawerSources[0].url} target="_blank" rel="noopener noreferrer" className="drawer-source-item drawer-source-item--featured">
                    <div className="drawer-source-header">
                      <div className="drawer-source-icon">
                        <img src={getFavicon(drawerSources[0].url)} alt="" onError={e => { e.target.style.display='none'; }} />
                      </div>
                      <span className="drawer-source-site-name">{getSiteName(drawerSources[0].url, drawerSources[0].title, drawerSources[0].source)}</span>
                    </div>
                    <div className="drawer-source-info">
                      <span className="drawer-source-name">{drawerSources[0].title || drawerSources[0].url}</span>
                      {drawerSources[0].snippet && (
                        <p className="drawer-source-snippet">{drawerSources[0].snippet}</p>
                      )}
                    </div>
                  </a>

                  {/* Other sources */}
                  {drawerSources.length > 1 && (
                    <>
                      <div className="drawer-section-divider"></div>
                      <h4 className="drawer-section-title">More</h4>
                      {drawerSources.slice(1).map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="drawer-source-item">
                          <div className="drawer-source-header">
                            <div className="drawer-source-icon">
                              <img src={getFavicon(s.url)} alt="" onError={e => { e.target.style.display='none'; }} />
                            </div>
                            <span className="drawer-source-site-name">{getSiteName(s.url, s.title, s.source)}</span>
                          </div>
                          <div className="drawer-source-info">
                            <span className="drawer-source-name">{s.title || s.url}</span>
                            {s.snippet && (
                              <p className="drawer-source-snippet">{s.snippet}</p>
                            )}
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
          aria-label="Scroll to bottom"
        >
          <span className="material-symbols-outlined">arrow_downward</span>
        </button>
      )}
    </div>
  );
}
