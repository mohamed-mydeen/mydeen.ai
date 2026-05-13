import axios from "axios";
import { supabase } from "../lib/supabase";

export const api = axios.create({
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

/** Fetch all recent chat sessions for the user */
export async function getChats() {
  const res = await api.get("/chats");
  return res.data;
}

/** Create a new chat session */
export async function createChat() {
  const res = await api.post("/chats");
  return res.data;
}

/** Fetch messages for a specific chat session */
export async function getChatMessages(chatId) {
  const res = await api.get(`/chats/${chatId}/messages`);
  return res.data;
}

/** Rename a chat session */
export async function renameChat(chatId, title) {
  const res = await api.patch(`/chats/${chatId}`, { title });
  return res.data;
}

/** Delete a chat session */
export async function deleteChat(chatId) {
  const res = await api.delete(`/chats/${chatId}`);
  return res.data;
}

/** Archive/Unarchive a chat session */
export async function archiveChat(chatId, is_archived = true) {
  const res = await api.patch(`/chats/${chatId}`, { is_archived });
  return res.data;
}

/** Get user settings */
export async function getUserSettings() {
  const res = await api.get("/user/settings");
  return res.data;
}

/** Update user settings */
export async function updateUserSettings(settings) {
  const res = await api.patch("/user/settings", settings);
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
        console.warn("Could parse search stream chunk:", e);
      }
    }
  }
}


