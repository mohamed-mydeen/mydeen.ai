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
  const [userText, setUserText]       = useState("");
  const [aiText, setAiText]           = useState("");
  const [streaming, setStreaming]      = useState("");
  const [tipIndex, setTipIndex]       = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);

  const replyAccumRef = useRef("");
  const sessionIdRef  = useRef(null);
  const isBusyRef     = useRef(false);

  const {
    voiceState, setVoiceState,
    transcript, setTranscript,
    isMuted,
    error, setError,
    startListening, stopListening,
    speak, stopSpeaking,
    toggleMute,
  } = useVoiceAssistant({});

  useEffect(() => {
    if (voiceState !== "idle") return;
    const t = setInterval(() => setTipIndex(i => (i + 1) % IDLE_TIPS.length), 3500);
    return () => clearInterval(t);
  }, [voiceState]);

  useEffect(() => {
    if (!transcript || voiceState !== "thinking" || isBusyRef.current) return;

    const userMsg = transcript;
    setTranscript("");
    isBusyRef.current = true;

    setUserText(userMsg);
    setAiText("");
    setStreaming("");
    replyAccumRef.current = "";

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
        setConversationHistory(prev => [...prev, { user: userMsg, ai: fullReply }]);

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

  const handleOrbTap = () => {
    if (voiceState === "speaking") { stopSpeaking(); isBusyRef.current = false; return; }
    if (voiceState === "listening") { stopListening(); return; }
    if (voiceState === "idle" && !isBusyRef.current) startListening();
  };

  const getStateLabel = () => {
    if (voiceState === "listening") return "Listening…";
    if (voiceState === "thinking")  return "Thinking…";
    if (voiceState === "speaking")  return "Speaking…";
    return IDLE_TIPS[tipIndex];
  };

  const displayText = streaming || aiText;

  return (
    <div className="voice-assistant-overlay voice-assistant-v2">
      {/* ── Top Header ── */}
      <header className="voice-v2-header">
        <div className="voice-v2-header-left">
          {/* Empty for balance or could have brand */}
        </div>
        <div className="voice-v2-header-right">
          <button className="voice-v2-icon-btn" onClick={() => {/* Settings logic */}} title="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* ── Central Text Area ── */}
      <div className="voice-v2-content">
        <div className="voice-v2-text-wrapper">
          {userText && !displayText && (
            <p className="voice-v2-user-text">{userText}</p>
          )}
          {displayText && (
            <div className="voice-v2-ai-text">
              {displayText}
              {streaming && <span className="voice-v2-cursor" />}
            </div>
          )}
          {!userText && !displayText && voiceState === "idle" && (
            <p className="voice-v2-hint">How can I assist you today?</p>
          )}
        </div>
      </div>

      {/* ── Bottom Controls & Orb ── */}
      <div className="voice-v2-bottom">
        <div className="voice-v2-status">
          <p className="voice-v2-state-label">{getStateLabel()}</p>
        </div>

        <div className="voice-v2-controls-row">
          {/* Close Button */}
          <button className="voice-v2-circle-btn voice-v2-btn-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Main Orb */}
          <div className="voice-v2-orb-container">
            <button className="voice-v2-orb-btn" onClick={handleOrbTap}>
              <VoiceOrb state={voiceState} size={110} />
            </button>
          </div>

          {/* Mic / Mute Button */}
          <button 
            className={`voice-v2-circle-btn voice-v2-btn-mic ${voiceState === 'listening' ? 'active' : ''}`} 
            onClick={voiceState === 'listening' ? stopListening : handleOrbTap}
          >
            <span className="material-symbols-outlined">
              {isMuted ? "mic_off" : "mic"}
            </span>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="voice-v2-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
