"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  createDeck,
  Deck,
  deleteDeck,
  disableDeckSharing,
  enableDeckSharing,
  fetchDeckCards,
  fetchDecks,
  getStoredUser,
  User,
} from "../../lib/app-client";

function shareUrl(token: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/deck/${token}`;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [user,          setUser]          = useState<User | null>(null);
  const [decks,         setDecks]         = useState<Deck[]>([]);
  const [cardCounts,    setCardCounts]    = useState<Record<number, number>>({});
  const [newDeckName,   setNewDeckName]   = useState("");
  const [newDeckDesc,   setNewDeckDesc]   = useState("");
  const [creating,      setCreating]      = useState(false);
  const [shareModal,    setShareModal]    = useState<Deck | null>(null);
  const [copied,        setCopied]        = useState(false);
  const [msg,           setMsg]           = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void hydrate(storedUser.id);
  }, [router]);

  const hydrate = async (userId: number) => {
    try {
      const d = await fetchDecks(userId);
      setDecks(d);
      const counts = await Promise.all(
        d.map(async (deck) => {
          try {
            const cards = await fetchDeckCards(deck.id, userId);
            return [deck.id, cards.length] as const;
          } catch {
            return [deck.id, 0] as const;
          }
        })
      );
      setCardCounts(Object.fromEntries(counts));
    } catch {
      setMsg("Không tải được workspace. Hãy kiểm tra backend.");
    }
  };

  const totalCards  = useMemo(() => Object.values(cardCounts).reduce((s, n) => s + n, 0), [cardCounts]);
  const readyDecks  = useMemo(() => decks.filter((d) => (cardCounts[d.id] ?? 0) > 0).length, [decks, cardCounts]);

  const handleCreateDeck = async () => {
    if (!user || !newDeckName.trim()) return;
    setCreating(true);
    try {
      await createDeck(user.id, newDeckName.trim(), newDeckDesc.trim());
      setNewDeckName(""); setNewDeckDesc(""); setMsg(null);
      await hydrate(user.id);
    } catch {
      setMsg("Không tạo được deck.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeck = async (deckId: number) => {
    if (!confirm("Xóa deck này? Tất cả flashcards sẽ bị xóa.")) return;
    try {
      await deleteDeck(deckId);
      if (user) await hydrate(user.id);
    } catch {
      setMsg("Không xóa được deck.");
    }
  };

  const handleShare = async (deck: Deck) => {
    if (deck.share_token) {
      setShareModal(deck);
      return;
    }
    try {
      const token = await enableDeckSharing(deck.id);
      const updated = decks.map((d) => d.id === deck.id ? { ...d, share_token: token, is_public: 1 } : d);
      setDecks(updated);
      setShareModal({ ...deck, share_token: token, is_public: 1 });
    } catch {
      setMsg("Không kích hoạt được chia sẻ.");
    }
  };

  const handleUnshare = async (deckId: number) => {
    await disableDeckSharing(deckId).catch(() => {});
    const updated = decks.map((d) => d.id === deckId ? { ...d, share_token: undefined, is_public: 0 } : d);
    setDecks(updated);
    setShareModal(null);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(shareUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <AppShell user={user}>
      {/* ── Summary hero ── */}
      <section className="hero">
        <div className="hero-card">
          <div className="eyebrow">🗂️ Deck Management</div>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,3.2rem)", letterSpacing: "-0.05em", margin: "10px 0 10px" }}>
            Xin chào, {user.name.split(" ").pop()} 👋
          </h1>
          <p className="hero-copy">
            Mỗi deck là một chủ đề học độc lập. Tạo deck, upload tài liệu rồi học với Smart Review.
          </p>
          <div className="hero-grid">
            <div className="metric-card">
              <div className="metric-label">Tổng deck</div>
              <div className="metric-value">{decks.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Tổng flashcards</div>
              <div className="metric-value">{totalCards}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Deck sẵn sàng</div>
              <div className="metric-value">{readyDecks}</div>
            </div>
          </div>
        </div>

        <aside className="hero-sidebar">
          <section className="panel">
            <h3 style={{ marginBottom: 14 }}>Tạo deck mới</h3>
            <input
              className="input-field"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Tên deck (VD: IELTS Writing, Nội khoa…)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
              style={{ marginBottom: 10 }}
            />
            <input
              className="input-field"
              value={newDeckDesc}
              onChange={(e) => setNewDeckDesc(e.target.value)}
              placeholder="Mô tả ngắn (tuỳ chọn)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
              style={{ marginBottom: 14 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleCreateDeck}
              disabled={creating || !newDeckName.trim()}
            >
              {creating ? <><div className="spinner" />Đang tạo…</> : "+ Tạo deck"}
            </button>
            {msg && <p className="helper-text" style={{ marginTop: 10, color: "var(--danger)" }}>{msg}</p>}
          </section>

          <section className="panel">
            <h3 style={{ marginBottom: 12 }}>Quy trình học</h3>
            <div className="step-list">
              {[
                { n: "1", t: "Tạo deck tại Workspace" },
                { n: "2", t: "Upload tài liệu ở Generator" },
                { n: "3", t: "Ôn tập tại Study" },
                { n: "4", t: "Theo dõi tiến độ ở Analytics" },
              ].map((s) => (
                <div key={s.n} className="step-item">
                  <div className="step-index">{s.n}</div>
                  <div style={{ paddingTop: 6 }}><strong>{s.t}</strong></div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {/* ── Deck list ── */}
      <section className="panel">
        <div className="section-head">
          <div>
            <h2 style={{ marginBottom: 4 }}>Danh sách Deck</h2>
            <p style={{ marginBottom: 0 }}>
              {decks.length === 0 ? "Chưa có deck nào — hãy tạo deck đầu tiên ở trên." : `${decks.length} deck`}
            </p>
          </div>
        </div>

        {decks.length > 0 && (
          <div className="deck-grid">
            {decks.map((deck) => {
              const count   = cardCounts[deck.id] ?? 0;
              const isReady = count > 0;
              const barW    = isReady ? Math.min(100, 15 + count * 4) : 5;
              return (
                <article key={deck.id} className="deck-card">
                  {/* Meta */}
                  <div className="deck-meta">
                    <span className={`pill ${deck.is_public ? "public" : "private"}`}>
                      {deck.is_public ? "🌐 Public" : "🔒 Private"}
                    </span>
                  </div>

                  {/* Title + desc */}
                  <div>
                    <h3 className="deck-title" style={{ marginBottom: 4 }}>{deck.name}</h3>
                    {deck.description && (
                      <p className="deck-description" style={{ marginTop: 0 }}>{deck.description}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="progress-row">
                      <span>{count} flashcards</span>
                      <span style={{ color: isReady ? "var(--success)" : "var(--muted)" }}>
                        {isReady ? "Ready" : "Empty"}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-bar" style={{ width: `${barW}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="deck-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => router.push(`/generate?deckId=${deck.id}`)}
                    >
                      ⚡ Generator
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => router.push(`/study/${deck.id}`)}
                      disabled={!isReady}
                    >
                      🔁 Học ngay
                    </button>
                  </div>

                  {/* Share + Delete (small row) */}
                  <div style={{ display: "flex", gap: 8, marginTop: -4 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, padding: "8px 12px", fontSize: "0.82rem" }}
                      onClick={() => handleShare(deck)}
                    >
                      🔗 {deck.share_token ? "Chia sẻ" : "Bật chia sẻ"}
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ width: "auto", padding: "8px 12px", fontSize: "0.82rem" }}
                      onClick={() => handleDeleteDeck(deck.id)}
                    >
                      🗑
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Share modal ── */}
      {shareModal && (
        <div className="modal-backdrop" onClick={() => setShareModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6 }}>Chia sẻ deck</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              {shareModal.share_token
                ? "Bất kỳ ai có link này đều có thể xem bộ thẻ (chỉ đọc)."
                : "Kích hoạt chia sẻ để tạo link công khai."}
            </p>

            {shareModal.share_token ? (
              <>
                <div className="share-link-box">
                  <input
                    className="share-link-input"
                    readOnly
                    value={shareUrl(shareModal.share_token)}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ width: "auto" }}
                    onClick={() => copyLink(shareModal.share_token!)}
                  >
                    {copied ? "✓ Đã chép" : "Chép link"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => handleUnshare(shareModal.id)}
                  >
                    Tắt chia sẻ
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShareModal(null)}
                  >
                    Đóng
                  </button>
                </div>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => handleShare(shareModal)}>
                🌐 Kích hoạt chia sẻ
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
