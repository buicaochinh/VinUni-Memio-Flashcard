"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  cacheCards,
  Card,
  ExplainCitation,
  ExplainHistoryMessage,
  fetchDeckCards,
  flushProgressQueue,
  getCachedCards,
  useClientReady,
  useStoredUser,
  isOnline,
  logStudySession,
  queueProgressUpdate,
  updateCardProgress,
  explainCard,
} from "../../../lib/app-client";
import {
  Bot,
  Send,
  CheckCircle2,
  HelpCircle,
  Zap,
  RotateCcw,
  WifiOff,
  Keyboard,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Info
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";

function mdToHtml(md: string): string {
  if (!md) return "";
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code class='bg-muted px-1 rounded text-sm border border-border'>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-primary underline-offset-4">$1</a>');

    const h3 = line.match(/^#{3}\s+(.+)$/);
    const h2 = line.match(/^#{2}\s+(.+)$/);
    const h1 = line.match(/^#{1}\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
    const hr = line.match(/^-{3,}$/);

    if (inList && !li) { out.push("</ul>"); inList = false; }

    if (h3) { out.push(`<h3 class="font-bold text-base mt-3 mb-1">${h3[1]}</h3>`); }
    else if (h2) { out.push(`<h2 class="font-bold text-lg mt-3 mb-1">${h2[1]}</h2>`); }
    else if (h1) { out.push(`<h1 class="font-bold text-xl mt-3 mb-1">${h1[1]}</h1>`); }
    else if (li) {
      if (!inList) { out.push("<ul class='list-disc pl-5 my-1 space-y-0.5'>"); inList = true; }
      out.push(`<li>${li[1]}</li>`);
    }
    else if (hr) { out.push("<hr class='my-2 border-border'/>"); }
    else if (line.trim() === "") { out.push("<br/>"); }
    else { out.push(`<p class="my-1">${line}</p>`); }
  }

  if (inList) out.push("</ul>");
  return out.join("");
}

const RATING: Record<0 | 1 | 2 | 3, { label: string; hint: string; color: string; icon: LucideIcon }> = {
  0: { label: "Lại",    hint: "Ôn lại sớm",       color: "bg-[hsl(var(--danger))] text-white shadow-rose-200", icon: RotateCcw },
  1: { label: "Khó",    hint: "Giãn cách ngắn",    color: "bg-[hsl(var(--warning))] text-white shadow-amber-200", icon: HelpCircle },
  2: { label: "Tốt",    hint: "Đúng nhịp",         color: "bg-[hsl(var(--success))] text-white shadow-emerald-200", icon: CheckCircle2 },
  3: { label: "Dễ",     hint: "Nắm chắc rồi",      color: "bg-primary text-white shadow-blue-200", icon: Zap },
};

const SWIPE_THRESHOLD = 80;  // px
const SWIPE_VELOCITY  = 0.3; // px/ms

export default function StudyPage() {
  const params     = useParams<{ deckId: string }>();
  const deckId     = Number(params.deckId);
  const router     = useRouter();

  const user = useStoredUser();
  const clientReady = useClientReady();
  const [cards,        setCards]        = useState<Card[]>([]);
  const [idx,          setIdx]          = useState(0);
  const [isFlipped,    setIsFlipped]    = useState(false);
  const [dragX,        setDragX]        = useState(0);
  const [isDragging,   setIsDragging]   = useState(false);
  const [offline,      setOffline]      = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));
  const [msg,          setMsg]          = useState<string | null>(null);
  const [ratingQuality, setRatingQuality] = useState<number | null>(null);
  const [sessionRatings, setSessionRatings] = useState<number[]>([]);

  // Explain mode states
  const [isExplainMode, setIsExplainMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<ExplainHistoryMessage & { citations?: ExplainCitation[] }>>([]);
  const [activeCitation, setActiveCitation] = useState<ExplainCitation | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const pointerStart = useRef<{ x: number; t: number } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadCards = useCallback(async (userId: number) => {
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
  }, [deckId]);

  useEffect(() => {
    if (!clientReady) return;
    if (!user) { router.replace("/"); return; }
    const t = setTimeout(() => { void loadCards(user.id); }, 0);

    const handleOnline  = () => { setOffline(false); void flushProgressQueue(); };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [clientReady, loadCards, router, user]);

  const handleRate = useCallback(async (quality: 0 | 1 | 2 | 3) => {
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
      // Persist lightweight session stats periodically so weekly report has data
      if (isOnline() && newRatings.length % 5 === 0) {
        const avg = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
        void logStudySession(user.id, deckId, newRatings.length, avg);
      }
      setTimeout(() => setIdx((i) => i + 1), 220);
    } else {
      const avg = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
      if (isOnline()) {
        void logStudySession(user.id, deckId, newRatings.length, avg);
      }
      setMsg("Hoàn thành phiên học!");
      setTimeout(() => router.push("/workspace"), 1400);
    }
  }, [cards, deckId, idx, router, sessionRatings, user]);

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
      void handleRate(dx > 0 ? 3 : 0);
    } else {
      setDragX(0);
    }
  };

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const openTutor = async () => {
    setIsExplainMode(true);

    // If chat history already exists, don't regenerate
    if (chatHistory.length > 0) return;

    // Automatically generate first explanation from system prompt
    if (!card) return;

    setIsChatting(true);
    try {
      const data = await explainCard(
        card.front,
        card.back,
        "", // Empty user message - system will generate initial explanation
        [],
        card.source_context
      );
      setChatHistory([{
        role: "assistant",
        text: data.answer || data.response || "Không tìm thấy giải thích.",
        citations: data.citations || []
      }]);
    } catch {
      setChatHistory([{
        role: "assistant",
        text: "Xin lỗi, có lỗi khi tải giải thích. Vui lòng thử lại!"
      }]);
    }
    setIsChatting(false);
  };

  const handleExplain = async (overrideMessage?: string) => {
    const message = overrideMessage || chatInput;
    if (!message.trim() || !card) return;

    if (chatHistory.length === 0) {
      openTutor();
      return;
    }

    if (!overrideMessage) setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", text: message }]);
    setIsChatting(true);
    if (!isExplainMode) setIsExplainMode(true);

    try {
      const data = await explainCard(card.front, card.back, message, chatHistory, card.source_context);
      setChatHistory(prev => [...prev, {
        role: "assistant",
        text: data.answer || data.response || "Không tìm thấy giải thích.",
        citations: data.citations || []
      }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", text: "Xin lỗi, có lỗi khi gọi AI. Vui lòng thử lại!" }]);
    }
    setIsChatting(false);
  };

  const handleQuickExplain = () => {
    if (!card) return;
    if (chatHistory.length === 0) {
      void openTutor();
      return;
    }
    void handleExplain(`Giải thích kỹ hơn flashcard này dựa trên tài liệu nguồn và cho thêm ngữ cảnh học tập cần thiết.\nFront: "${card.front}"\nBack: "${card.back}"`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [cards.length, handleRate, idx, isFlipped]);

  const progress = useMemo(
    () => (cards.length === 0 ? 0 : ((idx + 1) / cards.length) * 100),
    [cards.length, idx]
  );

  const card = cards[idx];

  if (!user) return null;

  if (cards.length === 0 && !msg) {
    return (
      <main className="min-h-screen grid place-items-center p-5 bg-background">
        <section className="w-full max-w-[480px] p-10 bg-surface border border-border rounded-[32px] shadow-sm text-center">
          <div className="w-20 h-20 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-3">Deck này chưa có flashcards</h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">Hãy sang Generator để tạo nội dung trước.</p>
          <div className="grid gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push(`/generate?deckId=${deckId}`)}
            >
              <Sparkles className="w-5 h-5" aria-hidden /> Tạo thẻ
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/workspace")}
            >
              Về Bộ thẻ
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const leftHintOpacity  = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));
  const rightHintOpacity = Math.max(0, Math.min(1,  dragX / SWIPE_THRESHOLD));
  const cardRotate       = (dragX / 400) * 8;
  const cardScale        = isDragging ? 1.02 : 1;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* ── Offline banner ── */}
      {offline && (
        <div className="bg-amber-500 text-white py-2 px-4 text-center font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4" /> Đang offline — tiến độ sẽ được đồng bộ khi có mạng
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border p-4 md:px-8 flex justify-between items-center gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <button
            onClick={() => router.push("/workspace")}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border hover:bg-muted/35 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold text-primary uppercase tracking-widest mb-0.5">
              <Sparkles className="w-3 h-3" /> Ôn tập thông minh
            </div>
            <h1 className="text-xl font-bold tracking-tight truncate max-w-[200px] md:max-w-none">Deck #{deckId}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[0.88rem] transition-all",
              isExplainMode ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-[hsl(var(--acrylic))] border border-border/70 text-subtle hover:bg-muted/35"
            )}
            onClick={() => {
              if (isExplainMode) setIsExplainMode(false);
              else openTutor();
            }}
          >
            <Bot className="w-4 h-4" /> <span className="hidden sm:inline">{isExplainMode ? "Đóng Tutor" : "AI Tutor"}</span>
          </button>
        </div>
      </header>

      <div className={cn(
        "flex-1 min-h-0 flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full h-[calc(100vh-80px)]",
        isExplainMode ? "overflow-hidden" : ""
      )}>
        {/* ── Explain Sidebar ── */}
        {isExplainMode && (
          <aside className="w-full md:w-[380px] min-h-0 flex flex-col bg-surface-raised border border-border rounded-[28px] shadow-sm backdrop-blur-xl animate-in slide-in-from-left-4 duration-500 overflow-hidden">
            <div className="p-6 border-b border-border bg-surface/50">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Bot className="w-6 h-6 text-primary" /> Trợ lý học tập AI
                </h3>
                <button onClick={() => setIsExplainMode(false)} className="md:hidden p-1 opacity-50"><X/></button>
              </div>
              <p className="text-muted-foreground text-[0.88rem] underline decoration-primary/30 decoration-2 underline-offset-4">Hỏi thêm về kiến thức trong thẻ này</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-4">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">Bắt đầu trò chuyện để hiểu sâu hơn về kiến thức trong thẻ này.</p>
                </div>
              ) : (
                chatHistory.map((m, i) => (
                  <div key={i} className={cn(
                    "p-4 rounded-[20px] text-[0.92rem] leading-relaxed max-w-[90%] relative group/msg",
                    m.role === "user"
                      ? "ml-auto bg-primary text-white font-medium rounded-tr-none shadow-sm"
                      : "mr-auto bg-surface border border-border text-foreground font-medium rounded-tl-none shadow-sm"
                  )}>
                    {m.role === "user" ? m.text : (
                      <div className="space-y-2">
                        <div
                          className="text-[0.92rem] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: mdToHtml(m.text).replace(/\[(\d+)\]/g, '<button class="citation-badge" data-id="$1">$1</button>') }}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.classList.contains('citation-badge')) {
                              const cid = parseInt(target.getAttribute('data-id') || '0');
                              const cit = m.citations?.find((c) => c.id === cid);
                              if (cit) setActiveCitation(cit);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isChatting && (
                <div className="mr-auto bg-surface border border-border p-4 rounded-[20px] rounded-tl-none shadow-sm flex items-center gap-2 text-muted-foreground italic text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  AI đang viết...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Citation Popover */}
            {activeCitation && (
              <div className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end p-4 animate-in fade-in duration-300">
                <div className="w-full bg-surface border-t border-border rounded-t-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500 relative">
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="absolute right-6 top-6 w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <X className="w-5 h-5"/>
                  </button>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      {activeCitation.id}
                    </div>
                    <h4 className="font-extrabold text-xl">Điểm chính</h4>
                  </div>
                  <p className="text-lg font-bold leading-relaxed mb-6 text-foreground">
                    {activeCitation.text}
                  </p>
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-surface-muted/50 border border-border/60">
                      <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" /> Tài liệu nguồn
                      </div>
                      <p className="text-sm font-medium italic text-muted-foreground leading-relaxed">
                        &quot;{activeCitation.source}&quot;
                      </p>
                    </div>
                    <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline py-1">
                      <ExternalLink className="w-4 h-4" /> Xem nguồn đầy đủ
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-surface/50 border-t border-border mt-auto">
              <div className="relative group">
                <input
                  className="w-full pl-5 pr-12 py-4 rounded-2xl border border-border bg-surface text-foreground font-medium placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm shadow-sm"
                  placeholder="Nhập câu hỏi của bạn..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleExplain();
                    e.stopPropagation();
                  }}
                />
                <button
                  className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md shadow-primary/20"
                  onClick={() => handleExplain()}
                  disabled={!chatInput.trim() || isChatting}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <section className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-[800px] mx-auto w-full relative">
          {card && (
            <div className="w-full flex flex-col gap-8">
              {/* Progress and status */}
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-2.5">
                    <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-muted-foreground">Thẻ {idx + 1} / {cards.length}</span>
                    <span className="text-[1.2rem] font-bold text-foreground tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-muted rounded-full overflow-hidden border border-border shadow-inner">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                   <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] border border-border/70 text-primary text-[0.75rem] font-semibold shadow-sm tracking-wide">
                    {cards.length < 5 ? "Bắt đầu" : cards.length < 15 ? "Tiến bộ" : "Thành thạo"}
                  </div>
                </div>
              </div>

              {/* Card area */}
              <div className="relative group w-full h-[400px] md:h-[460px]">
                {/* Swipe hints */}
                <div
                  className="absolute top-1/2 right-10 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 text-primary font-bold scale-125 md:scale-150 transition-opacity bg-[hsl(var(--acrylic-strong))] backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border-2 border-primary/80"
                  style={{ opacity: rightHintOpacity }}
                >
                  <Zap className="w-6 h-6" /> Dễ
                </div>
                <div
                  className="absolute top-1/2 left-10 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 text-rose-500 font-bold scale-125 md:scale-150 transition-opacity bg-[hsl(var(--acrylic-strong))] backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border-2 border-rose-500/80"
                  style={{ opacity: leftHintOpacity }}
                >
                  <RotateCcw className="w-6 h-6" /> Lại
                </div>

                {/* Flip card */}
                <div
                  className={cn(
                    "h-full w-full relative transition-[transform,shadow,opacity] duration-300 touch-none [transform-style:preserve-3d]",
                    isFlipped ? "[transform:rotateY(180deg)]" : "",
                    isDragging ? "cursor-grabbing" : "cursor-pointer"
                  )}
                  style={{
                    transform: `rotateY(${isFlipped ? 180 : 0}deg) translateX(${dragX}px) rotateZ(${cardRotate}deg) scale(${cardScale})`,
                  }}
                  onClick={() => { if (!isDragging && Math.abs(dragX) < 5) setIsFlipped((f) => !f); }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => { setIsDragging(false); setDragX(0); }}
                >
                  {/* Front */}
                  <div className="absolute inset-0 w-full h-full rounded-[40px] p-8 md:p-12 pb-20 bg-surface-muted border-2 border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] [backface-visibility:hidden] flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-[0.82rem] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> Câu hỏi
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickExplain(); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] border border-border/70 text-primary text-[0.7rem] font-bold shadow-sm hover:bg-muted/35 transition-colors"
                        >
                          <Bot className="w-3.5 h-3.5" /> Giải thích
                        </button>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[0.7rem] font-black uppercase tracking-widest shadow-sm",
                          card.difficulty === "easy" ? "bg-green-500 text-white" :
                          card.difficulty === "medium" ? "bg-amber-500 text-white" :
                          "bg-rose-500 text-white"
                        )}>
                          {card.difficulty === "easy" ? "DỄ" : card.difficulty === "medium" ? "TB" : "KHÓ"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-center text-xl md:text-2xl lg:text-3xl font-extrabold leading-tight tracking-tight text-foreground">
                      {card.front}
                    </div>
                    <div className="pt-6 mt-auto border-t border-border/60 flex items-center justify-center gap-2 text-subtle font-bold text-xs uppercase tracking-widest opacity-60">
                      Nhấn để lật đáp án
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 w-full h-full rounded-[40px] p-8 md:p-12 pb-20 bg-primary/10 border-2 border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.08)] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-[0.82rem] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" /> Đáp án
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickExplain(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] border border-border/70 text-primary text-[0.7rem] font-bold shadow-sm hover:bg-muted/35 transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" /> Giải thích
                      </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-center text-lg md:text-xl lg:text-2xl font-bold leading-relaxed text-foreground overflow-y-auto custom-scrollbar px-2">
                      {card.back}
                    </div>
                    <div className="pt-6 mt-auto border-t border-border/60 flex items-center justify-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-widest opacity-60">
                      Chấm điểm bên dưới để tiếp tục
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom UI area */}
              <div className="min-h-[140px] flex flex-col items-center">
                {!isFlipped ? (
                  <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {idx === 0 && (
                      <div className="flex gap-4 items-center px-5 py-3 rounded-2xl bg-surface-raised border border-border shadow-sm">
                        <Keyboard className="w-5 h-5 text-muted-foreground" />
                        <div className="flex gap-3 text-[0.75rem] font-bold text-subtle">
                          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-[hsl(var(--acrylic))] shadow-xs">Space</kbd> Lật</span>
                          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-[hsl(var(--acrylic))] shadow-xs">←/→</kbd> Chuyển</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="group flex items-center gap-2 text-subtle hover:text-primary transition-colors py-2"
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase tracking-widest underline decoration-2 underline-offset-8">Kiểm tra kết quả</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in zoom-in-95 duration-300">
                    {([0, 1, 2, 3] as const).map((q) => {
                      const r = RATING[q];
                      const Icon = r.icon;
                      const isActive = ratingQuality === q;
                      return (
                        <button
                          key={q}
                          onClick={() => handleRate(q)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-4 rounded-3xl transition-all duration-200 active:scale-95 shadow-lg",
                            r.color,
                            isActive ? "scale-90 opacity-50 ring-4 ring-background/80" : "hover:-translate-y-1 hover:brightness-105"
                          )}
                        >
                          <Icon className="w-6 h-6 mb-0.5" strokeWidth={3} />
                          <span className="text-[0.9rem] font-black uppercase tracking-tighter">{r.label}</span>
                          <span className="text-[0.65rem] font-bold opacity-80 uppercase tracking-widest">{r.hint}</span>
                          <kbd className="mt-1 px-1.5 py-0.5 rounded-md bg-foreground/10 text-[0.65rem] font-bold border border-white/20">
                            {q + 1}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {msg && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-foreground/90 text-[hsl(var(--background))] rounded-[24px] font-bold text-lg shadow-2xl animate-in slide-in-from-bottom shadow-primary/20 flex items-center gap-3 z-50">
              <Sparkles className="text-primary w-6 h-6" /> {msg}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
