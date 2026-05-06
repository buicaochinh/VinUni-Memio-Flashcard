import { useSyncExternalStore } from "react";
// ─── Types ───────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  name: string;
  email?: string | null;
  photo_url?: string;
  username?: string | null;
  auth_type?: "google" | "username" | string;
};

export type Deck = {
  id: number;
  name: string;
  description?: string;
  is_public?: number;
  share_token?: string;
  created_at?: string;
};

export type Card = {
  id: number;
  front: string;
  back: string;
  difficulty?: "easy" | "medium" | "hard";
  source_context?: string;
  ease_factor?: number | null;
  repetition?: number | null;
  interval?: number | null;
  last_quality?: number | null;
  last_reviewed?: string | null;
  next_review?: string | null;
};

export type UserSettings = {
  daily_new_limit: number;
  daily_review_limit: number;
  timezone: string;
};

export type PreviewCard = {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
};

export type AnalyticsData = {
  streak: number;
  heatmap: Record<string, number>;
  hardest_cards: Array<{
    id: number;
    front: string;
    back: string;
    ease_factor: number;
    difficulty: string;
    deck_id: number;
  }>;
  forgetting_rate: number;
  total_reviewed: number;
  deck_stats: Array<{
    id: number;
    name: string;
    avg_ef: number;
    reviewed_count: number;
    hard_count: number;
  }>;
  predicted_mastery_timeline: Array<{
    date: string;
    mastery: number;
  }>;
  weak_areas: {
    weak_decks: Array<{
      id: number;
      name: string;
      avg_ef: number;
      reviewed_count: number;
      hard_count: number;
      weak_ratio: number;
    }>;
    weak_cards: Array<{
      id: number;
      front: string;
      back: string;
      ease_factor: number;
      difficulty: string;
      deck_id: number;
    }>;
  };
  peers_comparison: {
    your_forgetting_rate: number;
    peer_forgetting_rate: number;
    your_avg_reviews_per_day: number;
    peer_avg_reviews_per_day: number;
  };
};

export type ExplainHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ExplainCitation = {
  id: number;
  text: string;
  source: string;
};

export type ExplainResponse = {
  answer?: string;
  response?: string;
  citations?: ExplainCitation[];
};

// ─── Config ──────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

// ─── Auth (localStorage) ──────────────────────────────────────────────────────

const USER_STORAGE_KEY = "flashcard_user";
const TOKENS_STORAGE_KEY = "flashcard_tokens";
const USER_CHANGED_EVENT = "flashcard_user_changed";

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
};

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: User) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(USER_CHANGED_EVENT));
}

export function getStoredTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKENS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenPair) {
  window.localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  window.dispatchEvent(new Event(USER_CHANGED_EVENT));
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKENS_STORAGE_KEY);
  window.dispatchEvent(new Event(USER_CHANGED_EVENT));
}

function subscribeStoredUser(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_STORAGE_KEY || e.key === TOKENS_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(USER_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(USER_CHANGED_EVENT, onStoreChange);
  };
}

let _cachedUserRaw: string | null | undefined = undefined;
let _cachedUserParsed: User | null = null;

function getStoredUserSnapshot(): User | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    raw = null;
  }

  // Return the same object instance if storage did not change.
  if (raw === _cachedUserRaw) return _cachedUserParsed;

  _cachedUserRaw = raw;
  if (!raw) {
    _cachedUserParsed = null;
    return null;
  }
  try {
    _cachedUserParsed = JSON.parse(raw) as User;
  } catch {
    _cachedUserParsed = null;
  }
  return _cachedUserParsed;
}

function getStoredUserServerSnapshot(): User | null {
  return null;
}

export function useStoredUser() {
  return useSyncExternalStore(
    subscribeStoredUser,
    getStoredUserSnapshot,
    getStoredUserServerSnapshot
  ) as User | null;
}

// Ready flag to avoid redirecting before client hydration.
// Implemented as an external store to satisfy hooks lint rules.
const CLIENT_READY_EVENT = "flashcard_client_ready";
let _clientReady = false;

function subscribeClientReady(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CLIENT_READY_EVENT, onStoreChange);

  if (!_clientReady) {
    queueMicrotask(() => {
      _clientReady = true;
      window.dispatchEvent(new Event(CLIENT_READY_EVENT));
    });
  }

  return () => window.removeEventListener(CLIENT_READY_EVENT, onStoreChange);
}

function getClientReadySnapshot() {
  return typeof window !== "undefined" && _clientReady;
}

function getClientReadyServerSnapshot() {
  return false;
}

export function useClientReady() {
  return useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getClientReadyServerSnapshot
  );
}

export async function readErrorDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    return typeof data?.detail === "string" ? data.detail : null;
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  return getStoredTokens()?.access_token ?? null;
}

let refreshInFlight: Promise<boolean> | null = null;

async function doTokenRefresh(): Promise<boolean> {
  try {
    const tokens = getStoredTokens();
    if (!tokens?.refresh_token) return false;
    const res = await fetch(apiUrl("/api/auth/session/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { tokens: TokenPair };
    saveTokens(data.tokens);
    return true;
  } catch {
    return false;
  }
}

async function tryRefreshOnce(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doTokenRefresh();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Gọi API có bảo vệ JWT; tự refresh access token khi 401 (một lần). */
export async function authFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status !== 401 || retried) return res;
  const ok = await tryRefreshOnce();
  if (!ok) {
    clearStoredUser();
    if (typeof window !== "undefined") window.location.href = "/login";
    return res;
  }
  return authFetch(path, init, true);
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────

export async function loginWithGoogle(googleId: string, name: string, email: string, photoUrl = "") {
  const res = await fetch(apiUrl("/api/auth/session/login/google"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ google_id: googleId, name, email, photo_url: photoUrl }),
  });
  if (!res.ok) throw new Error("LOGIN_FAILED");
  const data = (await res.json()) as { user: User; tokens: TokenPair };
  saveStoredUser(data.user);
  saveTokens(data.tokens);
  return data.user as User;
}

export type UsernameRegisterInput = {
  username: string;
  password: string;
  email?: string;
  name?: string;
};

export async function registerUser(input: UsernameRegisterInput) {
  const res = await fetch(apiUrl("/api/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "REGISTER_FAILED");
  }
  const data = await res.json();
  return data.user as User;
}

export async function loginWithUsername(username: string, password: string) {
  const res = await fetch(apiUrl("/api/auth/session/login/username"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "LOGIN_FAILED");
  }
  const data = (await res.json()) as { user: User; tokens: TokenPair };
  saveStoredUser(data.user);
  saveTokens(data.tokens);
  return data.user as User;
}

/** Decode a Google JWT credential (client-side only, no secret needed for payload) */
export function decodeGoogleJwt(credential: string): {
  sub: string;
  name: string;
  email: string;
  picture: string;
} {
  const parts = credential.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(payload)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}

// ─── Decks ────────────────────────────────────────────────────────────────────

export async function fetchDecks(userId: number): Promise<Deck[]> {
  const res = await fetch(apiUrl(`/api/decks/?user_id=${userId}`));
  if (!res.ok) throw new Error("FETCH_DECKS_FAILED");
  const data = await res.json();
  return (data.decks ?? []) as Deck[];
}

export async function createDeck(userId: number, name: string, description = ""): Promise<number> {
  const res = await fetch(apiUrl("/api/decks/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, name, description }),
  });
  if (!res.ok) throw new Error("CREATE_DECK_FAILED");
  const data = await res.json();
  return data.deck_id as number;
}

export async function deleteDeck(deckId: number) {
  const res = await fetch(apiUrl(`/api/decks/${deckId}`), { method: "DELETE" });
  if (!res.ok) throw new Error("DELETE_DECK_FAILED");
}

export async function enableDeckSharing(deckId: number): Promise<string> {
  const res = await fetch(apiUrl(`/api/decks/${deckId}/share`), { method: "POST" });
  if (!res.ok) throw new Error("SHARE_FAILED");
  const data = await res.json();
  return data.share_token as string;
}

export async function disableDeckSharing(deckId: number) {
  await fetch(apiUrl(`/api/decks/${deckId}/share`), { method: "DELETE" });
}

export async function fetchSharedDeck(token: string) {
  const res = await fetch(apiUrl(`/api/decks/shared/${token}`));
  if (!res.ok) throw new Error("SHARED_DECK_NOT_FOUND");
  return res.json() as Promise<{ deck: Deck; cards: Card[] }>;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function fetchDeckCards(deckId: number, userId: number): Promise<Card[]> {
  const res = await fetch(apiUrl(`/api/cards/${deckId}?user_id=${userId}`));
  if (!res.ok) throw new Error("FETCH_CARDS_FAILED");
  const data = await res.json();
  return (data.cards ?? []) as Card[];
}

/** Preview generation: returns cards WITHOUT saving to DB */
export async function previewCards(deckId: number, files: File[], count = 100): Promise<PreviewCard[]> {
  const form = new FormData();
  files.forEach(f => form.append("files", f));
  form.append("count", String(count));
  const res = await fetch(apiUrl(`/api/cards/${deckId}/preview`), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    // FastAPI returns { detail: "..." } for HTTPException
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.cards ?? []) as PreviewCard[];
}

/** Save the reviewed/edited cards from preview to the deck */
export async function bulkCreateCards(deckId: number, cards: PreviewCard[]) {
  const res = await fetch(apiUrl(`/api/cards/${deckId}/bulk_create`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  if (!res.ok) throw new Error("BULK_CREATE_FAILED");
  return res.json();
}

export async function updateCard(cardId: number, front: string, back: string, difficulty: string) {
  const res = await fetch(apiUrl(`/api/cards/${cardId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ front, back, difficulty }),
  });
  if (!res.ok) throw new Error("UPDATE_CARD_FAILED");
}

export async function deleteCard(cardId: number) {
  const res = await fetch(apiUrl(`/api/cards/${cardId}`), { method: "DELETE" });
  if (!res.ok) throw new Error("DELETE_CARD_FAILED");
}

export async function updateCardProgress(
  userId: number,
  card: Card,
  quality: 0 | 1 | 2 | 3
) {
  const res = await fetch(apiUrl("/api/cards/progress"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      card_id: card.id,
      quality,
      ease_factor: card.ease_factor ?? 2.5,
      repetition: card.repetition ?? 0,
      interval: card.interval ?? 0,
      deck_id: 0,
    }),
  });
  if (!res.ok) throw new Error("UPDATE_PROGRESS_FAILED");
}

export async function logStudySession(
  userId: number,
  deckId: number,
  cardsReviewed: number,
  avgQuality: number
) {
  await fetch(apiUrl("/api/cards/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      deck_id: deckId,
      cards_reviewed: cardsReviewed,
      avg_quality: avgQuality,
    }),
  }).catch(() => {
    /* non-critical, ignore errors */
  });
}

export async function explainCard(
  front: string, 
  back: string, 
  message: string, 
  history: ExplainHistoryMessage[] = [],
  sourceContext?: string
): Promise<ExplainResponse> {
  const res = await fetch(apiUrl("/api/cards/explain"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ front, back, message, history, source_context: sourceContext }),
  });
  if (!res.ok) throw new Error("EXPLAIN_FAILED");
  return res.json() as Promise<ExplainResponse>;
}

// ─── Integrations (JWT) ───────────────────────────────────────────────────────

export type ChatIntegrationDTO = {
  id: number;
  provider: string;
  provider_user_id: string;
  dm_chat_id?: string | null;
  group_target_id?: string | null;
  timezone: string;
  send_window: string;
  daily_goal: number;
  created_at: string;
  last_sent_at?: string | null;
  sent_today?: number;
  sent_today_date?: string | null;
  weekly_report_week?: string | null;
  weekly_report_sent_at?: string | null;
};

export type IngestionSourceDTO = {
  id: number;
  provider: string;
  name: string;
  status: string;
  sync_mode: string;
  source_url?: string | null;
  external_id?: string | null;
  target_deck_id?: number | null;
  auto_tag: boolean;
  frequency_minutes: number;
  cards_per_item: number;
  config: Record<string, unknown>;
  last_synced_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type IngestionRunDTO = {
  id: number;
  source_id: number;
  status: string;
  started_at: string;
  finished_at?: string | null;
  fetched_count: number;
  normalized_count: number;
  created_count: number;
  error_message?: string | null;
};

export type NotionConnectionStatusDTO = {
  connected: boolean;
  workspace_id?: string | null;
  workspace_name?: string | null;
  workspace_icon?: string | null;
  owner_type?: string | null;
};

export type NotionPageDTO = {
  id: string;
  title: string;
  url?: string | null;
  last_edited_time?: string | null;
  object_type: string;
};

export async function fetchIntegrations(): Promise<ChatIntegrationDTO[]> {
  const res = await authFetch("/api/integrations/me");
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "FETCH_INTEGRATIONS_FAILED");
  }
  return res.json() as Promise<ChatIntegrationDTO[]>;
}

export async function linkIntegration(code: string): Promise<{
  message: string;
  provider: string;
  provider_user_id: string;
}> {
  const res = await authFetch("/api/integrations/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "LINK_FAILED");
  }
  return res.json() as Promise<{ message: string; provider: string; provider_user_id: string }>;
}

export async function updateIntegration(
  provider: string,
  body: { timezone?: string; send_window?: string; daily_goal?: number; group_target_id?: string }
): Promise<ChatIntegrationDTO> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "UPDATE_INTEGRATION_FAILED");
  }
  return res.json() as Promise<ChatIntegrationDTO>;
}

export async function deleteIntegration(provider: string): Promise<void> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "DELETE_INTEGRATION_FAILED");
  }
}

export async function testWeeklyReport(): Promise<void> {
  const res = await authFetch("/api/integrations/weekly_report/test", { method: "POST" });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "TEST_WEEKLY_REPORT_FAILED");
  }
}

export async function testSendDueCards(): Promise<void> {
  const res = await authFetch("/api/integrations/due/test", { method: "POST" });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "TEST_DUE_FAILED");
  }
}

export type TelegramBotMetaDTO = {
  username: string;
  url: string;
};

export async function fetchTelegramBotMeta(): Promise<TelegramBotMetaDTO> {
  const res = await authFetch("/api/integrations/telegram/meta");
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "FETCH_TELEGRAM_META_FAILED");
  }
  return res.json() as Promise<TelegramBotMetaDTO>;
}

export async function fetchIngestionSources(): Promise<IngestionSourceDTO[]> {
  const res = await authFetch("/api/ingestion/sources");
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "FETCH_INGESTION_SOURCES_FAILED");
  }
  return res.json() as Promise<IngestionSourceDTO[]>;
}

export async function getNotionConnectUrl(): Promise<string> {
  const res = await authFetch("/api/notion/connect");
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "GET_NOTION_CONNECT_URL_FAILED");
  }
  const data = (await res.json()) as { connect_url: string };
  return data.connect_url;
}

export async function fetchNotionStatus(): Promise<NotionConnectionStatusDTO> {
  const res = await authFetch("/api/notion/status");
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "FETCH_NOTION_STATUS_FAILED");
  }
  return res.json() as Promise<NotionConnectionStatusDTO>;
}

export async function disconnectNotion(): Promise<void> {
  const res = await authFetch("/api/notion/disconnect", { method: "DELETE" });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "DISCONNECT_NOTION_FAILED");
  }
}

export async function fetchNotionPages(): Promise<NotionPageDTO[]> {
  const res = await authFetch("/api/notion/pages");
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "FETCH_NOTION_PAGES_FAILED");
  }
  return res.json() as Promise<NotionPageDTO[]>;
}

export async function createIngestionSource(body: {
  provider: string;
  name: string;
  source_url?: string;
  target_deck_id?: number;
  auto_tag?: boolean;
  frequency_minutes?: number;
  cards_per_item?: number;
  sync_mode?: string;
  config?: Record<string, unknown>;
}): Promise<IngestionSourceDTO> {
  const res = await authFetch("/api/ingestion/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "CREATE_INGESTION_SOURCE_FAILED");
  }
  return res.json() as Promise<IngestionSourceDTO>;
}

export async function createNotionIngestionSource(body: {
  page_id: string;
  name?: string;
  target_deck_id?: number;
  auto_tag?: boolean;
  frequency_minutes?: number;
  cards_per_item?: number;
}): Promise<IngestionSourceDTO> {
  const res = await authFetch("/api/ingestion/sources/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "CREATE_NOTION_INGESTION_SOURCE_FAILED");
  }
  return res.json() as Promise<IngestionSourceDTO>;
}

export async function createDeckFromNotion(body: {
  page_id: string;
  deck_name?: string;
  description?: string;
  auto_tag?: boolean;
  frequency_minutes?: number;
  cards_per_item?: number;
}): Promise<{
  message: string;
  deck_id: number;
  deck_name: string;
  source_id: number;
  created_count: number;
}> {
  const res = await authFetch("/api/ingestion/notion/create-deck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "CREATE_DECK_FROM_NOTION_FAILED");
  }
  return res.json() as Promise<{
    message: string;
    deck_id: number;
    deck_name: string;
    source_id: number;
    created_count: number;
  }>;
}

export async function updateIngestionSource(
  sourceId: number,
  body: {
    name?: string;
    status?: string;
    source_url?: string;
    target_deck_id?: number;
    auto_tag?: boolean;
    frequency_minutes?: number;
    cards_per_item?: number;
    sync_mode?: string;
    config?: Record<string, unknown>;
  }
): Promise<IngestionSourceDTO> {
  const res = await authFetch(`/api/ingestion/sources/${sourceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "UPDATE_INGESTION_SOURCE_FAILED");
  }
  return res.json() as Promise<IngestionSourceDTO>;
}

export async function deleteIngestionSource(sourceId: number): Promise<void> {
  const res = await authFetch(`/api/ingestion/sources/${sourceId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "DELETE_INGESTION_SOURCE_FAILED");
  }
}

export async function syncIngestionSource(sourceId: number, previewOnly = false): Promise<{
  message: string;
  source_id: number;
  run_id: number;
  fetched_count: number;
  normalized_count: number;
  created_count: number;
  preview_cards: number;
}> {
  const query = previewOnly ? "?preview_only=true" : "";
  const res = await authFetch(`/api/ingestion/sources/${sourceId}/sync${query}`, {
    method: "POST",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "SYNC_INGESTION_SOURCE_FAILED");
  }
  return res.json() as Promise<{
    message: string;
    source_id: number;
    run_id: number;
    fetched_count: number;
    normalized_count: number;
    created_count: number;
    preview_cards: number;
  }>;
}

export async function fetchIngestionRuns(sourceId: number): Promise<IngestionRunDTO[]> {
  const res = await authFetch(`/api/ingestion/sources/${sourceId}/runs`);
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? "FETCH_INGESTION_RUNS_FAILED");
  }
  return res.json() as Promise<IngestionRunDTO[]>;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function fetchAnalytics(userId: number): Promise<AnalyticsData> {
  const res = await fetch(apiUrl(`/api/decks/analytics?user_id=${userId}`));
  if (!res.ok) throw new Error("ANALYTICS_FAILED");
  return res.json() as Promise<AnalyticsData>;
}

// ─── Offline cache (localStorage) ────────────────────────────────────────────

const CARDS_CACHE_KEY = "fc_cards_cache";
const PROGRESS_QUEUE_KEY = "fc_progress_queue";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

type ProgressQueueItem = {
  userId: number;
  card: Card;
  quality: 0 | 1 | 2 | 3;
  deckId: number;
  cardsReviewed?: number;
};

export function cacheCards(deckId: number, cards: Card[]) {
  try {
    const cache = JSON.parse(localStorage.getItem(CARDS_CACHE_KEY) ?? "{}");
    cache[deckId] = { cards, cachedAt: Date.now() };
    localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full – ignore */
  }
}

export function getCachedCards(deckId: number): Card[] | null {
  try {
    const cache = JSON.parse(localStorage.getItem(CARDS_CACHE_KEY) ?? "{}");
    const entry = cache[deckId];
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) return entry.cards as Card[];
  } catch {
    /* parse error */
  }
  return null;
}

export function queueProgressUpdate(item: ProgressQueueItem) {
  try {
    const queue: ProgressQueueItem[] = JSON.parse(
      localStorage.getItem(PROGRESS_QUEUE_KEY) ?? "[]"
    );
    queue.push(item);
    localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export async function flushProgressQueue() {
  try {
    const queue: ProgressQueueItem[] = JSON.parse(
      localStorage.getItem(PROGRESS_QUEUE_KEY) ?? "[]"
    );
    if (queue.length === 0) return;
    const results = await Promise.allSettled(
      queue.map((item) => updateCardProgress(item.userId, item.card, item.quality))
    );
    const failed = queue.filter((_, i) => results[i].status === "rejected");
    localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(failed));
  } catch {
    /* ignore */
  }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function fetchSmartQueue(deckId: number, userId: number, overrideLimit: boolean = false): Promise<Card[]> {
  const r = await fetch(apiUrl(`/api/cards/${deckId}/smart-queue?user_id=${userId}&override_limit=${overrideLimit}`));
  if (!r.ok) throw new Error("Failed to fetch smart queue");
  const data = await r.json();
  return data.cards;
}

export async function fetchStudySummary(deckId: number, userId: number): Promise<{
  due_cards: number;
  new_cards: number;
  completed_new: number;
  completed_review: number;
  daily_new_limit: number;
  daily_review_limit: number;
  total_cards: number;
}> {
  const r = await fetch(apiUrl(`/api/cards/${deckId}/study-summary?user_id=${userId}`));
  if (!r.ok) throw new Error("Failed to fetch study summary");
  return await r.json();
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

export async function fetchUserSettings(userId: number): Promise<UserSettings> {
  const r = await fetch(apiUrl(`/api/users/${userId}/settings`));
  if (!r.ok) throw new Error("Failed to fetch user settings");
  return await r.json();
}

export async function updateUserSettings(userId: number, dailyNew: number, dailyReview: number, timezone?: string) {
  const r = await fetch(apiUrl(`/api/users/${userId}/settings`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_new_limit: dailyNew, daily_review_limit: dailyReview, timezone })
  });
  if (!r.ok) throw new Error("Failed to update user settings");
  return await r.json();
}

export async function updateUserTimezone(userId: number, timezone: string) {
  const r = await fetch(apiUrl(`/api/users/${userId}/settings/timezone`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timezone }),
  });
  if (!r.ok) throw new Error("Failed to update user timezone");
  return await r.json();
}

export async function syncBrowserTimezone(userId: number) {
  if (typeof window === "undefined") return;
  const timezone = getBrowserTimezone();
  const key = `fc_timezone_sync:${userId}`;
  const today = new Date();
  const syncKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}:${timezone}`;
  if (localStorage.getItem(key) === syncKey) return;
  await updateUserTimezone(userId, timezone);
  localStorage.setItem(key, syncKey);
}
