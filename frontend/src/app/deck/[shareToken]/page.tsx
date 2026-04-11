"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Deck, fetchSharedDeck } from "../../../lib/app-client";

export default function SharedDeckPage() {
  const params = useParams<{ shareToken: string }>();
  const router = useRouter();
  const [deck,    setDeck]    = useState<Deck | null>(null);
  const [cards,   setCards]   = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    fetchSharedDeck(params.shareToken)
      .then(({ deck: d, cards: c }) => { setDeck(d); setCards(c); })
      .catch(() => setError("Deck không tồn tại hoặc chưa được chia sẻ."))
      .finally(() => setLoading(false));
  }, [params.shareToken]);

  const filtered = cards.filter(
    (c) =>
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase())
  );

  const diffCount = cards.reduce(
    (acc, c) => { const d = c.difficulty ?? "medium"; acc[d] = (acc[d] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner spinner-dark" style={{ margin: "0 auto 16px" }} />
          <p className="muted">Đang tải bộ thẻ…</p>
        </div>
      </main>
    );
  }

  if (error || !deck) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div className="panel" style={{ maxWidth: 440, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔒</div>
          <h2 style={{ letterSpacing: "-0.04em", marginBottom: 8 }}>Không tìm thấy bộ thẻ</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            {error ?? "Link không hợp lệ hoặc bộ thẻ đã tắt chia sẻ."}
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/")}>
            Về trang chủ
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Header ── */}
      <header style={{
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div className="brand-lockup">
          <div className="brand-mark">AI</div>
          <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.04em" }}>FlashAI</span>
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => router.push("/")}>
          Tạo deck của bạn →
        </button>
      </header>

      <div style={{ width: "min(1100px, calc(100% - 32px))", margin: "0 auto", padding: "28px 0 56px" }}>
        {/* ── Deck info ── */}
        <section className="hero-card" style={{ marginBottom: 24 }}>
          <div className="eyebrow">🌐 Bộ thẻ được chia sẻ</div>
          <h1 style={{ fontSize: "clamp(1.6rem,4vw,3rem)", letterSpacing: "-0.05em", margin: "10px 0 8px" }}>
            {deck.name}
          </h1>
          {deck.description && (
            <p className="muted" style={{ marginBottom: 16 }}>{deck.description}</p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span className="pill" style={{ background: "#f0fdf9", color: "var(--secondary)" }}>
              🃏 {cards.length} flashcards
            </span>
            {Object.entries(diffCount).map(([d, n]) => (
              <span key={d} className={`difficulty-badge ${d}`}>
                {d === "easy" ? "Dễ" : d === "medium" ? "Trung bình" : "Khó"}: {n}
              </span>
            ))}
          </div>
        </section>

        {/* ── Search ── */}
        <div style={{ marginBottom: 20 }}>
          <input
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm flashcard…"
            style={{ maxWidth: 480 }}
          />
        </div>

        {/* ── Cards grid (flip on click) ── */}
        <div className="preview-grid" style={{ maxHeight: "none" }}>
          {filtered.map((card, i) => {
            const isFlip = flipped[i] ?? false;
            return (
              <div
                key={card.id ?? i}
                className="flip-card-wrapper"
                style={{ minHeight: 180, cursor: "pointer" }}
                onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
              >
                <div className={`flip-card-inner ${isFlip ? "flipped" : ""}`} style={{ minHeight: 180 }}>
                  <article
                    className="flip-card-front"
                    style={{ minHeight: 180, justifyContent: "center", gap: 12 }}
                  >
                    {card.difficulty && (
                      <span className={`difficulty-badge ${card.difficulty}`} style={{ alignSelf: "flex-start" }}>
                        {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "Trung bình" : "Khó"}
                      </span>
                    )}
                    <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.4, flex: 1, display: "flex", alignItems: "center" }}>
                      {card.front}
                    </div>
                    <div className="card-footnote">Nhấn để xem đáp án</div>
                  </article>
                  <article
                    className="flip-card-back"
                    style={{ minHeight: 180, justifyContent: "center", gap: 12 }}
                  >
                    <div className="card-kicker">Đáp án</div>
                    <div style={{ fontSize: "0.95rem", lineHeight: 1.5, flex: 1, display: "flex", alignItems: "center" }}>
                      {card.back}
                    </div>
                    <div className="card-footnote">Nhấn để lật lại</div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <p>Không tìm thấy thẻ phù hợp.</p>
          </div>
        )}

        {/* ── CTA to sign up ── */}
        <div className="panel" style={{ marginTop: 32, textAlign: "center", padding: 36 }}>
          <h3 style={{ letterSpacing: "-0.04em", marginBottom: 8 }}>
            Muốn học với Spaced Repetition?
          </h3>
          <p className="muted" style={{ marginBottom: 20 }}>
            Đăng nhập để lưu deck này, ôn tập với thuật toán SM-2 và theo dõi tiến độ của bạn.
          </p>
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => router.push("/")}>
            Bắt đầu miễn phí →
          </button>
        </div>
      </div>
    </main>
  );
}
