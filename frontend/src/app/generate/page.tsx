"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  bulkCreateCards,
  Deck,
  fetchDecks,
  getStoredUser,
  previewCards,
  PreviewCard,
  User,
} from "../../lib/app-client";

type EditState = {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
};

type Stage = "setup" | "loading" | "preview" | "saved";

export default function GeneratePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<Stage>("setup");
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [targetCount, setTargetCount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void loadDecks(storedUser.id);
  }, [router]);

  const loadDecks = async (userId: number) => {
    try {
      const d = await fetchDecks(userId);
      setDecks(d);
      const qId = Number(new URLSearchParams(window.location.search).get("deckId"));
      setSelectedDeckId(
        Number.isFinite(qId) && qId > 0 ? qId : (d[0]?.id ?? null)
      );
    } catch {
      setMessage("Không tải được danh sách deck.");
    }
  };

  // ── File drop / pick ──────────────────────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") setFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  // ── Generate (preview – does NOT save to DB) ──────────────────────────────
  const handleGenerate = async () => {
    if (!selectedDeckId) { setMessage("Hãy chọn một deck."); return; }
    if (!file) { setMessage("Hãy chọn file PDF."); return; }

    setStage("loading");
    setMessage(null);
    setProgress(0);

    // Fake progress ticker while waiting for LLM
    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 90));
    }, 600);

    try {
      const generated = await previewCards(selectedDeckId, file, targetCount);
      clearInterval(ticker);
      setProgress(100);
      setCards(generated);
      setStage("preview");
    } catch (err) {
      clearInterval(ticker);
      const detail = err instanceof Error ? err.message : "Lỗi không xác định";
      setMessage(`Không sinh được flashcards: ${detail}`);
      setStage("setup");
    }
  };

  // ── Card editing ──────────────────────────────────────────────────────────
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditState({ ...cards[idx] } as EditState);
  };

  const saveEdit = () => {
    if (editingIdx === null || !editState) return;
    const updated = [...cards];
    updated[editingIdx] = editState;
    setCards(updated);
    setEditingIdx(null);
    setEditState(null);
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditState(null);
  };

  const removeCard = (idx: number) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) { setEditingIdx(null); setEditState(null); }
  };

  const addCard = () => {
    setCards((prev) => [...prev, { front: "", back: "", difficulty: "medium" }]);
    setEditingIdx(cards.length);
    setEditState({ front: "", back: "", difficulty: "medium" });
  };

  // ── Save to DB ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedDeckId) return;
    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) { setMessage("Chưa có thẻ hợp lệ để lưu."); return; }

    try {
      await bulkCreateCards(selectedDeckId, validCards);
      setStage("saved");
      setMessage(`Đã lưu ${validCards.length} flashcards vào deck!`);
    } catch {
      setMessage("Lỗi khi lưu thẻ. Hãy thử lại.");
    }
  };

  if (!user) return null;

  // ── Difficulty distribution ───────────────────────────────────────────────
  const diffCount = cards.reduce(
    (acc, c) => { acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <AppShell user={user}>
      {/* ── Setup stage ── */}
      {stage === "setup" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow">⚡ AI Flashcard Generator</div>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,3rem)", letterSpacing: "-0.05em", margin: "10px 0 8px" }}>
              Tải lên tài liệu,{" "}
              <span className="gradient-text">AI làm phần còn lại</span>
            </h1>
            <p className="muted">
              Upload PDF → AI tạo đến {targetCount} flashcards → Bạn xem lại và chỉnh sửa → Lưu vào deck.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,0.55fr)", gap: 20 }}>
            <section className="panel">
              <h3 style={{ marginBottom: 16 }}>Cấu hình</h3>

              {/* Deck selector */}
              <label style={{ display: "block", marginBottom: 16 }}>
                <span className="helper-text" style={{ display: "block", marginBottom: 6 }}>Chọn deck đích</span>
                <select
                  className="select-field"
                  value={selectedDeckId ?? ""}
                  onChange={(e) => setSelectedDeckId(Number(e.target.value))}
                >
                  {decks.length === 0 && <option value="">— Chưa có deck —</option>}
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>

              {/* Card count target */}
              <label style={{ display: "block", marginBottom: 20 }}>
                <span className="helper-text" style={{ display: "block", marginBottom: 6 }}>
                  Số flashcards mục tiêu: <strong>{targetCount}</strong>
                </span>
                <input
                  type="range"
                  min={10} max={150} step={10}
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="helper-text">10</span>
                  <span className="helper-text">150</span>
                </div>
              </label>

              {/* Upload zone */}
              <div
                className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <div style={{ fontSize: "2rem" }}>📄</div>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>{file.name}</p>
                    <p className="helper-text">{(file.size / 1024 / 1024).toFixed(1)} MB — Nhấn để chọn file khác</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📂</div>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>Kéo thả hoặc nhấn để chọn PDF</p>
                    <p className="helper-text">Hỗ trợ file PDF — AI sẽ đọc toàn bộ nội dung</p>
                  </>
                )}
              </div>

              {message && (
                <p className="helper-text" style={{ color: "var(--danger)", marginTop: 10 }}>{message}</p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={!file || !selectedDeckId}
                  style={{ flex: 1 }}
                >
                  ⚡ Sinh {targetCount} flashcards
                </button>
                {decks.length === 0 && (
                  <button
                    className="btn btn-secondary"
                    style={{ width: "auto" }}
                    onClick={() => router.push("/workspace")}
                  >
                    Tạo deck trước
                  </button>
                )}
              </div>
            </section>

            <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
              <section className="panel">
                <h3 style={{ marginBottom: 12 }}>Luồng hoạt động</h3>
                <div className="step-list">
                  {[
                    { n: "1", t: "Chọn deck & upload PDF" },
                    { n: "2", t: "AI trích xuất & tạo thẻ" },
                    { n: "3", t: "Xem lại, sửa hoặc xóa thẻ" },
                    { n: "4", t: "Lưu vào deck → Bắt đầu học" },
                  ].map((s) => (
                    <div key={s.n} className="step-item">
                      <div className="step-index">{s.n}</div>
                      <div style={{ paddingTop: 6 }}><strong>{s.t}</strong></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h3 style={{ marginBottom: 8 }}>AI tạo gì?</h3>
                <div className="feature-list">
                  {[
                    { icon: "❓", t: "Câu hỏi từ khái niệm chính" },
                    { icon: "✅", t: "Câu trả lời chính xác" },
                    { icon: "🎯", t: "Phân loại: Easy / Medium / Hard" },
                  ].map((f) => (
                    <div key={f.t} className="feature-item">
                      <div className="feature-icon" style={{ fontSize: "1rem" }}>{f.icon}</div>
                      <div style={{ paddingTop: 4 }}><span>{f.t}</span></div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {/* ── Loading stage ── */}
      {stage === "loading" && (
        <div style={{ display: "grid", placeItems: "center", minHeight: "50vh", gap: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🤖</div>
            <h2 style={{ letterSpacing: "-0.04em", marginBottom: 8 }}>AI đang đọc tài liệu…</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              Đang trích xuất khái niệm và tạo {targetCount} flashcards. Có thể mất 30–60 giây.
            </p>
            <div className="progress-track" style={{ width: 300, maxWidth: "100%", margin: "0 auto" }}>
              <div className="progress-bar" style={{ width: `${progress}%`, background: "linear-gradient(90deg,var(--primary),#f59e0b)" }} />
            </div>
            <p className="helper-text" style={{ marginTop: 8 }}>{Math.round(progress)}%</p>
          </div>
        </div>
      )}

      {/* ── Preview stage ── */}
      {stage === "preview" && (
        <>
          {/* Preview header */}
          <div className="preview-header">
            <div>
              <div className="eyebrow">✏️ Xem lại trước khi lưu</div>
              <h2 style={{ margin: "8px 0 4px", letterSpacing: "-0.04em" }}>
                {cards.length} flashcards được tạo
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(diffCount).map(([d, n]) => (
                  <span key={d} className={`difficulty-badge ${d}`}>
                    {d === "easy" ? "Dễ" : d === "medium" ? "Trung bình" : "Khó"}: {n}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" style={{ width: "auto" }} onClick={addCard}>
                + Thêm thẻ
              </button>
              <button className="btn btn-secondary" style={{ width: "auto" }} onClick={() => setStage("setup")}>
                Làm lại
              </button>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleSave}>
                💾 Lưu vào deck
              </button>
            </div>
          </div>

          {message && (
            <p className="helper-text" style={{ color: "var(--danger)", marginBottom: 14 }}>{message}</p>
          )}

          {/* Editable card grid */}
          <div className="preview-grid">
            {cards.map((card, idx) => (
              <div key={idx} className={`preview-card ${editingIdx === idx ? "editing" : ""}`}>
                {editingIdx === idx && editState ? (
                  // ── Edit mode ──
                  <>
                    <div>
                      <label className="helper-text" style={{ display: "block", marginBottom: 4 }}>Câu hỏi (Front)</label>
                      <textarea
                        className="textarea-field"
                        style={{ minHeight: 80 }}
                        value={editState.front}
                        onChange={(e) => setEditState({ ...editState, front: e.target.value })}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="helper-text" style={{ display: "block", marginBottom: 4 }}>Câu trả lời (Back)</label>
                      <textarea
                        className="textarea-field"
                        style={{ minHeight: 80 }}
                        value={editState.back}
                        onChange={(e) => setEditState({ ...editState, back: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="helper-text" style={{ display: "block", marginBottom: 6 }}>Độ khó</label>
                      <div className="tab-row">
                        {(["easy", "medium", "hard"] as const).map((d) => (
                          <button
                            key={d}
                            className={`tab-chip ${editState.difficulty === d ? "active" : ""}`}
                            onClick={() => setEditState({ ...editState, difficulty: d })}
                          >
                            {d === "easy" ? "Dễ" : d === "medium" ? "TB" : "Khó"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="preview-card-actions">
                      <button className="btn btn-ghost btn-icon" onClick={cancelEdit}>✕</button>
                      <button className="btn btn-primary btn-icon" onClick={saveEdit}>✓</button>
                    </div>
                  </>
                ) : (
                  // ── Display mode ──
                  <>
                    <div>
                      <span className={`difficulty-badge ${card.difficulty}`} style={{ marginBottom: 8, display: "inline-block" }}>
                        {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "Trung bình" : "Khó"}
                      </span>
                      <p style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.92rem" }}>{card.front}</p>
                      <p className="helper-text" style={{ marginBottom: 0 }}>{card.back}</p>
                    </div>
                    <div className="preview-card-actions">
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ color: "var(--danger)" }}
                        onClick={() => removeCard(idx)}
                        title="Xóa thẻ"
                      >
                        🗑
                      </button>
                      <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => startEdit(idx)}
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Saved stage ── */}
      {stage === "saved" && (
        <div style={{ display: "grid", placeItems: "center", minHeight: "50vh", gap: 20, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🎉</div>
            <h2 style={{ letterSpacing: "-0.04em", marginBottom: 8 }}>{message}</h2>
            <p className="muted" style={{ marginBottom: 28 }}>
              Deck đã sẵn sàng — hãy bắt đầu phiên học đầu tiên.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ width: "auto" }}
                onClick={() => selectedDeckId && router.push(`/study/${selectedDeckId}`)}
              >
                🔁 Học ngay
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => { setStage("setup"); setFile(null); setCards([]); setMessage(null); }}
              >
                Upload tài liệu khác
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
