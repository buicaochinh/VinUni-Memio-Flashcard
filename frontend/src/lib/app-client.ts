// ─── Types ───────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  name: string;
  email: string;
  photo_url?: string;
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

export type PreviewCard = {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
};

export type AnalyticsData = {
  streak: number;
  heatmap: Record<string, number>;
  hardest_cards: Array<{
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
};

// ─── Config ──────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

// ─── Auth (localStorage) ──────────────────────────────────────────────────────

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("flashcard_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: User) {
  window.localStorage.setItem("flashcard_user", JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem("flashcard_user");
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────

export async function loginWithGoogle(googleId: string, name: string, email: string, photoUrl = "") {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ google_id: googleId, name, email, photo_url: photoUrl }),
  });
  if (!res.ok) throw new Error("LOGIN_FAILED");
  const data = await res.json();
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
  history: any[] = [], 
  sourceContext?: string
) {
  const res = await fetch(apiUrl("/api/cards/explain"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ front, back, message, history, source_context: sourceContext }),
  });
  if (!res.ok) throw new Error("EXPLAIN_FAILED");
  return res.json();
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
