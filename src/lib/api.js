import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const BACKEND = BACKEND_URL;

const TOKEN_KEY = "rabbithole.token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API, timeout: 60000 });
api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ---------- Device id ----------
const DEVICE_KEY = "rabbithole.deviceId";
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// Resolve stored image_url paths (relative /api/files/...) to absolute
export const resolveImage = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url}`;
};

// ---------- Auth ----------
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const signup = (payload) => api.post("/auth/signup", payload).then((r) => r.data);
export const fetchPreview = (id) => api.get(`/preview/${id}`).then((r) => r.data);
export const googleSession = (session_id) =>
  api.post("/auth/google/session", { session_id }).then((r) => r.data);
export const fetchMe = () => api.get("/auth/me").then((r) => r.data);
export const registerEditor = (payload) => api.post("/auth/register", payload).then((r) => r.data);
export const listEditors = () => api.get("/auth/editors").then((r) => r.data);
export const deleteEditor = (id) => api.delete(`/auth/editors/${id}`).then((r) => r.data);

// ---------- Editor CRUD ----------
export const listStories = (params = {}) => api.get("/admin/stories", { params }).then((r) => r.data);
export const getTree = (storyId) => api.get(`/admin/cards/tree/${storyId}`).then((r) => r.data);
export const getCard = (id) => api.get(`/admin/cards/${id}`).then((r) => r.data);
export const createCard = (payload) => api.post("/admin/cards", payload).then((r) => r.data);
export const updateCard = (id, payload) => api.put(`/admin/cards/${id}`, payload).then((r) => r.data);
export const deleteCard = (id) => api.delete(`/admin/cards/${id}`).then((r) => r.data);
export const reorderCards = (orderedIds) => api.post("/admin/cards/reorder", { ordered_ids: orderedIds }).then((r) => r.data);
export const uploadImage = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/admin/upload", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};

// ---------- Community queue ----------
export const listCommunity = () => api.get("/admin/community").then((r) => r.data);
export const publishCommunity = (id, payload) => api.post(`/admin/community/${id}/publish`, payload).then((r) => r.data);
export const rejectCommunity = (id) => api.delete(`/admin/community/${id}`).then((r) => r.data);

// ---------- Consumer ----------
export const fetchHot = () => api.get("/feed/hot").then((r) => r.data);
export const fetchOld = (params = {}) => api.get("/feed/old", { params }).then((r) => r.data);
export const fetchChildren = (id, deviceId) =>
  api.get(`/cards/${id}/children`, { params: { device_id: deviceId } }).then((r) => r.data);
export const fetchCardQuestions = (id) => api.get(`/cards/${id}/questions`).then((r) => r.data);

// ---------- Private AI deep-dive (SSE) ----------
export async function* streamDeepDive({ card_id, question, device_id }, { signal } = {}) {
  const res = await fetch(`${API}/ai/deepdive/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card_id, question, device_id }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error("Deep dive failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      try { yield JSON.parse(t.slice(5).trim()); } catch {}
    }
  }
}

export const fetchTTS = async (text, voice = "sage") => {
  const res = await fetch(`${API}/ai/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error("TTS failed");
  return res.blob();
};

export const transcribeAudio = async (blob, mime = "audio/webm") => {
  const form = new FormData();
  const ext = mime.includes("webm") ? "webm" : mime.includes("mp4") ? "mp4" : "wav";
  form.append("file", new File([blob], `speech.${ext}`, { type: mime }));
  const res = await fetch(`${API}/ai/stt`, { method: "POST", body: form });
  if (!res.ok) throw new Error("STT failed");
  return res.json();
};

// ---------- Local saved cards ----------
const SAVED_KEY = "rabbithole.saved";
export function getSavedCards() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
export function toggleSavedCard(card) {
  const list = getSavedCards();
  const idx = list.findIndex((c) => c.id === card.id);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift({ id: card.id, headline: card.headline, text: card.text, topic: card.topic, at: Date.now() });
  localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 200)));
  return idx < 0; // true = now saved
}
export function isSaved(id) { return getSavedCards().some((c) => c.id === id); }

// ---------- Local reading history ----------
const HISTORY_KEY = "rabbithole.history";
export function recordHistory(entry) {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    list.unshift({ ...entry, at: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {}
}
export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
