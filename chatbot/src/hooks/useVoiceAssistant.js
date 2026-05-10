import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useVoiceAssistant – manages STT, TTS, and streaming AI responses.
 * Completely free: Web Speech API for STT, SpeechSynthesis for TTS.
 */
export function useVoiceAssistant({ onStreamChunk, onStreamDone, voicePreference = "female" }) {
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | thinking | speaking
  const [transcript, setTranscript]   = useState("");
  const [spokenText, setSpokenText]   = useState("");
  const [isMuted, setIsMuted]         = useState(false);
  const [error, setError]             = useState(null);

  const recognitionRef = useRef(null);
  const synthRef       = useRef(window.speechSynthesis);
  const utteranceRef   = useRef(null);
  const isMutedRef     = useRef(false);

  /* Keep isMutedRef in sync */
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  /* ── Speech-to-Text (Web Speech API) ─────────────────────────── */
  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice not supported in this browser.");
      return;
    }

    if (recognitionRef.current) recognitionRef.current.abort();

    const recognition = new SpeechRecognition();
    recognition.lang          = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart  = () => setVoiceState("listening");
    recognition.onresult = (e) => {
      const finalText = e.results[0][0].transcript.trim();
      setTranscript(finalText);
      setVoiceState("thinking");
    };
    recognition.onerror  = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(`Mic error: ${e.error}`);
      }
      setVoiceState("idle");
    };
    recognition.onend    = () => {
      // If still "listening" and no result, go back to idle
      setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognitionRef.current = recognition;
    synthRef.current.cancel(); // Stop any ongoing speech
    recognition.start();
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState("idle");
  }, []);

  /* ── Text-to-Speech (SpeechSynthesis API) ─────────────────────── */
  const speak = useCallback((text, onDone) => {
    if (isMutedRef.current || !text) { onDone?.(); return; }

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Pick best available voice based on preference
    const voices = synthRef.current.getVoices();
    
    let preferred;
    if (voicePreference === "male") {
      preferred = voices.find(v => v.lang.startsWith("en") && (v.name.toLowerCase().includes("male") || v.name.includes("David") || v.name.includes("Mark"))) ||
                  voices.find(v => v.lang.startsWith("en"));
    } else {
      preferred = voices.find(v => v.lang.startsWith("en") && (v.name.toLowerCase().includes("female") || v.name.includes("Zira") || v.name.includes("Google UK English Female"))) ||
                  voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) ||
                  voices.find(v => v.lang.startsWith("en"));
    }
    
    if (preferred) utterance.voice = preferred;

    utterance.rate   = 1.1; // Slightly faster for "Sky/Ember" feel
    utterance.pitch  = voicePreference === "male" ? 0.9 : 1.1;
    utterance.volume = 1.0;

    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend   = () => { setVoiceState("idle"); onDone?.(); };
    utterance.onerror = () => { setVoiceState("idle"); onDone?.(); };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [voicePreference]);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setVoiceState("idle");
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      if (!m) synthRef.current.cancel(); // Stop speaking when muting
      return !m;
    });
  }, []);

  /* Cleanup on unmount */
  useEffect(() => () => {
    recognitionRef.current?.abort();
    synthRef.current.cancel();
  }, []);

  return {
    voiceState,
    setVoiceState,
    transcript,
    setTranscript,
    spokenText,
    setSpokenText,
    isMuted,
    error,
    setError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
  };
}
