"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  bulkCreateCards,
  createDeck,
  Deck,
  fetchDecks,
  previewImageCardsNoDeck,
  useClientReady,
  useStoredUser,
  previewCardsNoDeck,
  PreviewCard,
} from "../../lib/app-client";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
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
  Repeat,
  ImagePlus,
  Lock,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../components/ui/skeleton";

type EditState = {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
};

type TextStage = "setup" | "loading" | "preview" | "saved";
type ImgStage = "setup" | "generating" | "preview" | "done" | "error";

export default function GeneratePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useStoredUser();
  const clientReady = useClientReady();

  // Shared
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"text" | "image">("text");

  // Shared: save destination (used in both modes' setup)
  const [saveTarget, setSaveTarget] = useState<"new" | "existing">("new");
  const [newDeckName, setNewDeckName] = useState("");

  // Text mode
  const [textStage, setTextStage] = useState<TextStage>("setup");
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [targetCount, setTargetCount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Image mode
  const [imgStage, setImgStage] = useState<ImgStage>("setup");
  const [imgCount, setImgCount] = useState(15);
  const [imgCards, setImgCards] = useState<PreviewCard[]>([]);
  const [imgSaving, setImgSaving] = useState(false);
  const [imgResult, setImgResult] = useState<{ saved: number; real_image: number; diagram: number } | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    try {
      const d = await fetchDecks();
      setDecks(d);
      const params = new URLSearchParams(window.location.search);
      const qId = Number(params.get("deckId"));
      const qMode = params.get("mode");
      setSelectedDeckId(Number.isFinite(qId) && qId > 0 ? qId : (d[0]?.id ?? null));
      if (qMode === "image") setMode("image");
    } catch {
      setMessage("Không tải được danh sách deck.");
    }
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    if (!user) { router.replace("/"); return; }
    const t = setTimeout(() => { void loadDecks(); }, 0);
    return () => clearTimeout(t);
  }, [clientReady, loadDecks, router, user]);

  const syncUrl = (newMode: "text" | "image", deckId: number | null) => {
    const params = new URLSearchParams();
    if (newMode !== "text") params.set("mode", newMode);
    if (deckId) params.set("deckId", String(deckId));
    const qs = params.toString();
    router.replace(`/generate${qs ? `?${qs}` : ""}`);
  };

  const switchMode = (m: "text" | "image") => {
    setMode(m);
    setSaveTarget("new");
    setNewDeckName("");
    if (m === "text") {
      setTextStage("setup");
    } else {
      setImgStage("setup");
      setImgCards([]);
      setImgResult(null);
      setImgError(null);
    }
    syncUrl(m, selectedDeckId);
  };

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
    e.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const formatFileSize = (size: number) => {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileKind = (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return "PDF";
    if (name.endsWith(".docx")) return "DOCX";
    if (name.endsWith(".txt")) return "TXT";
    return "FILE";
  };

  const isDestinationValid = saveTarget === "new" ? !!newDeckName.trim() : !!selectedDeckId;

  const resolvedDeckLabel =
    saveTarget === "new"
      ? newDeckName.trim() || "Deck mới"
      : (decks.find((d) => d.id === selectedDeckId)?.name ?? "—");

  const handleGenerate = async () => {
    if (files.length === 0) { setMessage("Hãy chọn ít nhất 1 file hợp lệ (PDF, DOCX, TXT)."); return; }

    setTextStage("loading");
    setMessage(null);
    setProgress(0);

    let ticker: ReturnType<typeof setInterval> | null = null;
    ticker = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 90));
    }, 600);

    try {
      const generated = await previewCardsNoDeck(files, targetCount);
      setProgress(100);
      setCards(generated);
      setTextStage("preview");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Lỗi không xác định";
      setMessage(`Không sinh được flashcards: ${detail}`);
      setTextStage("setup");
    } finally {
      if (ticker) clearInterval(ticker);
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
    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) { setMessage("Chưa có thẻ hợp lệ để lưu."); return; }

    try {
      let deckId: number;
      if (saveTarget === "new") {
        if (!newDeckName.trim()) { setMessage("Hãy nhập tên deck."); return; }
        deckId = await createDeck(newDeckName.trim());
        setSelectedDeckId(deckId);
        setDecks(prev => [...prev, { id: deckId, name: newDeckName.trim() }]);
      } else {
        if (!selectedDeckId) { setMessage("Hãy chọn deck để lưu."); return; }
        deckId = selectedDeckId;
      }
      await bulkCreateCards(deckId, validCards);
      setTextStage("saved");
      setMessage(`Đã lưu ${validCards.length} flashcards vào deck!`);
    } catch {
      setMessage("Lỗi khi lưu thẻ. Hãy thử lại.");
    }
  };

  const handleImageGenerate = async () => {
    if (files.length === 0) return;
    if (!isDestinationValid) return;

    setImgStage("generating");
    setImgError(null);
    try {
      const generated = await previewImageCardsNoDeck(files, imgCount);
      setImgCards(generated);
      setImgStage("preview");
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setImgStage("error");
    }
  };

  const handleImageSave = async () => {
    if (imgCards.length === 0) return;
    setImgSaving(true);
    try {
      let deckId: number;
      if (saveTarget === "new") {
        deckId = await createDeck(newDeckName.trim());
        setSelectedDeckId(deckId);
        setDecks(prev => [...prev, { id: deckId, name: newDeckName.trim() }]);
      } else {
        deckId = selectedDeckId!;
      }
      await bulkCreateCards(deckId, imgCards);
      setImgResult({
        saved: imgCards.length,
        real_image: imgCards.filter(c => c.image_type === "real_image").length,
        diagram: imgCards.filter(c => c.image_type === "diagram").length,
      });
      setImgStage("done");
    } catch {
      setImgError("Lỗi khi lưu thẻ. Hãy thử lại.");
    } finally {
      setImgSaving(false);
    }
  };

  const removeImgCard = (idx: number) => {
    setImgCards(prev => prev.filter((_, i) => i !== idx));
  };

  if (!clientReady || !user) return (
    <AppShell user={null}>
      <div className="space-y-4">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-full" />
        <div className="pt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <Skeleton className="h-[500px] rounded-[32px]" />
          <div className="space-y-4">
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
          </div>
        </div>
      </div>
    </AppShell>
  );

  const diffCount = cards.reduce(
    (acc, c) => { acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const estimatedCost = (imgCount * 0.04).toFixed(2);
  const isSetup = (mode === "text" && textStage === "setup") ||
    (mode === "image" && (imgStage === "setup" || imgStage === "error"));
  const isImgPreview = mode === "image" && imgStage === "preview";

  // Shared "Lưu vào đâu?" panel — rendered in both modes' setup
  const SaveDestinationPanel = (
    <div className="p-5 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-2xl">
      <p className="text-[0.78rem] font-bold text-muted-foreground uppercase tracking-wider mb-3">Lưu vào đâu?</p>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setSaveTarget("new")}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all border",
            saveTarget === "new"
              ? "bg-primary text-white border-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" /> Tạo deck mới
        </button>
        <button
          type="button"
          onClick={() => setSaveTarget("existing")}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all border",
            saveTarget === "existing"
              ? "bg-primary text-white border-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          Thêm vào deck có sẵn
        </button>
      </div>
      {saveTarget === "new" ? (
        <input
          type="text"
          placeholder="Nhập tên deck mới…"
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
        />
      ) : (
        <Select
          value={selectedDeckId ? String(selectedDeckId) : ""}
          onValueChange={(v) => setSelectedDeckId(Number(v) || null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={decks.length ? "Chọn deck" : "Chưa có deck"} />
          </SelectTrigger>
          <SelectContent>
            {decks.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <AppShell user={user}>
      {/* ── Text mode: loading ── */}
      {mode === "text" && textStage === "loading" && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="relative mb-10">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-3">AI đang đọc tài liệu…</h2>
          <p className="text-muted-foreground text-lg max-w-[50ch] mb-10 leading-relaxed">
            Đang trích xuất khái niệm và tạo <strong className="text-foreground">{targetCount} flashcards</strong>.<br />Quá trình này có thể mất 30–60 giây.
          </p>
          <div className="w-full max-w-[400px]">
            <div className="h-3 w-full bg-surface-muted rounded-full overflow-hidden border border-border shadow-inner">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-3 px-1">
              <span className="text-[0.82rem] font-semibold text-muted-foreground uppercase tracking-wider">Đang xử lý</span>
              <span className="text-[0.82rem] font-bold text-primary tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Text mode: preview ── */}
      {mode === "text" && textStage === "preview" && (
        <div className="pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 sticky top-[-32px] md:top-[-40px] z-40 bg-background/80 backdrop-blur-xl py-6 border-b border-border/50">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] backdrop-blur-md border border-border/70 text-muted-foreground text-[0.82rem] font-semibold mb-2">
                <Pencil className="w-3.5 h-3.5" /> Xem lại trước khi lưu
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                {cards.length} flashcards được tạo
              </h2>
              <div className="flex flex-wrap items-center gap-2">
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
                <span className="text-[0.78rem] text-muted-foreground">
                  → <span className="font-semibold text-foreground">{resolvedDeckLabel}</span>
                </span>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button variant="secondary" onClick={addCard} className="flex-1 md:flex-none">
                <Plus className="w-4 h-4" aria-hidden /> Thêm thẻ
              </Button>
              <Button variant="ghost" onClick={() => setTextStage("setup")} className="flex-1 md:flex-none">
                <RotateCcw className="w-4 h-4" aria-hidden /> Làm lại
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                className="flex-[1.5] md:flex-none"
                disabled={!isDestinationValid}
              >
                <Save className="w-4 h-4" aria-hidden /> Lưu tất cả
              </Button>
            </div>
          </div>

          {message && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 rounded-2xl flex items-center gap-3 mb-6">
              <X className="w-5 h-5 text-rose-700 dark:text-rose-300 flex-shrink-0" />
              <p className="text-rose-800 dark:text-rose-200 text-[0.88rem] font-medium leading-[1.5] m-0">{message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-[22px] flex flex-col gap-4 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-2xl shadow-sm transition-colors duration-200",
                  editingIdx === idx ? "ring-2 ring-primary/40 border-primary/40" : "hover:border-primary/30"
                )}
              >
                {editingIdx === idx && editState ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu hỏi (Front)</label>
                        <textarea
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                          value={editState.front}
                          onChange={(e) => setEditState({ ...editState, front: e.target.value })}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu trả lời (Back)</label>
                        <textarea
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                          value={editState.back}
                          onChange={(e) => setEditState({ ...editState, back: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Độ khó</label>
                        <div className="flex gap-2">
                          {(["easy", "medium", "hard"] as const).map((d) => (
                            <button
                              type="button"
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
                      <Button variant="ghost" className="flex-1" onClick={cancelEdit}>Hủy</Button>
                      <Button variant="primary" className="flex-[1.5]" onClick={saveEdit}><Check className="w-4 h-4" /> Hoàn tất</Button>
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
                      <p className="font-bold text-[0.95rem] leading-snug mb-2 text-foreground line-clamp-3">{card.front}</p>
                      <p className="text-muted-foreground text-[0.88rem] leading-relaxed m-0 line-clamp-4">{card.back}</p>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border/50">
                      <Button type="button" variant="danger" size="sm" className="h-10 w-10 p-0" onClick={() => removeCard(idx)} title="Xóa thẻ">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="h-10" onClick={() => startEdit(idx)} title="Chỉnh sửa">
                        <Pencil className="w-3.5 h-3.5" /> Sửa
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addCard}
              className="p-[22px] min-h-[220px] flex flex-col items-center justify-center gap-3 bg-transparent border-2 border-dashed border-border/80 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm tracking-wide uppercase">Thêm thẻ mới</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Text mode: saved ── */}
      {mode === "text" && textStage === "saved" && (
        <div className="mt-10 p-10 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[40px] shadow-sm text-center">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Đã lưu thành công</h2>
          <p className="text-muted-foreground mb-8">Thẻ mới đã sẵn sàng để bạn ôn theo nhịp.</p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-center gap-3">
              <Button variant="primary" onClick={() => selectedDeckId && router.push(`/study/${selectedDeckId}`)} disabled={!selectedDeckId}>
                <Repeat className="w-4 h-4" aria-hidden /> Học ngay
              </Button>
              <Button variant="secondary" onClick={() => { setTextStage("setup"); setFiles([]); setCards([]); setMessage(null); }}>
                Tải tài liệu khác
              </Button>
            </div>
            <Button variant="ghost" onClick={() => switchMode("image")} disabled={!selectedDeckId} className="text-muted-foreground">
              <ImagePlus className="w-4 h-4" aria-hidden /> Thêm ảnh minh hoạ (DALL-E 3)
            </Button>
          </div>
        </div>
      )}

      {/* ── Image mode: generating ── */}
      {mode === "image" && imgStage === "generating" && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ImagePlus className="w-9 h-9 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Đang tạo thẻ ảnh…</h2>
            <p className="text-muted-foreground max-w-[44ch] leading-relaxed">
              AI đang đọc tài liệu, chọn khái niệm trực quan và gọi DALL-E 3.<br />
              Quá trình này mất 30–90 giây.
            </p>
          </div>
        </div>
      )}

      {/* ── Image mode: preview ── */}
      {isImgPreview && (
        <div className="pb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 sticky top-[-32px] md:top-[-40px] z-40 bg-background/80 backdrop-blur-xl py-6 border-b border-border/50">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] backdrop-blur-md border border-border/70 text-muted-foreground text-[0.82rem] font-semibold mb-2">
                <ImagePlus className="w-3.5 h-3.5" /> Xem lại thẻ ảnh
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                {imgCards.length} thẻ hình ảnh
              </h2>
              <span className="text-[0.78rem] text-muted-foreground">
                → <span className="font-semibold text-foreground">{resolvedDeckLabel}</span>
              </span>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button variant="ghost" onClick={() => { setImgStage("setup"); setImgCards([]); }} className="flex-1 md:flex-none">
                <RotateCcw className="w-4 h-4" aria-hidden /> Làm lại
              </Button>
              <Button
                variant="primary"
                onClick={handleImageSave}
                disabled={imgCards.length === 0 || imgSaving}
                className="flex-[1.5] md:flex-none"
              >
                <Save className="w-4 h-4" aria-hidden /> {imgSaving ? "Đang lưu…" : "Lưu tất cả"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {imgCards.map((card, idx) => (
              <div
                key={idx}
                className="flex flex-col bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-2xl shadow-sm overflow-hidden hover:border-primary/30 transition-colors"
              >
                {card.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.back} className="w-full aspect-video object-cover" />
                ) : card.image_type === "diagram" ? (
                  <div className="w-full aspect-video bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                    <BrainCircuit className="w-10 h-10 text-purple-400" />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-surface-muted flex items-center justify-center">
                    <ImagePlus className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <p className="font-bold text-[0.92rem] leading-snug mb-1 text-foreground line-clamp-3">{card.front}</p>
                    <p className="text-muted-foreground text-[0.82rem] leading-relaxed line-clamp-2">{card.back}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/50 mt-auto">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-bold tracking-tight",
                      card.difficulty === "easy" ? "bg-green-100 text-green-700 dark:text-green-400" :
                      card.difficulty === "medium" ? "bg-amber-100 text-amber-700 dark:text-amber-400" :
                      "bg-red-100 text-red-700"
                    )}>
                      {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "Trung bình" : "Khó"}
                    </span>
                    <Button type="button" variant="danger" size="sm" className="h-8 w-8 p-0" onClick={() => removeImgCard(idx)} title="Xóa thẻ">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Image mode: done ── */}
      {mode === "image" && imgStage === "done" && (
        <div className="p-10 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[40px] shadow-sm text-center">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Hoàn tất!</h2>
          {imgResult && (
            <p className="text-muted-foreground mb-2">
              Đã lưu <strong className="text-foreground">{imgResult.saved} thẻ</strong> vào deck —{" "}
              <span className="text-primary font-semibold">{imgResult.real_image} ảnh DALL-E</span>
              {imgResult.diagram > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold"> + {imgResult.diagram} sơ đồ</span>
              )}.
            </p>
          )}
          <p className="text-muted-foreground text-[0.88rem] mb-8">Thẻ đã sẵn sàng để học.</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => selectedDeckId && router.push(`/study/${selectedDeckId}`)} disabled={!selectedDeckId}>
              <Repeat className="w-4 h-4" /> Học ngay
            </Button>
            <Button variant="secondary" onClick={() => { setImgStage("setup"); setFiles([]); setImgCards([]); setImgResult(null); setSaveTarget("new"); setNewDeckName(""); }}>
              Tạo thêm
            </Button>
          </div>
        </div>
      )}

      {/* ── Setup (both modes) ── */}
      {isSetup && (
        <div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] backdrop-blur-md border border-border/70 text-muted-foreground text-[0.82rem] font-semibold mb-3.5">
              <Sparkles className="w-4 h-4 text-primary" /> Tạo Flashcard AI
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2.5 leading-tight">
              {mode === "text" ? (
                <>Tải lên tài liệu,{" "}<span className="text-primary">AI làm phần còn lại</span></>
              ) : (
                <>Đuổi Hình Bắt Chữ,{" "}<span className="text-primary">AI tạo ảnh minh hoạ</span></>
              )}
            </h1>
            <p className="text-muted-foreground text-base max-w-[64ch] leading-relaxed">
              {mode === "text"
                ? <>Chọn deck → Tải tài liệu → AI tạo đến <strong className="text-foreground">{targetCount}</strong> thẻ → Xem lại & lưu.</>
                : <>Chọn deck → Tải tài liệu → AI chọn khái niệm → DALL-E 3 tạo ảnh → Lưu vào deck.</>
              }
            </p>
          </div>

          {/* Mode selector */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[hsl(var(--acrylic))] border border-border/70 mb-6">
            <button
              type="button"
              onClick={() => switchMode("text")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                mode === "text" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="w-4 h-4" /> Thẻ văn bản
            </button>
            <button
              type="button"
              onClick={() => switchMode("image")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                mode === "image" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImagePlus className="w-4 h-4" /> Thẻ hình ảnh
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[0.65rem] font-bold uppercase tracking-wider">
                <Lock className="w-2.5 h-2.5" /> Pro
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <section className="p-8 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[32px] shadow-sm">
              <h3 className="mb-6 font-bold text-xl flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-muted-foreground" /> Cấu hình
              </h3>

              <div className="grid gap-6">
                {/* Deck destination — identical for both modes */}
                {SaveDestinationPanel}

                {/* Count slider */}
                {mode === "text" ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider">Số flashcards mục tiêu</label>
                      <span className="text-primary font-bold text-lg tabular-nums">{targetCount}</span>
                    </div>
                    <input
                      type="range" min={10} max={500} step={10}
                      value={targetCount}
                      onChange={(e) => setTargetCount(Number(e.target.value))}
                      className="w-full h-2 bg-surface-muted rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-2 text-[0.75rem] font-semibold text-muted-foreground">
                      <span>10</span><span>500</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider">Số thẻ tối đa</label>
                      <span className="text-primary font-bold text-lg tabular-nums">{imgCount}</span>
                    </div>
                    <input
                      type="range" min={5} max={20} step={1}
                      value={imgCount}
                      onChange={(e) => setImgCount(Number(e.target.value))}
                      className="w-full h-2 bg-surface-muted rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-1.5 text-[0.75rem] font-semibold text-muted-foreground">
                      <span>5</span>
                      <span className="text-primary">Chi phí ước tính: ~${estimatedCost}</span>
                      <span>20</span>
                    </div>
                  </div>
                )}

                {/* File upload */}
                <section
                  className={cn(
                    "overflow-hidden rounded-[24px] border border-border/80 bg-background/65 shadow-sm transition-colors",
                    dragOver ? "border-primary bg-primary/5" : "hover:border-primary/35"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  aria-label="Tải tài liệu"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group flex w-full flex-col items-center justify-center gap-4 border-2 border-dashed border-border/80 px-6 py-8 text-center transition-colors",
                      "hover:border-primary/45 hover:bg-muted/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[hsl(var(--ring))]",
                      dragOver && "border-primary bg-primary/5"
                    )}
                  >
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-[1.03] motion-reduce:transition-none">
                      {files.length > 0 ? <FileUp className="h-8 w-8" aria-hidden /> : <Upload className="h-8 w-8" aria-hidden />}
                    </span>
                    <span className="space-y-1">
                      <span className="block text-base font-bold tracking-tight text-foreground">
                        {files.length > 0 ? "Thêm tài liệu khác" : "Kéo thả hoặc chọn tài liệu"}
                      </span>
                      <span className="block text-[0.88rem] leading-relaxed text-muted-foreground">
                        PDF, DOCX, TXT. Có thể tải nhiều file cho cùng một lần sinh thẻ.
                      </span>
                    </span>
                  </button>

                  {files.length > 0 && (
                    <div className="border-t border-border bg-muted/15 px-4 py-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.82rem] font-semibold text-foreground">{files.length} tài liệu đã chọn</p>
                          <p className="text-[0.76rem] text-muted-foreground">Xóa file không dùng trước khi sinh flashcards.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles([])}
                          className="rounded-lg px-2.5 py-1.5 text-[0.76rem] font-semibold text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/25 dark:hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                        >
                          Xóa tất cả
                        </button>
                      </div>
                      <div className="max-h-[210px] space-y-2 overflow-y-auto pr-1">
                        {files.map((f, index) => (
                          <div key={`${f.name}-${f.lastModified}-${index}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <FileText className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="truncate text-[0.88rem] font-semibold text-foreground">{f.name}</p>
                              <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{fileKind(f)} · {formatFileSize(f.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/25 dark:hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                              aria-label={`Xóa ${f.name}`}
                              title="Xóa file"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Error messages */}
                {mode === "text" && message && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 rounded-2xl flex items-center gap-3">
                    <X className="w-5 h-5 text-rose-700 dark:text-rose-300 flex-shrink-0" />
                    <p className="text-rose-800 dark:text-rose-200 text-[0.88rem] font-medium leading-[1.5]">{message}</p>
                  </div>
                )}
                {mode === "image" && imgError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-[0.88rem] font-medium flex gap-2">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" /> {imgError}
                  </div>
                )}

                {/* Generate button */}
                <div className="flex gap-4 mt-2">
                  {mode === "text" ? (
                    <Button variant="primary" className="w-full" onClick={handleGenerate}
                      disabled={files.length === 0 || !isDestinationValid}
                    >
                      <Sparkles className="w-5 h-5" aria-hidden /> Sinh {targetCount} flashcards
                    </Button>
                  ) : (
                    <Button variant="primary" className="w-full" onClick={handleImageGenerate}
                      disabled={files.length === 0 || !isDestinationValid}
                    >
                      <Sparkles className="w-4 h-4" /> Tạo tối đa {imgCount} thẻ có ảnh (~${estimatedCost})
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <aside className="grid gap-6 content-start">
              <section className="p-6 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-3xl shadow-sm">
                <h3 className="mb-4 font-bold text-lg">Luồng hoạt động</h3>
                <div className="grid gap-4">
                  {(mode === "text" ? [
                    { n: "1", t: "Chọn deck & upload tài liệu" },
                    { n: "2", t: "AI trích xuất & tạo thẻ" },
                    { n: "3", t: "Xem lại, sửa hoặc xóa thẻ" },
                    { n: "4", t: "Lưu vào deck → Bắt đầu học" },
                  ] : [
                    { n: "1", t: "Chọn deck & upload tài liệu" },
                    { n: "2", t: "AI chọn khái niệm trực quan" },
                    { n: "3", t: "DALL-E 3 tạo ảnh minh hoạ" },
                    { n: "4", t: "Thẻ ảnh lưu thẳng vào deck" },
                  ]).map((s) => (
                    <div key={s.n} className="flex gap-3 items-start">
                      <div className="flex-none w-8 h-8 rounded-lg grid place-items-center font-bold text-[0.88rem] bg-primary/10 text-primary">{s.n}</div>
                      <div className="pt-1.5"><strong className="text-sm font-semibold leading-tight block">{s.t}</strong></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="p-6 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-3xl shadow-sm">
                <h3 className="mb-4 font-bold text-lg">AI tạo gì?</h3>
                <div className="grid gap-4">
                  {(mode === "text" ? [
                    { icon: Sparkles, t: "Câu hỏi từ khái niệm chính", c: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
                    { icon: Check, t: "Câu trả lời chính xác", c: "text-green-600 bg-green-50 dark:bg-green-500/10" },
                    { icon: BrainCircuit, t: "Phân loại độ khó thông minh", c: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" },
                  ] : [
                    { icon: ImagePlus, t: "Ảnh DALL-E 3 cho khái niệm", c: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
                    { icon: Check, t: "Chỉ tạo khi ảnh giúp học tốt hơn", c: "text-green-600 bg-green-50 dark:bg-green-500/10" },
                    { icon: BrainCircuit, t: "Sơ đồ cho khái niệm trừu tượng", c: "text-purple-500 bg-purple-50 dark:bg-purple-500/10" },
                  ]).map((f) => {
                    const Icon = f.icon;
                    return (
                      <div key={f.t} className="flex gap-3 items-center">
                        <div className={cn("flex-none w-8 h-8 rounded-lg grid place-items-center", f.c)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-[0.88rem] font-semibold text-foreground leading-snug m-0">{f.t}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
    </AppShell>
  );
}
