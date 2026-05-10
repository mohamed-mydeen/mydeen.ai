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

function SafetyAnalysisPage({ url, onComplete, results }) {
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
        const response = await fetch("http://localhost:8000/detect_deceptive", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
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
      <div className="safety-loader-page">
        <div className="safety-loader-content">
          <div className="safety-loader-icon">
            <span className="material-symbols-outlined spinning">shield</span>
          </div>
          <h2 className="safety-loader-title">Security Analysis In Progress</h2>
          <p className="safety-loader-url">{url}</p>
          <div className="safety-progress-container">
            <div className="safety-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="safety-loader-status">{statusText}</p>
        </div>
      </div>
    );
  }

  const isDanger = data.risk_score >= 70;
  const isWarning = data.risk_score >= 45;

  return (
    <main className="safety-dashboard">
      <div className={`safety-hero ${isDanger ? 'hero-danger' : isWarning ? 'hero-warning' : 'hero-safe'}`}>
        <span className="material-symbols-outlined hero-icon">
          {isDanger ? 'gpp_bad' : isWarning ? 'warning' : 'verified_user'}
        </span>
        <h1 className="hero-title">{data.risk_category}</h1>
        <div className="hero-score-badge">Risk Score: {data.risk_score}/100</div>
      </div>

      <div className="safety-dashboard-grid">
        <div className="safety-card safety-ai-advice">
          <h3><span className="material-symbols-outlined">psychology</span> AI Final Verdict</h3>
          <p>{data.ai_advice}</p>
        </div>

        <div className="safety-card safety-red-flags">
          <h3><span className="material-symbols-outlined">report</span> Technical Findings</h3>
          {data.all_issues.length > 0 ? (
            <ul className="safety-bullets">
              {data.all_issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          ) : (
            <p className="no-issues">No technical red flags found.</p>
          )}
        </div>

        <div className="safety-card safety-recommendations">
          <h3><span className="material-symbols-outlined">lightbulb</span> Recommendations</h3>
          <ul className="safety-bullets">
            {data.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
          </ul>
        </div>
      </div>
      
      <div className="safety-dashboard-footer">
        <button onClick={() => window.location.reload()} className="safety-back-btn">Start New Scan</button>
      </div>
    </main>
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
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                <h3 className="url-modal__title">Analyze Web Link</h3>
                <form onSubmit={handleUrlSubmit}>
                  <input
                    autoFocus
                    type="url"
                    className="url-modal__input"
                    placeholder="Paste https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                  />
                  <div className="url-modal__actions">
                    <button type="button" className="url-modal__btn-cancel" onClick={() => setIsUrlModalOpen(false)}>Cancel</button>
                    <button type="submit" className="url-modal__btn-submit">Analyze</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isSafetyModalOpen && (
            <div className="url-modal-overlay" onClick={() => setIsSafetyModalOpen(false)}>
              <div className="url-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="url-modal__title">Check Website Safety</h3>
                <form onSubmit={handleSafetySubmit}>
                  <input
                    autoFocus
                    type="url"
                    className="url-modal__input"
                    placeholder="Paste URL to scan..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                  />
                  <div className="url-modal__actions">
                    <button type="button" className="url-modal__btn-cancel" onClick={() => setIsSafetyModalOpen(false)}>Cancel</button>
                    <button type="submit" className="url-modal__btn-submit" style={{ background: '#ef4444' }}>Scan URL</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {safetyResult && (
            <div className="url-modal-overlay" onClick={() => setSafetyResult(null)}>
              <div className="safety-report" onClick={(e) => e.stopPropagation()}>
                <div className="safety-report__header" style={{ 
                  background: safetyResult.risk_score >= 70 ? 'rgba(239, 68, 68, 0.1)' : 
                              safetyResult.risk_score >= 45 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)' 
                }}>
                  <span className="material-symbols-outlined" style={{ 
                    color: safetyResult.risk_score >= 70 ? '#ef4444' : 
                           safetyResult.risk_score >= 45 ? '#f59e0b' : '#10b981',
                    fontSize: 48
                  }}>
                    {safetyResult.risk_score >= 70 ? 'gpp_bad' : 
                     safetyResult.risk_score >= 45 ? 'warning' : 'verified_user'}
                  </span>
                  <div>
                    <h2 className="safety-report__title">{safetyResult.risk_category}</h2>
                    <p className="safety-report__score">Risk Score: {safetyResult.risk_score}/100</p>
                  </div>
                </div>

                <div className="safety-report__body">
                  <div className="safety-section">
                    <h4>AI Expert Advice</h4>
                    <p className="ai-advice">{safetyResult.ai_advice}</p>
                  </div>

                  {safetyResult.all_issues.length > 0 && (
                    <div className="safety-section">
                      <h4>Technical Red Flags</h4>
                      <ul className="safety-list">
                        {safetyResult.all_issues.slice(0, 3).map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="safety-section">
                    <h4>Action Steps</h4>
                    <ul className="safety-list">
                      {safetyResult.recommendations.slice(0, 2).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button className="safety-report__close" onClick={() => setSafetyResult(null)}>Close Report</button>
              </div>
            </div>
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
            <button className="history-header__clear" onClick={() => {
              if (window.confirm("Are you sure you want to clear all recent chats?")) {
                setHistory([]);
                localStorage.removeItem("chat_history");
              }
            }}>Clear All</button>
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
        <div className="premium-modal-overlay">
          <div className="premium-modal">
            <h3 className="premium-modal-title">Logout?</h3>
            <p className="premium-modal-desc">Are you sure you want to sign out of your account?</p>
            <div className="premium-modal-actions">
              <button className="premium-modal-btn premium-modal-btn--cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="premium-modal-btn premium-modal-btn--danger" onClick={() => { setShowLogoutConfirm(false); logout(); }}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {showClearHistoryConfirm && (
        <div className="premium-modal-overlay">
          <div className="premium-modal">
            <h3 className="premium-modal-title">Clear Recents?</h3>
            <p className="premium-modal-desc">This will permanently delete ALL your past conversations. This action cannot be undone.</p>
            <div className="premium-modal-actions">
              <button className="premium-modal-btn premium-modal-btn--cancel" onClick={() => setShowClearHistoryConfirm(false)}>Cancel</button>
              <button className="premium-modal-btn premium-modal-btn--danger" onClick={() => { 
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
    </div>
  );
}
