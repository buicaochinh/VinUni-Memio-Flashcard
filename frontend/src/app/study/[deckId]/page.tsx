"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  cacheCards,
  Card,
  fetchDeckCards,
  flushProgressQueue,
  getCachedCards,
  getStoredUser,
  isOnline,
  logStudySession,
  queueProgressUpdate,
  updateCardProgress,
  explainCard,
  User,
} from "../../../lib/app-client";

const RATING: Record<0 | 1 | 2 | 3, { label: string; hint: string; cls: string }> = {
  0: { label: "Again", hint: "Ôn lại sớm",       cls: "rating-again" },
  1: { label: "Hard",  hint: "Giãn cách ngắn",    cls: "rating-hard"  },
  2: { label: "Good",  hint: "Đúng nhịp",         cls: "rating-good"  },
  3: { label: "Easy",  hint: "Nắm chắc rồi",      cls: "rating-easy"  },
};

const SWIPE_THRESHOLD = 80;  // px
const SWIPE_VELOCITY  = 0.3; // px/ms

export default function StudyPage() {
  const params     = useParams<{ deckId: string }>();
  const deckId     = Number(params.deckId);
  const router     = useRouter();

  const [user,         setUser]         = useState<User | null>(null);
  const [cards,        setCards]        = useState<Card[]>([]);
  const [idx,          setIdx]          = useState(0);
  const [isFlipped,    setIsFlipped]    = useState(false);
  const [dragX,        setDragX]        = useState(0);
  const [isDragging,   setIsDragging]   = useState(false);
  const [offline,      setOffline]      = useState(false);
  const [msg,          setMsg]          = useState<string | null>(null);
  const [ratingQuality, setRatingQuality] = useState<number | null>(null); // for quick flash
  const [sessionRatings, setSessionRatings] = useState<number[]>([]);

  // Explain mode states
  const [isExplainMode, setIsExplainMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const pointerStart = useRef<{ x: number; t: number } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Auth & load cards ──────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void loadCards(storedUser.id);

    const handleOnline  = () => { setOffline(false); void flushProgressQueue(); };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  const loadCards = async (userId: number) => {
    try {
      let loaded: Card[];
      if (isOnline()) {
        loaded = await fetchDeckCards(deckId, userId);
        cacheCards(deckId, loaded);
      } else {
        loaded = getCachedCards(deckId) ?? [];
        if (loaded.length === 0) setMsg("Offline — không có cache cho deck này.");
      }
      setCards(loaded);
    } catch {
      const cached = getCachedCards(deckId);
      if (cached) { setCards(cached); setMsg("Offline — đang dùng dữ liệu cache."); }
      else         setMsg("Không tải được flashcards.");
    }
  };

  // ── Progress & session ─────────────────────────────────────────────────────
  const handleRate = async (quality: 0 | 1 | 2 | 3) => {
    if (!user || cards.length === 0) return;
    const card = cards[idx];

    setRatingQuality(quality);
    setTimeout(() => setRatingQuality(null), 400);

    const newRatings = [...sessionRatings, quality];
    setSessionRatings(newRatings);

    if (isOnline()) {
      await updateCardProgress(user.id, card, quality).catch(() => {
        queueProgressUpdate({ userId: user.id, card, quality, deckId });
      });
    } else {
      queueProgressUpdate({ userId: user.id, card, quality, deckId });
    }

    if (idx < cards.length - 1) {
      setIsFlipped(false);
      setDragX(0);
      setMsg(null);
      setTimeout(() => setIdx((i) => i + 1), 220);
    } else {
      // Session complete — log it
      const avg = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
      if (isOnline()) {
        void logStudySession(user.id, deckId, newRatings.length, avg);
      }
      setMsg("🎉 Hoàn thành phiên học!");
      setTimeout(() => router.push("/workspace"), 1400);
    }
  };

  // ── Swipe (pointer events) ─────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isFlipped) return;
    pointerStart.current = { x: e.clientX, t: Date.now() };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !pointerStart.current) return;
    setDragX(e.clientX - pointerStart.current.x);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !pointerStart.current) return;
    const dx  = e.clientX - pointerStart.current.x;
    const dt  = Date.now() - pointerStart.current.t;
    const vel = Math.abs(dx) / Math.max(dt, 1);

    setIsDragging(false);
    pointerStart.current = null;

    if (Math.abs(dx) > SWIPE_THRESHOLD || vel > SWIPE_VELOCITY) {
      void handleRate(dx > 0 ? 3 : 0);  // right = Easy, left = Again
    } else {
      setDragX(0);
    }
  };

  // ── Explain mode handler ───────────────────────────────────────────────────
  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleExplain = async () => {
    if (!chatInput.trim() || !card) return;
    const currentInput = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", text: currentInput }]);
    setIsChatting(true);
    
    try {
      const resp = await explainCard(card.front, card.back, currentInput, chatHistory);
      setChatHistory(prev => [...prev, { role: "assistant", text: resp }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", text: "Xin lỗi, có lỗi khi gọi AI. Vui lòng thử lại!" }]);
    }
    setIsChatting(false);
  };

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsFlipped((f) => !f);
          break;
        case 'ArrowLeft':
          if (idx > 0) { setIdx((i) => i - 1); setIsFlipped(false); setMsg(null); }
          break;
        case 'ArrowRight':
          if (idx < cards.length - 1) { setIdx((i) => i + 1); setIsFlipped(false); setMsg(null); }
          break;
        case '1': if (isFlipped) void handleRate(0); break;
        case '2': if (isFlipped) void handleRate(1); break;
        case '3': if (isFlipped) void handleRate(2); break;
        case '4': if (isFlipped) void handleRate(3); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [idx, cards.length, isFlipped]);

  const progress = useMemo(
    () => (cards.length === 0 ? 0 : ((idx + 1) / cards.length) * 100),
    [cards.length, idx]
  );

  const card = cards[idx];

  if (!user) return null;

  // ── Empty deck ─────────────────────────────────────────────────────────────
  if (cards.length === 0 && !msg) {
    return (
      <main className="study-shell">
        <section className="panel empty-state">
          <span className="empty-icon">🃏</span>
          <h2 style={{ letterSpacing: "-0.04em" }}>Deck này chưa có flashcards</h2>
          <p className="muted">Hãy sang Generator để tạo nội dung trước.</p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => router.push(`/generate?deckId=${deckId}`)}>
              ⚡ Sang Generator
            </button>
            <button className="btn btn-secondary" style={{ width: "auto" }} onClick={() => router.push("/workspace")}>
              Về Workspace
            </button>
          </div>
        </section>
      </main>
    );
  }

  const leftHintOpacity  = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));
  const rightHintOpacity = Math.max(0, Math.min(1,  dragX / SWIPE_THRESHOLD));
  const cardRotate       = (dragX / 400) * 12;  // max ~12° tilt
  const cardScale        = isDragging ? 1.02 : 1;

  return (
    <main className="study-shell">
      {/* ── Offline banner ── */}
      {offline && (
        <div className="offline-banner">
          📵 Đang offline — tiến độ sẽ được đồng bộ khi có mạng
        </div>
      )}

      {/* ── Header ── */}
      <header className="study-header">
        <div>
          <div className="eyebrow">SM-2 Spaced Repetition</div>
          <h1 className="study-title">Deck #{deckId}</h1>
          <p className="study-copy">Học & Tương tác thông minh</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button 
            className={`btn ${isExplainMode ? "btn-primary" : "btn-ghost"}`} 
            style={{ width: "auto" }} 
            onClick={() => setIsExplainMode(!isExplainMode)}
          >
            🤖 {isExplainMode ? "Đóng Explain" : "Explain"}
          </button>
          <button className="btn btn-secondary" style={{ width: "auto" }} onClick={() => router.push("/workspace")}>
            ← Workspace
          </button>
        </div>
      </header>

      <div className={`study-layout ${isExplainMode ? "explain-active" : ""}`}>
        {/* ── Explain Sidebar ── */}
        {isExplainMode && (
          <aside className="explain-sidebar snippet-panel">
            <div className="explain-header">
              <h3>🤖 AI Tutor</h3>
              <p className="helper-text">Hỏi thêm về flashcard này</p>
            </div>
            <div className="chat-messages">
              {chatHistory.length === 0 ? (
                <div className="empty-chat helper-text">Bắt đầu trò chuyện để hiểu sâu hơn về kiến thức trong thẻ này.</div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.role}`}>
                    {msg.text}
                  </div>
                ))
              )}
              {isChatting && <div className="chat-bubble assistant typing">AI đang viết...</div>}
              <div ref={chatBottomRef} />
            </div>
            <div className="chat-input-area">
              <input 
                className="input-field" 
                placeholder="Nhập câu hỏi của bạn..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleExplain();
                  e.stopPropagation();
                }}
              />
              <button className="btn btn-primary btn-icon" onClick={handleExplain} disabled={!chatInput.trim() || isChatting}>
                ➤
              </button>
            </div>
          </aside>
        )}

        {/* ── Study card ── */}
        {card && (
          <section className="study-card">
          {/* Progress */}
          <div className="study-top">
            <div style={{ flex: 1 }}>
              <div className="progress-row">
                <span>Thẻ {idx + 1} / {cards.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="progress-track" style={{ marginTop: 6 }}>
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="pill">
              {cards.length < 5 ? "Starter" : cards.length < 15 ? "Active" : "Deep"}
            </span>
          </div>

          <div className="study-stage">
            {/* ── Swipeable flip card ── */}
            <div className="swipe-wrapper">
              {/* Swipe hints */}
              <div className="swipe-hint swipe-hint-right" style={{ opacity: rightHintOpacity }}>
                ✓ Easy
              </div>
              <div className="swipe-hint swipe-hint-left" style={{ opacity: leftHintOpacity }}>
                ✕ Again
              </div>

              <div
                className={`flip-card-wrapper swipe-card ${isFlipped ? "flipped" : ""} ${isDragging ? "is-dragging" : ""}`}
                style={{
                  transform: `translateX(${dragX}px) rotate(${cardRotate}deg) scale(${cardScale})`,
                  cursor: isFlipped ? "grab" : "pointer",
                }}
                onClick={() => { if (!isDragging && Math.abs(dragX) < 5) setIsFlipped((f) => !f); }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { setIsDragging(false); setDragX(0); }}
              >
                <div className="flip-card-inner">
                  <article className="flip-card-front">
                    <div className="card-kicker">
                      {card.difficulty && (
                        <span className={`difficulty-badge ${card.difficulty}`} style={{ marginRight: 8 }}>
                          {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "TB" : "Khó"}
                        </span>
                      )}
                      Câu hỏi
                    </div>
                    <div className="card-body">{card.front}</div>
                    <div className="card-footnote">Nhấn để lật xem đáp án</div>
                  </article>

                  <article className="flip-card-back">
                    <div className="card-kicker" style={{ color: "var(--secondary)" }}>Đáp án</div>
                    <div className="card-body">{card.back}</div>
                    <div className="card-footnote">
                      Đánh giá độ khó bên dưới để chia lịch ôn tập
                    </div>
                  </article>
                </div>
              </div>
            </div>

            {/* ── First Card Instructions ── */}
            {idx === 0 && !isFlipped && (
              <div className="instruction-box">
                <p><strong>💡 Phím tắt (Keyboard Shortcuts)</strong></p>
                <ul className="helper-text" style={{ paddingLeft: 20, marginBottom: 0 }}>
                  <li><code>Space</code> : Lật thẻ</li>
                  <li><code>←</code> / <code>→</code> : Chuyển qua lại giữa các thẻ</li>
                  <li><code>1</code> <code>2</code> <code>3</code> <code>4</code> : Chấm điểm sau khi lật thẻ</li>
                </ul>
              </div>
            )}

            {/* ── Before flip: hint ── */}
            {!isFlipped ? (
              <div className="panel" style={{ padding: 16 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Tự kiểm tra trước</p>
                <p className="helper-text" style={{ marginBottom: 0 }}>
                  Hãy nghĩ câu trả lời trong đầu rồi nhấn thẻ để lật và so sánh.
                </p>
              </div>
            ) : (
              /* ── After flip: rating buttons ── */
              <div className="panel" style={{ padding: 18 }}>
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Mức độ khó của thẻ này?</p>
                <div className="rating-grid">
                  {([0, 1, 2, 3] as const).map((q) => {
                    const r = RATING[q];
                    const isActive = ratingQuality === q;
                    return (
                      <button
                        key={q}
                        className={`rating-btn ${r.cls}`}
                        onClick={() => handleRate(q)}
                        style={{ opacity: isActive ? 0.5 : 1, transform: isActive ? "scale(0.95)" : undefined }}
                      >
                        {r.label}
                        <span>{r.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {msg && (
              <div className="panel" style={{ padding: 16, textAlign: "center" }}>
                <p style={{ fontWeight: 700, marginBottom: 0 }}>{msg}</p>
              </div>
            )}
          </div>
        </section>
      )}
      </div>
    </main>
  );
}
