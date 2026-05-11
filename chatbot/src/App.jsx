import { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
import TopBar      from "./components/TopBar";
import Sidebar     from "./components/Sidebar";
import SearchBar   from "./components/SearchBar";
import ActionPills from "./components/ActionPills";
import Chat        from "./components/Chat";
import LoginPage   from "./components/LoginPage";
import MemoriesPage from "./components/MemoriesPage";
import SettingsPage from "./components/SettingsPage";
import AboutPage from "./components/AboutPage";
import ProfilePage from "./components/ProfilePage";
import SmartSearchBar from "./components/SmartSearchBar";
import VoiceAssistant from "./components/VoiceAssistant";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { VIEW }    from "./constants";
import { useTheme } from "./context/ThemeContext";
import { useAuth }  from "./context/AuthContext";

function MydeenLogo() {
  return (
    <svg fill="none" height="72" viewBox="0 0 100 100" width="72" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b"></stop>
          <stop offset="30%" stopColor="#ef4444"></stop>
          <stop offset="70%" stopColor="#4f46e5"></stop>
          <stop offset="100%" stopColor="#3b82f6"></stop>
        </linearGradient>
      </defs>
      <path d="M50 40L60 50L50 60L40 50Z" fill="url(#logo-grad)" opacity="0.8"></path>
      <path d="M50 15C52 25 58 32 68 34C58 36 52 43 50 53C48 43 42 36 32 34C42 32 48 25 50 15Z" fill="none" stroke="url(#logo-grad)" strokeWidth="2"></path>
      <path d="M75 25C70 32 68 42 75 50C68 58 70 68 75 75C68 70 58 68 50 75C42 68 32 70 25 75C30 68 32 58 25 50C32 42 30 32 25 25C30 32 40 34 50 25C60 34 70 32 75 25Z" fill="none" stroke="url(#logo-grad)" strokeWidth="2"></path>
      <circle cx="50" cy="50" fill="none" opacity="0.6" r="30" stroke="url(#logo-grad)" strokeWidth="1.5"></circle>
      <circle cx="50" cy="50" fill="none" opacity="0.3" r="40" stroke="url(#logo-grad)" strokeWidth="1"></circle>
    </svg>
  );
}

function NewHome({ onNavigate, onGoToChat }) {
  const { user: supaUser } = useAuth();
  const displayName = supaUser?.user_metadata?.full_name 
                   || supaUser?.user_metadata?.name 
                   || localStorage.getItem("user_name") 
                   || "";
  const firstName = displayName.split(" ")[0];
  const greetingName = firstName ? ` ${firstName}` : "";

  const ALL_TRENDS = [
    { emoji: "🏛️", label: "Tamil Nadu political updates" },
    { emoji: "🏏", label: "CSK next match schedule & tickets" },
    { emoji: "🍛", label: "Best traditional food in Madurai" },
    { emoji: "🌦️", label: "Monsoon alerts in Chennai" },
    { emoji: "🎬", label: "Kollywood blockbuster news" },
    { emoji: "🏖️", label: "Marina Beach weekend events" },
    { emoji: "🚄", label: "Vande Bharat routes in Tamil Nadu" },
    { emoji: "📚", label: "TNPSC exam preparation tips" },
    { emoji: "📱", label: "Best tech stores in Chennai" },
    { emoji: "🏭", label: "New industrial parks in Hosur" },
    { emoji: "🕉️", label: "Temple festivals this month" },
    { emoji: "🏝️", label: "Rameswaram travel guide" },
  ];

  const getRandomTrends = () => {
    const shuffled = [...ALL_TRENDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const [suggestions, setSuggestions] = useState(getRandomTrends);

  useEffect(() => {
    // Change trends every 5 minutes (300000 ms)
    const interval = setInterval(() => {
      setSuggestions(getRandomTrends());
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="new-home">
      <div className="new-home__logo">
        <MydeenLogo />
      </div>

      <div className="new-home__greeting">
        <p className="new-home__hey">Hey there{greetingName}!</p>
        <h2 className="new-home__mind">What's on your mind?</h2>
      </div>

      <div className="new-home__chips">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="new-home__chip"
            onClick={() => onGoToChat(s.label)}
          >
            <span className="new-home__chip-emoji">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

function SafetyAnalysisPage({ url, onComplete, results, apiUrl }) {
  const { getAccessToken, isAuthenticated } = useAuth();

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing scanner...");
  const [data, setData] = useState(results);

  useEffect(() => {
    if (data) return; // Don't run if we already have results

    const runAnalysis = async () => {
      // Step-by-step progress simulation like in the user's project
      const steps = [
        { p: 20, t: "🔍 Analyzing URL patterns..." },
        { p: 40, t: "📅 Checking domain age and registration..." },
        { p: 60, t: "🔒 Validating SSL certificate..." },
        { p: 80, t: "📝 Analyzing webpage content..." },
      ];

      for (const step of steps) {
        setStatusText(step.t);
        setProgress(step.p);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Heartbeat: Slowly creep progress while waiting for backend
      const heartbeat = setInterval(() => {
        setProgress(prev => (prev < 95 ? prev + 0.5 : prev));
      }, 500);

      try {
        const currentToken = isAuthenticated ? await getAccessToken() : localStorage.getItem("auth_token");
        const response = await fetch(`${apiUrl}/detect_deceptive`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify({ url }),
        });


        
        clearInterval(heartbeat);
        
        const result = await response.json();
        if (response.ok) {
          setProgress(100);
          setStatusText("✅ Final Verdict Ready");
          setTimeout(() => {
            setData(result);
            onComplete(result);
          }, 800);
        } else {
          throw new Error(result.detail || "Server error");
        }
      } catch (err) {
        clearInterval(heartbeat);
        console.error("Safety Analysis Error:", err);
        alert(`Safety Check failed: ${err.message}`);
        if (err.message.toLowerCase().includes("session expired") || err.message.toLowerCase().includes("unauthorized")) {
          // Find the logout function from the parent context or reload
          localStorage.removeItem("auth_token");
          window.location.reload();
        }
      }
    };

    runAnalysis();
  }, [url]);

  if (!data) {
    return (
      <div className="safety-analysis-page">
        <div className="scanner-visual">
          <div className="scanner-ring"></div>
          <div className="scanner-progress" style={{ transform: `rotate(${(progress * 3.6) - 45}deg)` }}></div>
          <div className="scanner-icon">
            <span className="material-symbols-outlined spinning">shield</span>
          </div>
        </div>
        <h2 className="premium-modal__title">Security Analysis In Progress</h2>
        <p className="premium-modal__text">Scanning: {url}</p>
        <div className="options-search-box" style={{ marginTop: '24px', width: '100%', maxWidth: '400px' }}>
          <span className="material-symbols-outlined">network_check</span>
          <span className="option-search-input">{statusText}</span>
        </div>
      </div>
    );
  }

  const score = data.risk_score;
  const isDanger = score >= 70;
  const isWarning = score >= 45;
  const scoreClass = isDanger ? 'score-high' : isWarning ? 'score-medium' : 'score-low';

  return (
    <div className="safety-analysis-page" style={{ justifyContent: 'flex-start' }}>
      <div className="safety-report-card">
        <div className="safety-report-header">
          <div className={`safety-score-circle ${scoreClass}`}>
            {score}
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="safety-report-title">{data.risk_category}</h1>
            <p className="safety-report-url">{data.url}</p>
          </div>
        </div>

        <div className="safety-advice-box">
          <div className="safety-advice-title">
            <span className="material-symbols-outlined">psychology</span>
            AI Final Verdict
          </div>
          <p className="safety-advice-text">{data.ai_advice}</p>
        </div>

        <h3 className="drawer-section-title">Technical Findings</h3>
        <div className="safety-issues-list">
          {data.all_issues.length > 0 ? (
            data.all_issues.map((issue, i) => (
              <div key={i} className="safety-issue-item">
                <span className="material-symbols-outlined safety-issue-icon">
                  {isDanger ? 'gpp_bad' : 'warning'}
                </span>
                <span>{issue}</span>
              </div>
            ))
          ) : (
            <p className="safety-advice-text" style={{ opacity: 0.6 }}>No technical red flags found.</p>
          )}
        </div>

        <h3 className="drawer-section-title">Recommendations</h3>
        <div className="safety-issues-list">
          {data.recommendations.map((rec, i) => (
            <div key={i} className="safety-issue-item" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="material-symbols-outlined" style={{ color: '#10b981' }}>check_circle</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>

        <div className="premium-modal__actions" style={{ marginTop: '32px' }}>
          <button onClick={() => window.location.reload()} className="premium-modal__btn premium-modal__btn--confirm">
            Start New Scan
          </button>
        </div>
      </div>
    </div>
  );
}


function SplashScreen({ isVisible }) {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShouldRender(false), 800); // fade duration
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div className={`splash-screen ${!isVisible ? "splash-fade-out" : ""}`}>
      <div className="splash-logo-container">
        <MydeenLogo />
      </div>
    </div>
  );
}

export default function App() {
  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  // ── Auth via Supabase (falls back to legacy localStorage token) ──
  const { isAuthenticated, user, isLoading: authLoading, logout: supaLogout, getAccessToken } = useAuth();
  // Also allow legacy token-only flow (username/password backend)
  const [legacyAuth, setLegacyAuth] = useState(
    () => !!localStorage.getItem("auth_token")
  );
  const effectiveAuth = isAuthenticated || legacyAuth;

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Show splash for 2 seconds
    return () => clearTimeout(timer);
  }, []);

  const [view, setView]                   = useState(VIEW.HOME);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatActive, setIsChatActive]   = useState(false);
  const [initialQuery, setInitialQuery]   = useState({ text: "", isHistory: false });
  const [language, setLanguage]           = useState(() => localStorage.getItem("user_language") || "English");
  const [deleteTargetSid, setDeleteTargetSid] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  
  const [history, setHistory]             = useState(() => {
    const saved = localStorage.getItem("chat_history");
    return saved ? JSON.parse(saved) : [];
  });

  /* ── Mobile Back Button Handling (History API) ── */
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) {
        const { view: stateView, isChatActive: stateChatActive, initialQuery: stateQuery } = event.state;
        setView(stateView);
        setIsChatActive(stateChatActive);
        setInitialQuery(stateQuery || { text: "", isHistory: false });
      } else {
        // Default to home if no state
        setView(VIEW.HOME);
        setIsChatActive(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    
    // Initial state
    window.history.replaceState({ view: VIEW.RECENT, icon: "history", label: "Recent" }, "");

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* Listen for 401 logout events from axios interceptor (legacy flow) */
  useEffect(() => {
    const handleLogout = () => setLegacyAuth(false);
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isPlusMenuClosing, setIsPlusMenuClosing] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [safetyTargetUrl, setSafetyTargetUrl] = useState("");
  const [safetyResult, setSafetyResult] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Fetch history from Database ── */
  useEffect(() => {
    if (effectiveAuth) {
      const loadHistory = async () => {
        try {
          const token = await (isAuthenticated ? getAccessToken() : localStorage.getItem("auth_token"));
          if (!token) {
            console.warn("No auth token available for history fetch");
            return;
          }

          const response = await fetch(`${API_URL}/history`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Fetched ${data.length} history items from DB`);
            
            setHistory(data.map(item => ({
              id: item.session_id,   // use session_id as the unique key
              query: item.query,
              date: new Date(item.created_at).toLocaleDateString(),
              sid: item.session_id,  // pass session_id for fetching messages
              archived: item.archived || false
            })));
          } else {
            console.error("History fetch failed:", response.status, await response.text());
          }
        } catch (err) {
          console.error("Failed to fetch history:", err);
        }
      };
      loadHistory();
    }
  }, [effectiveAuth, isAuthenticated]);

  // Close menu when clicking anywhere else
  useEffect(() => {
    const handleGlobalClick = () => {
      setIsPlusMenuOpen(false);
    };
    if (isPlusMenuOpen) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [isPlusMenuOpen]);

  const closePlusMenu = () => {
    setIsPlusMenuClosing(true);
    setTimeout(() => {
      setIsPlusMenuOpen(false);
      setIsPlusMenuClosing(false);
    }, 300);
  };

  const handlePlusClick = (e) => {
    e?.stopPropagation();
    if (isPlusMenuOpen) {
      closePlusMenu();
    } else {
      setIsPlusMenuOpen(true);
    }
  };

  const triggerOCR = (e) => {
    e?.stopPropagation();
    closePlusMenu();
    fileInputRef.current?.click();
  };

  const triggerUrlModal = (e) => {
    e?.stopPropagation();
    closePlusMenu();
    setIsUrlModalOpen(true);
  };

  const pdfInputRef = useRef(null);
  const triggerPdfUpload = (e) => {
    e?.stopPropagation();
    closePlusMenu();
    pdfInputRef.current?.click();
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetch(`${API_URL}/upload-pdf`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        const pdfText = data.text;
        // Automatically start chat with the PDF context
        goToChat(`I have uploaded a PDF: ${file.name}. \n\nHere is the content extracted from the PDF:\n\n${pdfText}\n\nPlease summarize this PDF and explain its main points.`);
      } else {
        alert("Failed to extract PDF content. Please try again.");
      }
    } catch (err) {
      console.error("PDF Upload error:", err);
      alert("Error uploading PDF.");
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const triggerSafetyModal = (e) => {
    e?.stopPropagation();
    closePlusMenu();
    setIsSafetyModalOpen(true);
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsProcessing(true);
    setIsUrlModalOpen(false);
    
    try {
      const response = await fetch(`${API_URL}/scrape`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${isAuthenticated ? await getAccessToken() : localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      
      const data = await response.json();
      if (response.ok) {
        const query = `I've shared a link: ${urlInput.trim()}\n\nHere is the content from the page. Please summarize the key points clearly:\n\n${data.text}`;
        goToChat(query);
      } else {
        alert(data.detail || "Failed to read that link. Try another one!");
      }

    } catch (err) {
      console.error("Scrape Error:", err);
      alert("Error connecting to reader. Please try again.");
    } finally {
      setIsProcessing(false);
      setUrlInput("");
    }
  };

  const handleSafetySubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setSafetyTargetUrl(urlInput.trim());
    setSafetyResult(null);
    setIsSafetyModalOpen(false);
    navigate(VIEW.SAFETY_ANALYSIS);
    setUrlInput("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      alert("Please upload an image (PNG, JPG) or a PDF file.");
      return;
    }

    setIsProcessing(true);
    try {
      if (isPDF) {
        // Handle PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        // Extract text from the first 5 pages to avoid token limits
        const maxPages = Math.min(pdf.numPages, 5);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
        }
        
        if (fullText.trim()) {
          const query = `I have uploaded a PDF document titled '${file.name}'. Here are the notes from it. Can you explain the main concepts clearly?\n\n${fullText.trim()}`;
          goToChat(query);
        } else {
          alert("Couldn't extract text from this PDF. It might be scanned or image-based.");
        }
      } else {
        // Handle Image via OCR
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        if (text.trim()) {
          const query = `I have some notes from an image. Can you explain this clearly?\n\n${text.trim()}`;
          goToChat(query);
        } else {
          alert("Couldn't find any text in that image. Try a clearer photo!");
        }
      }
    } catch (err) {
      console.error("File processing error:", err);
      alert("Error reading file. Please try again.");
    } finally {
      setIsProcessing(false);
      e.target.value = ""; // Reset input
    }
  };

  const logout = async () => {
    await supaLogout();          // clears Supabase session + localStorage token
    setLegacyAuth(false);
  };

  const handleRenameChat = async (sid, newTitle) => {
    try {
      const { renameChat } = await import("./api/chatApi");
      await renameChat(sid, newTitle);
      setHistory(prev => prev.map(item => item.sid === sid ? { ...item, query: newTitle } : item));
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const requestDeleteChat = (sid) => {
    setDeleteTargetSid(sid);
  };

  const confirmDeleteChat = async () => {
    const sid = deleteTargetSid;
    setDeleteTargetSid(null);
    if (!sid) return;

    try {
      const { deleteChat } = await import("./api/chatApi");
      await deleteChat(sid);
      setHistory(prev => prev.filter(item => item.sid !== sid));
      if (initialQuery.sessionId === sid) {
        setIsChatActive(false);
        setInitialQuery({ text: "", isHistory: false, sessionId: null });
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const cancelDeleteChat = () => {
    setDeleteTargetSid(null);
  };

  const handleArchiveChat = async (sid, archived) => {
    try {
      const { archiveChat } = await import("./api/chatApi");
      await archiveChat(sid, archived);
      setHistory(prev => prev.map(item => item.sid === sid ? { ...item, archived } : item));
    } catch (err) {
      console.error("Archive failed:", err);
    }
  };

  /* ── Full-screen loading spinner while Supabase hydrates session ── */
  if (authLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-background)', zIndex: 9999,
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap');
          :root { --color-brand-blue: #3b82f6; --font-main: 'Inter', sans-serif; }
          body { font-family: var(--font-main) !important; }
        `}</style>
        <span className="material-symbols-outlined" style={{
          fontSize: 48, color: 'var(--color-brand-blue)',
          animation: 'spin 1s linear infinite',
        }}>progress_activity</span>
      </div>
    );
  }

  if (!effectiveAuth) {
    return <LoginPage onLogin={() => setLegacyAuth(true)} />;
  }

  /** Navigate to a view, closing sidebar */
  const navigate = (target) => {
    setView(target);
    setIsSidebarOpen(false);
    
    // Update Browser History
    window.history.pushState({ view: target, isChatActive, initialQuery }, "");
  };

  /** Go to chat, optionally with a pre-filled query */
  const goToChat = (queryText, isHistory = false, sid = null) => {
    const query = { text: queryText, isHistory, sessionId: sid };
    setInitialQuery(query);
    setView(VIEW.HOME);
    setIsChatActive(true);
    setIsSidebarOpen(false);
    
    // Update Browser History
    window.history.pushState({ view: VIEW.HOME, isChatActive: true, initialQuery: query }, "");
    
    if (queryText && !isHistory) {
      // Optimistically add to sidebar while backend saves it
      const newSid = `sess_${Math.floor(Date.now() / 1000)}`;
      const entry  = { id: newSid, query: queryText.trim(), date: new Date().toLocaleDateString(), sid: newSid };
      setHistory(prev => [entry, ...prev.slice(0, 19)]);
    }
  };

  const userProfile = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
    avatar: user?.user_metadata?.avatar_url || null
  };

  return (
    <>
      <SplashScreen isVisible={showSplash} />
      <div className="app-viewport">
        {/* ── Sidebar & Header ── */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={(v, q, isHistory, sid) => {
          if (v === 'NEW_CHAT') {
            setIsChatActive(false);
            setInitialQuery({ text: "", isHistory: false, sessionId: null });
            setView(VIEW.HOME);
            return;
          }
          if (q !== undefined) {
            goToChat(q, isHistory, sid);
          } else {
            navigate(v);
          }
        }}
        currentView={view}
        history={history}
        activeSessionId={initialQuery.sessionId}
        onRename={handleRenameChat}
        onDelete={requestDeleteChat}
        onArchive={handleArchiveChat}
        userProfile={userProfile}
      />
      <TopBar
        showMenu={view === VIEW.HOME || view === VIEW.HISTORY || view === VIEW.SAFETY_ANALYSIS}
        onLogoClick={() => {
          setView(VIEW.HOME);
        }}
        onMenuClick={() => setIsSidebarOpen(true)}
        onProfileClick={() => navigate(VIEW.SETTINGS)}
        onBack={() => {
          navigate(VIEW.HOME);
        }}
        showBack={view !== VIEW.HOME}
      />

      {/* ── Pages ── */}
      {view === VIEW.HOME && (
        <div className="home-layout-wrapper page-transition">
          {isChatActive ? (
            <Chat 
              initialQuery={initialQuery} 
              onPlusClick={handlePlusClick}
              isPlusMenuOpen={isPlusMenuOpen}
              isProcessing={isProcessing}
              language={language}
              onVoiceClick={() => setShowVoice(true)}
            />
          ) : (
            <>
              <NewHome onNavigate={navigate} onGoToChat={goToChat} />
              
              <SmartSearchBar 
                onSubmit={goToChat} 
                onPlusClick={handlePlusClick}
                isProcessing={isProcessing}
                isMenuOpen={isPlusMenuOpen}
                onVoiceClick={() => setShowVoice(true)}
              />
            </>
          )}

          {/* Options Drawer (Perplexity Style) */}
          {(isPlusMenuOpen || isPlusMenuClosing) && (
            <>
              <div className={`bottom-drawer-overlay ${isPlusMenuClosing ? 'closing' : ''}`} onClick={handlePlusClick} />
              <div className={`bottom-drawer ${isPlusMenuClosing ? 'closing' : ''}`}>
                <div className="bottom-drawer-header">
                  <h3 className="bottom-drawer-title">Options</h3>
                  <button className="bottom-drawer-close" onClick={handlePlusClick}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                  </button>
                </div>

                <div className="options-grid">
                  <div className="option-item" onClick={triggerOCR}>
                    <span className="material-symbols-outlined option-icon">center_focus_strong</span>
                    <span className="option-label">OCR Scan</span>
                  </div>
                  <div className="option-item" onClick={triggerOCR}>
                    <span className="material-symbols-outlined option-icon">photo_camera</span>
                    <span className="option-label">Camera</span>
                  </div>
                  <div className="option-item" onClick={triggerSafetyModal}>
                    <span className="material-symbols-outlined option-icon">shield</span>
                    <span className="option-label">Safety</span>
                  </div>
                  <div className="option-item" onClick={triggerUrlModal}>
                    <span className="material-symbols-outlined option-icon">link</span>
                    <span className="option-label">Web link</span>
                  </div>
                  <div className="option-item" onClick={triggerPdfUpload}>
                    <span className="material-symbols-outlined option-icon">picture_as_pdf</span>
                    <span className="option-label">PDF</span>
                  </div>
                </div>

                <div className="option-search-box">
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '20px' }}>search</span>
                  <input type="text" className="option-search-input" placeholder="Search files or web..." />
                  <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '20px' }}>check</span>
                </div>

              </div>
            </>
          )}

          {isUrlModalOpen && (
            <div className="url-modal-overlay" onClick={() => setIsUrlModalOpen(false)}>
              <div className="url-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-brand-blue)', fontSize: '28px' }}>link</span>
                  <h3 className="url-modal__title">Analyze Web Link</h3>
                </div>
                <p className="url-modal__text">Paste a URL below to summarize its content or check for security risks.</p>
                <form onSubmit={handleUrlSubmit}>
                  <input 
                    className="url-modal__input"
                    type="url" 
                    placeholder="https://example.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    autoFocus
                  />
                  <div className="url-modal__actions">
                    <button type="button" className="url-modal__btn url-modal__btn--cancel" onClick={() => setIsUrlModalOpen(false)}>Cancel</button>
                    <button type="submit" className="url-modal__btn url-modal__btn--submit">Analyze Content</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isSafetyModalOpen && (
            <div className="url-modal-overlay" onClick={() => setIsSafetyModalOpen(false)}>
              <div className="url-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '28px' }}>shield_with_heart</span>
                  <h3 className="url-modal__title">Check Website Safety</h3>
                </div>
                <p className="url-modal__text">Enter a URL to perform a deep security scan for deceptive content and technical risks.</p>
                <form onSubmit={handleSafetySubmit}>
                  <input 
                    className="url-modal__input"
                    type="url" 
                    placeholder="https://example.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    autoFocus
                  />
                  <div className="url-modal__actions">
                    <button type="button" className="url-modal__btn url-modal__btn--cancel" onClick={() => setIsSafetyModalOpen(false)}>Cancel</button>
                    <button type="submit" className="url-modal__btn url-modal__btn--submit" style={{ background: '#ef4444' }}>Run Security Scan</button>
           {safetyResult && (
            <div className="premium-modal-overlay" onClick={() => setSafetyResult(null)}>
              <div className="premium-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ 
                    color: safetyResult.risk_score >= 70 ? '#ef4444' : 
                           safetyResult.risk_score >= 45 ? '#f59e0b' : '#10b981',
                    fontSize: '32px'
                  }}>
                    {safetyResult.risk_score >= 70 ? 'gpp_bad' : 
                     safetyResult.risk_score >= 45 ? 'warning' : 'verified_user'}
                  </span>
                  <h3 className="premium-modal__title">{safetyResult.risk_category}</h3>
                </div>
                
                <p className="premium-modal__text" style={{ opacity: 0.7, fontSize: '13px' }}>Risk Score: {safetyResult.risk_score}/100</p>
                
                <div className="safety-advice-box">
                  <div className="safety-advice-title">
                    <span className="material-symbols-outlined">psychology</span>
                    AI Recommendation
                  </div>
                  <p className="safety-advice-text">{safetyResult.ai_advice}</p>
                </div>

                <div className="premium-modal__actions">
                  <button className="premium-modal__btn premium-modal__btn--cancel" onClick={() => setSafetyResult(null)}>Dismiss</button>
                  <button className="premium-modal__btn premium-modal__btn--confirm" onClick={() => {
                    setSafetyResult(null);
                    setSafetyTargetUrl(safetyResult.url);
                    navigate(VIEW.SAFETY_ANALYSIS);
                  }}>Full Report</button>
                </div>
              </div>
            </div>
          )}
          )}


          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
      </div>
    )}

      {view === VIEW.HISTORY && (
        <main className="main-canvas history-page page-transition" id="history-page">
          <div className="history-header">
            <div className="history-header__info">
              <span className="material-symbols-outlined history-header__icon">history</span>
              <h2 className="history-header__title">Recent</h2>
            </div>
            <button className="history-header__clear" onClick={() => setShowClearHistoryConfirm(true)}>Clear All</button>

          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty__icon-wrap">
                <span className="material-symbols-outlined">auto_stories</span>
              </div>
              <h3>No conversations yet</h3>
              <p>Your chat history will appear here once you start asking questions.</p>
              <button className="history-empty__btn" onClick={() => navigate(VIEW.HOME)}>Start Chatting</button>
            </div>
          ) : (
            <div className="history-list">
              {history.slice().reverse().map((item) => (
                <div key={item.id} className="history-card">
                  <button className="history-card__main" onClick={() => goToChat(item.query, true)}>
                    <div className="history-card__icon">
                      <span className="material-symbols-outlined">chat_bubble</span>
                    </div>
                    <div className="history-card__content">
                      <p className="history-card__query">{item.query}</p>
                      <span className="history-card__date">{item.date}</span>
                    </div>
                  </button>
                  <button className="history-card__delete" onClick={(e) => {
                    e.stopPropagation();
                    const newHistory = history.filter(h => h.id !== item.id);
                    setHistory(newHistory);
                    localStorage.setItem("chat_history", JSON.stringify(newHistory));
                  }} aria-label="Delete item">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {view === VIEW.SAFETY_ANALYSIS && (
        <SafetyAnalysisPage 
          url={safetyTargetUrl} 
          results={safetyResult} 
          onComplete={setSafetyResult} 
          apiUrl={API_URL}
        />

      )}


      {view === VIEW.SETTINGS && <SettingsPage onNavigate={navigate} onLogout={() => setShowLogoutConfirm(true)} onClearHistory={() => setShowClearHistoryConfirm(true)} language={language} setLanguage={setLanguage} />}
      {view === VIEW.PROFILE  && <ProfilePage onNavigate={navigate} />}
      {view === VIEW.MEMORIES && <MemoriesPage onBack={() => navigate(VIEW.SETTINGS)} />}
      {view === VIEW.ABOUT    && <AboutPage />}

      {deleteTargetSid && (
        <div className="premium-modal-overlay">
          <div className="premium-modal">
            <h3 className="premium-modal-title">Delete Chat?</h3>
            <p className="premium-modal-desc">This action cannot be undone. Are you sure you want to permanently delete this conversation?</p>
            <div className="premium-modal-actions">
              <button className="premium-modal-btn premium-modal-btn--cancel" onClick={cancelDeleteChat}>Cancel</button>
              <button className="premium-modal-btn premium-modal-btn--danger" onClick={confirmDeleteChat}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*,.pdf,.txt,.doc,.docx"
        id="file-upload-input"
      />
      {showLogoutConfirm && (
        <div className="premium-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '28px' }}>logout</span>
              <h3 className="premium-modal__title">Sign Out?</h3>
            </div>
            <p className="premium-modal__text">Are you sure you want to logout of Mydeen AI? You will need to sign in again to access your chat history.</p>
            <div className="premium-modal__actions">
              <button className="premium-modal__btn premium-modal__btn--cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="premium-modal__btn premium-modal__btn--danger" onClick={() => { setShowLogoutConfirm(false); logout(); }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}


      {showClearHistoryConfirm && (
        <div className="premium-modal-overlay" onClick={() => setShowClearHistoryConfirm(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '28px' }}>auto_delete</span>
              <h3 className="premium-modal__title">Clear History?</h3>
            </div>
            <p className="premium-modal__text">This will permanently delete all your chat history. This action cannot be undone.</p>
            <div className="premium-modal__actions">
              <button className="premium-modal__btn premium-modal__btn--cancel" onClick={() => setShowClearHistoryConfirm(false)}>Cancel</button>
              <button className="premium-modal__btn premium-modal__btn--danger" onClick={() => { 
                localStorage.removeItem("chat_history");
                setHistory([]);
                setShowClearHistoryConfirm(false);
              }}>Clear All</button>
            </div>
          </div>
        </div>
      )}


      {/* Hidden PDF Input */}
      <input 
        type="file" 
        ref={pdfInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf" 
        onChange={handlePdfUpload} 
      />


      {/* ── Voice Assistant Overlay ── */}
      {showVoice && (
        <VoiceAssistant onClose={() => setShowVoice(false)} />
      )}

      {/* ── PWA Install Prompt ── */}
      <PWAInstallPrompt />
    </div>
    </>
  );
}
