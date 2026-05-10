import React, { useState, useEffect, useRef } from "react";
import VoiceOrb from "./VoiceOrb";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { streamSearchMessage } from "../api/chatApi";

const IDLE_TIPS = [
  "Tap the orb to speak",
  "Ask me anything…",
  "I can search the web too",
  "Try a question in Tamil",
];

export default function VoiceAssistant({ onClose }) {
  // Only track CURRENT exchange — Gemini Live style
  const [userText, setUserText]       = useState("");
  const [aiText, setAiText]           = useState("");
  const [streaming, setStreaming]      = useState("");
  const [tipIndex, setTipIndex]       = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);

  const replyAccumRef = useRef("");
  const sessionIdRef  = useRef(null);
  const isBusyRef     = useRef(false); // prevent double-sends

  const {
    voiceState, setVoiceState,
    transcript, setTranscript,
    isMuted,
    error, setError,
    startListening, stopListening,
    speak, stopSpeaking,
    toggleMute,
  } = useVoiceAssistant({});

  /* ── Rotate idle tips ─────────────────────────────────────────── */
  useEffect(() => {
    if (voiceState !== "idle") return;
    const t = setInterval(() => setTipIndex(i => (i + 1) % IDLE_TIPS.length), 3500);
    return () => clearInterval(t);
  }, [voiceState]);

  /* ── Process transcript when thinking starts ──────────────────── */
  useEffect(() => {
    if (!transcript || voiceState !== "thinking" || isBusyRef.current) return;

    const userMsg = transcript;
    setTranscript(""); // clear immediately to prevent re-fire
    isBusyRef.current = true;

    // Show current user message
    setUserText(userMsg);
    setAiText("");
    setStreaming("");
    replyAccumRef.current = "";

    // Build history from previous exchanges
    const history = conversationHistory.map(h => [
      { role: "user",      text: h.user },
      { role: "assistant", text: h.ai },
    ]).flat();

    (async () => {
      try {
        await streamSearchMessage(
          userMsg,
          history,
          sessionIdRef.current,
          false,
          (chunk) => {
            replyAccumRef.current += chunk;
            setStreaming(replyAccumRef.current);
          },
          null, null, null, null,
          (sid) => { if (!sessionIdRef.current) sessionIdRef.current = sid; }
        );

        const fullReply = replyAccumRef.current;
        setStreaming("");
        setAiText(fullReply);

        // Save to history for context
        setConversationHistory(prev => [...prev, { user: userMsg, ai: fullReply }]);

        // Clean text for TTS
        const ttsText = fullReply
          .replace(/[#*`_~\[\]()>]/g, "")
          .replace(/\n+/g, " ")
          .trim()
          .slice(0, 400);

        setVoiceState("speaking");
        speak(ttsText, () => {
          setVoiceState("idle");
          isBusyRef.current = false;
        });
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
        setVoiceState("idle");
        isBusyRef.current = false;
      }
    })();
  }, [transcript, voiceState]);

  /* ── Orb tap ──────────────────────────────────────────────────── */
  const handleOrbTap = () => {
    if (voiceState === "speaking") { stopSpeaking(); isBusyRef.current = false; return; }
    if (voiceState === "listening") { stopListening(); return; }
    if (voiceState === "idle" && !isBusyRef.current) startListening();
  };

  const handleNewConvo = () => {
    stopSpeaking();
    setUserText("");
    setAiText("");
    setStreaming("");
    setConversationHistory([]);
    sessionIdRef.current = null;
    isBusyRef.current = false;
    setVoiceState("idle");
  };

  const getStateLabel = () => {
    if (voiceState === "listening") return "Listening…";
    if (voiceState === "thinking")  return "Thinking…";
    if (voiceState === "speaking")  return "Speaking…";
    return IDLE_TIPS[tipIndex];
  };

  const displayText = streaming || aiText;

  return (
    <div className="voice-assistant-overlay">
      {/* Header */}
      <header className="voice-header">
        <span className="voice-brand">Mydeen AI</span>
        <div className="voice-header-actions">
          <button className={`voice-icon-btn ${isMuted ? "voice-icon-btn--active" : ""}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
            <span className="material-symbols-outlined">{isMuted ? "volume_off" : "volume_up"}</span>
          </button>
          <button className="voice-icon-btn" onClick={onClose} title="Exit">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      {/* ── Single Exchange Display (Gemini style) ─────────────── */}
      <div className="voice-exchange-area">
        {userText && (
          <p className="voice-exchange-user">{userText}</p>
        )}
        {displayText && (
          <p className="voice-exchange-ai">
            {displayText}
            {streaming && <span className="voice-cursor" />}
          </p>
        )}
        {!userText && !displayText && voiceState === "idle" && (
          <p className="voice-exchange-hint">Tap the orb and start speaking</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="voice-error">
          <span className="material-symbols-outlined">error</span>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Orb + State Label ──────────────────────────────────── */}
      <div className="voice-center">
        <button className="orb-tap-btn" onClick={handleOrbTap} aria-label="Voice orb">
          <VoiceOrb state={voiceState} size={180} />
        </button>
        <p className="voice-state-label">{getStateLabel()}</p>
      </div>

      {/* ── Bottom Controls ────────────────────────────────────── */}
      <div className="voice-controls">
        {(voiceState === "idle" || voiceState === "listening") && (
          <button
            className={`voice-ctrl-btn voice-ctrl-btn--primary ${voiceState === "listening" ? "voice-ctrl-btn--stop" : ""}`}
            onClick={handleOrbTap}
          >
            <span className="material-symbols-outlined">
              {voiceState === "listening" ? "stop" : "mic"}
            </span>
            {voiceState === "listening" ? "Stop" : "Speak"}
          </button>
        )}
        {voiceState === "speaking" && (
          <button className="voice-ctrl-btn voice-ctrl-btn--danger" onClick={() => { stopSpeaking(); isBusyRef.current = false; }}>
            <span className="material-symbols-outlined">stop_circle</span>
            Stop
          </button>
        )}
        {conversationHistory.length > 0 && (
          <button className="voice-ctrl-btn" onClick={handleNewConvo}>
            <span className="material-symbols-outlined">restart_alt</span>
            New
          </button>
        )}
      </div>
    </div>
  );
}
