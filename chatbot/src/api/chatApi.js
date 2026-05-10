import axios from "axios";
import { supabase } from "../lib/supabase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 50000,
});

// ── Attach Supabase JWT (or legacy token) to every request ─────────────
api.interceptors.request.use(async (config) => {
  // 1. Try Supabase session first
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Handle 401 globally → dispatch logout event ─────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(err);
  }
);

/** Sign up with backend (legacy username/password) */
export async function registerUser(username, password) {
  const res = await api.post("/register", { username, password });
  return res.data.access_token;
}

/** Login with backend (legacy username/password) */
export async function loginUser(username, password) {
  const res = await api.post("/login", { username, password });
  return res.data.access_token;
}

/** Send a message to the FastAPI backend (Standard POST) */
export async function sendMessage(message, history = [], session_id = null, session_title = null) {
  const response = await api.post("/chat", { 
    message, 
    history,
    session_id,
    session_title
  });
  return response.data; // Return full object: { reply, session_id }
}

/** Get memories settings for current user */
export async function getMemories() {
  const res = await api.get("/memories");
  return res.data;
}

/** Update memories settings for current user */
export async function updateMemories(memories) {
  const res = await api.post("/memories", memories);
  return res.data;
}

/** 
 * Send a message and stream the response token-by-token
 * @param {string} message - The user's prompt
 * @param {Array} history - Previous messages
 * @param {string} session_id - Current session ID
 * @param {Function} onChunk - Callback for each text chunk received
 * @param {Function} onSession - Optional callback for session ID updates
 */
export async function streamMessage(message, history = [], session_id = null, onChunk, onSession) {
  // 1. Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? localStorage.getItem("auth_token");

  // 2. Start fetch request
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ message, history, session_id })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Streaming failed");
  }

  // 3. Process the stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // SSE format: "data: {...}\n\n"
    const lines = buffer.split("\n\n");
    buffer = lines.pop(); // Keep partial line in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.replace("data: ", "").trim();
        if (dataStr === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.text) {
            onChunk(parsed.text);
          } else if (parsed.session_id && onSession) {
            onSession(parsed.session_id);
          } else if (parsed.error) {
            // Legitimate error from backend
            throw new Error(parsed.error);
          }
        } catch (e) {
          if (e.message.includes("Request timed out") || e.message.includes("error")) {
            // Re-throw so the caller (Chat.jsx) can handle the UI state
            throw e;
          }
          console.warn("Could not parse stream chunk", e);
        }
      }
    }
  }
}



/** Rename a chat session */
export async function renameChat(sessionId, title) {
  const res = await api.patch(`/history/${sessionId}/rename`, { title });
  return res.data;
}

/** Delete a chat session */
export async function deleteChat(sessionId) {
  const res = await api.delete(`/history/${sessionId}`);
  return res.data;
}

/** Archive/Unarchive a chat session */
export async function archiveChat(sessionId, archived = true) {
  const res = await api.patch(`/history/${sessionId}/archive`, { archived });
  return res.data;
}

/**
 * Send a message through the live web search + streaming pipeline.
 * Calls /chat/search/stream which auto-detects search intent and
 * fetches live context from Wikipedia / DuckDuckGo / Jina Reader.
 */
export async function streamSearchMessage(
  message,
  history = [],
  session_id = null,
  force_search = false,
  onChunk,
  onStatus,
  onSources,
  onImages,
  onSuggestions,
  onSession
) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? localStorage.getItem("auth_token");

  const response = await fetch(
    `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/chat/search/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ message, history, session_id, force_search }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Search stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const dataStr = line.replace("data: ", "").trim();
      if (dataStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.session_id && onSession) onSession(parsed.session_id);
        if (parsed.status && onStatus)      onStatus({ status: parsed.status, message: parsed.message });
        if (parsed.sources && onSources)    onSources(parsed.sources);
        if (parsed.images && onImages)      onImages(parsed.images);
        if (parsed.suggestions && onSuggestions) onSuggestions(parsed.suggestions);
        if (parsed.text && onChunk)         onChunk(parsed.text);
        if (parsed.error)                   throw new Error(parsed.error);
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
        console.warn("Could not parse search stream chunk:", e);
      }
    }
  }
}

