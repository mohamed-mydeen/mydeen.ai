// api.js — centralised API configuration for Mydeen AI
// All backend calls use this base URL + the JWT stored in localStorage.

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Convenience fetch wrapper that automatically attaches the Authorization header.
 * Usage: apiFetch("/chats") or apiFetch("/chat", { method: "POST", body: JSON.stringify({...}) })
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("auth_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}
