const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Centralized API client.
 *
 * Important: Backend OpenAPI currently exposes only "/" (health). This client supports:
 * - Normal REST calls to a configurable base URL
 * - Token handling (Bearer)
 * - A "mock mode" fallback that enables the frontend to function end-to-end in CI/demo
 *
 * Env var:
 * - REACT_APP_API_BASE_URL (optional): e.g. "http://localhost:3001"
 */
class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiBaseUrl() {
  // CRA injects REACT_APP_* vars at build time
  return (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
}

function getToken() {
  return localStorage.getItem("pe_token") || "";
}

function setToken(token) {
  if (!token) localStorage.removeItem("pe_token");
  else localStorage.setItem("pe_token", token);
}

function getJsonHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * MOCK BACKEND
 * Maintains a tiny in-browser "database" of users and images.
 * This is used when backend endpoints are not available yet.
 */
const MOCK_LATENCY_MS = 350;

function mockDbLoad() {
  try {
    const raw = localStorage.getItem("pe_mock_db");
    if (!raw) {
      const init = { users: [], images: [] };
      localStorage.setItem("pe_mock_db", JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch {
    const init = { users: [], images: [] };
    localStorage.setItem("pe_mock_db", JSON.stringify(init));
    return init;
  }
}

function mockDbSave(db) {
  localStorage.setItem("pe_mock_db", JSON.stringify(db));
}

function randomId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

async function mockRegister({ email, password }) {
  await sleep(MOCK_LATENCY_MS);
  const db = mockDbLoad();
  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new ApiError("Email already registered.", { status: 409 });
  }
  const user = { id: randomId("user"), email, password };
  db.users.push(user);
  mockDbSave(db);
  return { token: `mock_${user.id}`, user: { id: user.id, email: user.email } };
}

async function mockLogin({ email, password }) {
  await sleep(MOCK_LATENCY_MS);
  const db = mockDbLoad();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    throw new ApiError("Invalid email or password.", { status: 401 });
  }
  return { token: `mock_${user.id}`, user: { id: user.id, email: user.email } };
}

function mockGetAuthedUser() {
  const token = getToken();
  if (!token.startsWith("mock_")) return null;
  const userId = token.replace("mock_", "");
  const db = mockDbLoad();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

async function mockUploadImage({ file, title }) {
  await sleep(MOCK_LATENCY_MS);
  const user = mockGetAuthedUser();
  if (!user) throw new ApiError("Not authenticated.", { status: 401 });

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError("Failed to read file."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const db = mockDbLoad();
  const img = {
    id: randomId("img"),
    userId: user.id,
    title: title || file.name,
    createdAt: new Date().toISOString(),
    // For demo, store data url; real backend should store in blob storage and return URL.
    originalDataUrl: dataUrl,
    editedDataUrl: null,
  };
  db.images.unshift(img);
  mockDbSave(db);

  return { image: img };
}

async function mockListImages() {
  await sleep(MOCK_LATENCY_MS);
  const user = mockGetAuthedUser();
  if (!user) throw new ApiError("Not authenticated.", { status: 401 });
  const db = mockDbLoad();
  return { images: db.images.filter((i) => i.userId === user.id) };
}

async function mockGetImage(id) {
  await sleep(MOCK_LATENCY_MS);
  const user = mockGetAuthedUser();
  if (!user) throw new ApiError("Not authenticated.", { status: 401 });
  const db = mockDbLoad();
  const img = db.images.find((i) => i.id === id && i.userId === user.id);
  if (!img) throw new ApiError("Image not found.", { status: 404 });
  return { image: img };
}

async function mockSaveEditedImage({ id, editedDataUrl }) {
  await sleep(MOCK_LATENCY_MS);
  const user = mockGetAuthedUser();
  if (!user) throw new ApiError("Not authenticated.", { status: 401 });
  const db = mockDbLoad();
  const idx = db.images.findIndex((i) => i.id === id && i.userId === user.id);
  if (idx < 0) throw new ApiError("Image not found.", { status: 404 });
  db.images[idx] = { ...db.images[idx], editedDataUrl };
  mockDbSave(db);
  return { image: db.images[idx] };
}

/**
 * If the backend base URL isn't set OR the backend doesn't have our expected endpoints yet,
 * we run in mock mode so the UI remains usable.
 */
function isMockModeEnabled() {
  // Explicit override:
  if ((process.env.REACT_APP_USE_MOCK_API || "").toLowerCase() === "true") return true;
  // If base URL missing, we must mock.
  if (!getApiBaseUrl()) return true;
  return false;
}

async function apiRequest(path, { method = "GET", body, headers, isJson = true } = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  const reqHeaders = {
    ...(isJson ? getJsonHeaders() : { Accept: "application/json" }),
    ...(headers || {}),
  };

  const options = {
    method,
    headers: reqHeaders,
  };

  if (body !== undefined) {
    options.body = isJson ? JSON.stringify(body) : body;
  }

  const res = await fetchWithTimeout(url, options);
  const contentType = res.headers.get("content-type") || "";

  let payload = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      (payload && payload.detail) || `Request failed (${res.status}).`,
      { status: res.status, details: payload }
    );
  }
  return payload;
}

// PUBLIC_INTERFACE
export const api = {
  /**
   * PUBLIC_INTERFACE
   * Returns whether the app is currently using mock API mode.
   */
  isMockMode() {
    return isMockModeEnabled();
  },

  /**
   * PUBLIC_INTERFACE
   * Login a user. In real mode, this expects POST /auth/login {email,password}.
   */
  async login({ email, password }) {
    if (isMockModeEnabled()) return mockLogin({ email, password });
    return apiRequest("/auth/login", { method: "POST", body: { email, password } });
  },

  /**
   * PUBLIC_INTERFACE
   * Register a user. In real mode, this expects POST /auth/register {email,password}.
   */
  async register({ email, password }) {
    if (isMockModeEnabled()) return mockRegister({ email, password });
    return apiRequest("/auth/register", { method: "POST", body: { email, password } });
  },

  /**
   * PUBLIC_INTERFACE
   * Clear token (logout).
   */
  logout() {
    setToken("");
  },

  /**
   * PUBLIC_INTERFACE
   * Set auth token after login/register.
   */
  setToken,

  /**
   * PUBLIC_INTERFACE
   * Get current token.
   */
  getToken,

  /**
   * PUBLIC_INTERFACE
   * Upload image. In real mode, expects POST /images/upload (multipart/form-data).
   */
  async uploadImage({ file, title }) {
    if (isMockModeEnabled()) return mockUploadImage({ file, title });

    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    return apiRequest("/images/upload", {
      method: "POST",
      body: form,
      headers,
      isJson: false,
    });
  },

  /**
   * PUBLIC_INTERFACE
   * List user's images. In real mode, expects GET /images.
   */
  async listImages() {
    if (isMockModeEnabled()) return mockListImages();
    return apiRequest("/images", { method: "GET" });
  },

  /**
   * PUBLIC_INTERFACE
   * Get a single image. In real mode, expects GET /images/{id}
   */
  async getImage(id) {
    if (isMockModeEnabled()) return mockGetImage(id);
    return apiRequest(`/images/${encodeURIComponent(id)}`, { method: "GET" });
  },

  /**
   * PUBLIC_INTERFACE
   * Save edited image. In real mode, expects POST /images/{id}/save {editedDataUrl|...}
   */
  async saveEditedImage({ id, editedDataUrl }) {
    if (isMockModeEnabled()) return mockSaveEditedImage({ id, editedDataUrl });
    return apiRequest(`/images/${encodeURIComponent(id)}/save`, {
      method: "POST",
      body: { editedDataUrl },
    });
  },
};

export { ApiError };
