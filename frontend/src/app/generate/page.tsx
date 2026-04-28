"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  bulkCreateCards,
  Deck,
  fetchDecks,
  useStoredUser,
  previewCards,
  PreviewCard,
} from "../../lib/app-client";
import {
  Sparkles,
  Upload,
  FileText,
  X,
  Settings2,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Save,
  FileUp,
  BrainCircuit,
  Pencil,
  Repeat
} from "lucide-react";
import { cn } from "../../lib/utils";

type EditState = {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
};

type Stage = "setup" | "loading" | "preview" | "saved";

export default function GeneratePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useStoredUser();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<Stage>("setup");
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [targetCount, setTargetCount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const loadDecks = useCallback(async (userId: number) => {
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
  }, []);

  useEffect(() => {
    if (!user) { router.replace("/"); return; }
    const t = setTimeout(() => { void loadDecks(user.id); }, 0);
    return () => clearTimeout(t);
  }, [loadDecks, router, user]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
       f.type === "application/pdf" ||
       f.type === "text/plain" ||
       f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
       f.name.endsWith(".txt") || f.name.endsWith(".docx") || f.name.endsWith(".pdf")
    );
    if (dropped.length > 0) setFiles(prev => [...prev, ...dropped]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) setFiles(prev => [...prev, ...selected]);
  };

  const handleGenerate = async () => {
    if (!selectedDeckId) { setMessage("Hãy chọn một deck."); return; }
    if (files.length === 0) { setMessage("Hãy chọn ít nhất 1 file hợp lệ (PDF, DOCX, TXT)."); return; }

    setStage("loading");
    setMessage(null);
    setProgress(0);

    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 90));
    }, 600);

    try {
      const generated = await previewCards(selectedDeckId, files, targetCount);
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

  const diffCount = cards.reduce(
    (acc, c) => { acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <AppShell user={user}>
      {stage === "setup" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-border text-muted-foreground text-[0.82rem] font-semibold mb-3.5">
              <Sparkles className="w-4 h-4 text-primary" /> Tạo Flashcard AI
            </div>
            <h1 className="text-[clamp(1.8rem,4vw,3.2rem)] font-extrabold tracking-[-0.05em] mb-2.5 leading-tight">
              Tải lên tài liệu,{" "}
              <span className="text-primary">AI làm phần còn lại</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-[64ch] leading-relaxed">
              Upload PDF → AI tạo đến <strong className="text-foreground">{targetCount}</strong> flashcards → Bạn xem lại và chỉnh sửa → Lưu vào deck.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <section className="p-8 bg-surface-raised border border-border rounded-[32px] shadow-sm backdrop-blur-xl">
              <h3 className="mb-6 font-bold text-xl flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-subtle" /> Cấu hình
              </h3>

              <div className="grid gap-6">
                <div>
                  <label className="block text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider mb-2">Chọn deck đích</label>
                  <select
                    className="w-full rounded-2xl border border-border-strong bg-surface text-foreground px-4 py-3.5 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[0.95rem] appearance-none cursor-pointer"
                    value={selectedDeckId ?? ""}
                    onChange={(e) => setSelectedDeckId(Number(e.target.value))}
                  >
                    {decks.length === 0 && <option value="">— Chưa có deck —</option>}
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider">Số flashcards mục tiêu</label>
                    <span className="text-primary font-extrabold text-lg">{targetCount}</span>
                  </div>
                  <input
                    type="range"
                    min={10} max={500} step={10}
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full h-2 bg-surface-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2 text-[0.75rem] font-bold text-subtle">
                    <span>10</span>
                    <span>500</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-[28px] p-10 flex flex-col items-center justify-center gap-4 transition-all duration-200 cursor-pointer group overflow-hidden",
                    dragOver ? "border-primary bg-primary/5" : "border-border-strong bg-surface hover:border-primary/50 hover:bg-surface-muted",
                    files.length > 0 ? "border-secondary/30 bg-secondary/5" : ""
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {files.length > 0 ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg mb-1">Đã tải lên {files.length} file</p>
                        <div className="max-h-[120px] overflow-y-auto px-4 custom-scrollbar">
                          {files.map(f => (
                            <div key={f.name} className="text-[0.82rem] text-muted-foreground truncate max-w-[200px] flex items-center gap-1.5 justify-center">
                              <FileText className="w-3.5 h-3.5 opacity-60" /> {f.name}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[0.82rem] font-bold text-secondary uppercase tracking-widest mt-2">Nhấn để thêm file mới</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-surface-muted flex items-center justify-center text-subtle group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg mb-1">Kéo thả hoặc nhấn để chọn file</p>
                        <p className="text-muted-foreground text-[0.88rem]">Hỗ trợ PDF, DOCX, TXT. Dung lượng tối đa 10MB/file.</p>
                      </div>
                    </>
                  )}
                </div>

                {message && (
                  <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3">
                    <X className="w-5 h-5 text-danger flex-shrink-0" />
                    <p className="text-danger text-[0.88rem] font-medium leading-[1.5]">{message}</p>
                  </div>
                )}

                <div className="flex gap-4 mt-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 appearance-none border-0 rounded-2xl px-6 py-4 cursor-pointer font-extrabold text-[1rem] transition-all text-white bg-primary shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:bg-primary/90 hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handleGenerate}
                    disabled={files.length === 0 || !selectedDeckId}
                  >
                    <Sparkles className="w-5 h-5" /> Sinh {targetCount} flashcards
                  </button>
                </div>
              </div>
            </section>

            <aside className="grid gap-6 content-start">
              <section className="p-6 bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl">
                <h3 className="mb-4 font-bold text-lg">Luồng hoạt động</h3>
                <div className="grid gap-4">
                  {[
                    { n: "1", t: "Chọn deck & upload PDF" },
                    { n: "2", t: "AI trích xuất & tạo thẻ" },
                    { n: "3", t: "Xem lại, sửa hoặc xóa thẻ" },
                    { n: "4", t: "Lưu vào deck → Bắt đầu học" },
                  ].map((s) => (
                    <div key={s.n} className="flex gap-3 items-start">
                      <div className="flex-none w-8 h-8 rounded-lg grid place-items-center font-extrabold text-[0.88rem] bg-primary/10 text-primary">
                        {s.n}
                      </div>
                      <div className="pt-1.5"><strong className="text-sm font-semibold leading-tight block">{s.t}</strong></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="p-6 bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl">
                <h3 className="mb-4 font-bold text-lg">AI tạo gì?</h3>
                <div className="grid gap-4">
                  {[
                    { icon: Sparkles, t: "Câu hỏi từ khái niệm chính", c: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
                    { icon: Check, t: "Câu trả lời chính xác", c: "text-green-600 bg-green-50 dark:bg-green-500/10" },
                    { icon: BrainCircuit, t: "Phân loại độ khó thông minh", c: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" },
                  ].map((f) => {
                    const Icon = f.icon;
                    return (
                      <div key={f.t} className="flex gap-3 items-center">
                        <div className={cn("flex-none w-8 h-8 rounded-lg grid place-items-center", f.c)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-[0.88rem] font-bold text-foreground leading-snug m-0">{f.t}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {stage === "loading" && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
          <div className="relative mb-10">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">AI đang đọc tài liệu…</h2>
          <p className="text-muted-foreground text-lg max-w-[50ch] mb-10 leading-relaxed">
            Đang trích xuất khái niệm và tạo <strong className="text-foreground">{targetCount} flashcards</strong>.<br />Quá trình này có thể mất 30–60 giây.
          </p>

          <div className="w-full max-w-[400px]">
            <div className="h-3 w-full bg-surface-muted rounded-full overflow-hidden border border-border shadow-inner">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 px-1">
              <span className="text-[0.82rem] font-bold text-subtle uppercase tracking-widest">Đang xử lý</span>
              <span className="text-[0.82rem] font-extrabold text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      )}

      {stage === "preview" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 sticky top-[-32px] md:top-[-40px] z-40 bg-background/80 backdrop-blur-xl py-6 border-b border-border/50">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-border text-muted-foreground text-[0.82rem] font-semibold mb-2">
                <Pencil className="w-3.5 h-3.5" /> Xem lại trước khi lưu
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2.5">
                {cards.length} flashcards được tạo
              </h2>
              <div className="flex gap-2.5 flex-wrap">
                {Object.entries(diffCount).map(([d, n]) => (
                  <span key={d} className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-bold tracking-tight",
                    d === "easy" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" :
                    d === "medium" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                    "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  )}>
                    {d === "easy" ? "Dễ" : d === "medium" ? "TB" : "Khó"}: {n}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-border-strong bg-surface text-foreground font-bold text-[0.92rem] hover:-translate-y-px transition-all shadow-xs"
                onClick={addCard}
              >
                <Plus className="w-4 h-4" /> Thêm thẻ
              </button>
              <button
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-border-strong bg-surface/70 text-muted-foreground font-bold text-[0.92rem] hover:bg-surface hover:-translate-y-px transition-all"
                onClick={() => setStage("setup")}
              >
                <RotateCcw className="w-4 h-4" /> Làm lại
              </button>
              <button
                className="flex-[1.5] md:flex-none flex items-center justify-center gap-2 px-7 py-3 border-0 rounded-2xl font-bold text-[0.95rem] transition-all text-white bg-primary shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:bg-primary/90 hover:-translate-y-px active:translate-y-0"
                onClick={handleSave}
              >
                <Save className="w-4 h-4" /> Lưu tất cả
              </button>
            </div>
          </div>

          {message && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 mb-6">
              <X className="w-5 h-5 text-danger flex-shrink-0" />
              <p className="text-danger text-[0.88rem] font-medium leading-[1.5] m-0">{message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-[22px] flex flex-col gap-4 bg-surface-raised border border-border rounded-2xl shadow-sm transition-all duration-300",
                  editingIdx === idx ? "ring-2 ring-primary border-primary bg-surface shadow-xl scale-[1.02] z-10" : "hover:border-primary/40"
                )}
              >
                {editingIdx === idx && editState ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu hỏi (Front)</label>
                        <textarea
                          className="w-full rounded-xl border border-primary/30 bg-surface text-text px-4 py-3 outline-none focus:ring-2 focus:ring-primary/10 text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                          value={editState.front}
                          onChange={(e) => setEditState({ ...editState, front: e.target.value })}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu trả lời (Back)</label>
                        <textarea
                          className="w-full rounded-xl border border-primary/30 bg-surface text-text px-4 py-3 outline-none focus:ring-2 focus:ring-primary/10 text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                          value={editState.back}
                          onChange={(e) => setEditState({ ...editState, back: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Độ khó</label>
                        <div className="flex gap-2">
                          {(["easy", "medium", "hard"] as const).map((d) => (
                            <button
                              key={d}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-tighter transition-all",
                                editState.difficulty === d
                                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                                  : "bg-surface text-muted-foreground border border-border hover:bg-surface-muted"
                              )}
                              onClick={() => setEditState({ ...editState, difficulty: d })}
                            >
                              {d === "easy" ? "Dễ" : d === "medium" ? "TB" : "Khó"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl border border-border text-muted-foreground font-bold text-sm hover:bg-surface-muted transition-all"
                        onClick={cancelEdit}
                      >
                        Hủy
                      </button>
                      <button
                        className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-white font-bold text-sm hover:opacity-90 shadow-sm transition-all"
                        onClick={saveEdit}
                      >
                        <Check className="w-4 h-4" /> Hoàn tất
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-bold tracking-tight mb-3",
                        card.difficulty === "easy" ? "bg-green-100 text-green-700 dark:text-green-400" :
                        card.difficulty === "medium" ? "bg-amber-100 text-amber-700 dark:text-amber-400" :
                        "bg-red-100 text-red-700"
                      )}>
                        {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "Trung bình" : "Khó"}
                      </span>
                      <p className="font-extrabold text-[0.95rem] leading-snug mb-2 text-foreground line-clamp-3">{card.front}</p>
                      <p className="text-muted-foreground text-[0.88rem] leading-relaxed m-0 line-clamp-4">{card.back}</p>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border/50">
                      <button
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-danger bg-[#fff1f2] dark:bg-danger/10 border border-danger/10 hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all"
                        onClick={() => removeCard(idx)}
                        title="Xóa thẻ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        className="h-10 px-4 rounded-xl flex items-center justify-center gap-1.5 text-secondary border border-secondary/20 bg-secondary/5 font-bold text-[0.85rem] hover:bg-secondary/10 hover:-translate-y-px active:translate-y-0 transition-all"
                        onClick={() => startEdit(idx)}
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <button
              onClick={addCard}
              className="p-[22px] min-h-[220px] flex flex-col items-center justify-center gap-3 bg-transparent border-2 border-dashed border-border-strong rounded-2xl text-subtle hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm tracking-wide uppercase">Thêm thẻ mới</span>
            </button>
          </div>
        </div>
      )}

      {stage === "saved" && (
        <div className="mt-10 p-10 bg-surface border border-border rounded-[40px] shadow-sm text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Đã lưu thành công!</h2>
          <p className="text-muted-foreground mb-8 italic">Các thẻ flashcards mới đã sẵn sàng để bạn chinh phục.</p>
          <div className="flex justify-center gap-3">
            <button
              className="btn btn-primary"
              style={{ width: "auto" }}
              onClick={() => selectedDeckId && router.push(`/study/${selectedDeckId}`)}
            >
              <Repeat className="w-4 h-4" /> Học ngay
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: "auto" }}
              onClick={() => { setStage("setup"); setFiles([]); setCards([]); setMessage(null); }}
            >
              Upload tài liệu khác
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
