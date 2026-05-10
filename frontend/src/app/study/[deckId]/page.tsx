"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  cacheCards,
  Card,
  ExplainCitation,
  ExplainHistoryMessage,
  fetchSmartQueue,
  fetchStudySummary,
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
import SessionCompleteBoard from "../../../components/SessionCompleteBoard";
import DailyLimitReached from "../../../components/DailyLimitReached";
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

const TUTOR_SUGGESTIONS = [
  {
    label: "Tóm tắt ý chính",
    prompt: "Tóm tắt ý chính của flashcard này trong 3 gạch đầu dòng.",
  },
  {
    label: "Cho ví dụ dễ nhớ",
    prompt: "Cho một ví dụ thực tế giúp tôi nhớ nội dung trong thẻ này.",
  },
  {
    label: "Vì sao đúng?",
    prompt: "Vì sao đáp án này đúng? Giải thích từng bước dựa trên tài liệu nguồn.",
  },
  {
    label: "Dễ nhầm chỗ nào?",
    prompt: "Nội dung này thường dễ nhầm với điều gì? Hãy chỉ ra điểm cần tránh.",
  },
  {
    label: "Hỏi ngược lại tôi",
    prompt: "Hãy hỏi ngược lại tôi 2 câu kiểm tra nhanh để xem tôi đã hiểu thẻ này chưa.",
  },
  {
    label: "Giải thích đơn giản",
    prompt: "Giải thích nội dung này bằng ngôn ngữ thật đơn giản, như đang nói với người mới bắt đầu.",
  },
  {
    label: "Liên hệ kiến thức cũ",
    prompt: "Nội dung này liên hệ với kiến thức nền nào? Hãy giải thích mối liên hệ quan trọng nhất.",
  },
  {
    label: "Khi nào dùng?",
    prompt: "Kiến thức trong thẻ này thường được dùng trong tình huống nào?",
  },
  {
    label: "Dấu hiệu nhận biết",
    prompt: "Có dấu hiệu hoặc từ khóa nào giúp tôi nhận ra đáp án này khi làm bài không?",
  },
  {
    label: "So sánh khái niệm",
    prompt: "So sánh khái niệm trong thẻ này với một khái niệm gần giống hoặc dễ nhầm.",
  },
  {
    label: "Mẹo ghi nhớ",
    prompt: "Gợi ý một mẹo ghi nhớ ngắn gọn cho flashcard này.",
  },
  {
    label: "Sai lầm thường gặp",
    prompt: "Người học thường sai ở đâu khi gặp nội dung này?",
  },
];

type StudySummary = {
  due_cards: number;
  new_cards: number;
  completed_new: number;
  completed_review: number;
  daily_new_limit: number;
  daily_review_limit: number;
  total_cards: number;
};

export default function StudyPage() {
  const params     = useParams<{ deckId: string }>();
  const deckId     = Number(params.deckId);
  const router     = useRouter();

  const user = useStoredUser();
  const clientReady = useClientReady();
  const [cards,        setCards]        = useState<Card[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [idx,          setIdx]          = useState(0);
  const [isFlipped,    setIsFlipped]    = useState(false);
  const [dragX,        setDragX]        = useState(0);
  const [isDragging,   setIsDragging]   = useState(false);
  const [offline,      setOffline]      = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));
  const [msg,          setMsg]          = useState<string | null>(null);
  const [ratingQuality, setRatingQuality] = useState<number | null>(null);
  const [sessionRatings, setSessionRatings] = useState<number[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const [studySummary, setStudySummary] = useState<StudySummary | null>(null);
  const [sessionXpEarned, setSessionXpEarned] = useState(0);

  // Explain mode states
  const [isExplainMode, setIsExplainMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<ExplainHistoryMessage & { citations?: ExplainCitation[] }>>([]);
  const [activeCitation, setActiveCitation] = useState<ExplainCitation | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const pointerStart = useRef<{ x: number; t: number } | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadCards = useCallback(async (userId: number, overrideLimit: boolean = false) => {
    setIsLoading(true);
    try {
      let loaded: Card[];
      if (isOnline()) {
        loaded = await fetchSmartQueue(deckId, overrideLimit);
        cacheCards(deckId, loaded);

        if (loaded.length === 0) {
          const summary = await fetchStudySummary(deckId);
          if (summary.total_cards > 0) {
            setStudySummary(summary);
            if (overrideLimit) {
              // All cards already reviewed today, nothing left even with override
              setMsg("Bạn đã ôn hết tất cả thẻ trong deck này hôm nay. Hẹn ngày mai!");
            } else {
              setIsDailyLimitReached(true);
            }
          }
        }
      } else {
        loaded = getCachedCards(deckId) ?? [];
        if (loaded.length === 0) setMsg("Offline, không có cache cho deck này.");
      }
      setCards(loaded);
      setIsFlipped(false);
    } catch {
      const cached = getCachedCards(deckId);
      if (cached) { setCards(cached); setMsg("Offline, đang dùng dữ liệu cache."); }
      else         setMsg("Không tải được flashcards.");
    } finally {
      setIsLoading(false);
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
      await updateCardProgress(card, quality).catch(() => {
        queueProgressUpdate({ card, quality, deckId });
      });
    } else {
      queueProgressUpdate({ card, quality, deckId });
    }

    if (idx < cards.length - 1) {
      setIsFlipped(false);
      setDragX(0);
      setMsg(null);
      // Persist lightweight session stats periodically so weekly report has data
      if (isOnline() && newRatings.length % 5 === 0) {
        const avg = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
        void logStudySession(deckId, newRatings.length, avg);
      }
      setTimeout(() => setIdx((i) => i + 1), 220);
    } else {
      const avg = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
      if (isOnline()) {
        const xpResult = await logStudySession(deckId, newRatings.length, avg);
        if (xpResult?.xp_earned) setSessionXpEarned(xpResult.xp_earned);
      }
      try {
        const summary = await fetchStudySummary(deckId);
        setStudySummary(summary);
      } catch {
        // ignore
      }
      setIsSessionComplete(true);
    }
  }, [cards, deckId, idx, sessionRatings, user]);

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
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  const openTutor = () => {
    setIsExplainMode(true);
  };

  const handleExplain = async (overrideMessage?: string) => {
    const message = overrideMessage || chatInput;
    if (!message.trim() || !card) return;

    if (!overrideMessage) setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", text: message }]);
    setIsChatting(true);
    if (!isExplainMode) setIsExplainMode(true);

    try {
      const historyForRequest = chatHistory;
      const data = await explainCard(card.front, card.back, message, historyForRequest, card.source_context);
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

  const handleTutorSuggestion = (prompt: string) => {
    setChatInput("");
    void handleExplain(prompt);
  };

  const handleQuickExplain = async () => {
    if (!card || isChatting) return;

    if (chatHistory.length === 0) {
      setIsExplainMode(true);
      setChatInput("");
      setChatHistory([{ role: "user", text: "Giải thích thẻ này" }]);
      setIsChatting(true);

      try {
        const data = await explainCard(
          card.front,
          card.back,
          "",
          [],
          card.source_context
        );
        setChatHistory(prev => [...prev, {
          role: "assistant",
          text: data.answer || data.response || "Không tìm thấy giải thích.",
          citations: data.citations || []
        }]);
      } catch {
        setChatHistory(prev => [...prev, {
          role: "assistant",
          text: "Xin lỗi, có lỗi khi tải giải thích. Vui lòng thử lại!"
        }]);
      }

      setIsChatting(false);
      return;
    }

    await handleExplain(`Giải thích kỹ hơn flashcard này dựa trên tài liệu nguồn và cho thêm ngữ cảnh học tập cần thiết.\nFront: "${card.front}"\nBack: "${card.back}"`);
  };

  const stopFlashcardPointer = (e: PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  const handleExplainButtonClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void handleQuickExplain();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, button, select, a, [role='button'], [contenteditable='true']")) return;

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

  if (!user || isLoading) {
    return (
      <main className="min-h-screen grid place-items-center p-5 bg-background">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  if (cards.length === 0 && !msg && !isSessionComplete && !isDailyLimitReached) {
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

  if (isDailyLimitReached && studySummary) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        <DailyLimitReached
          summary={studySummary}
          onHome={() => router.push("/workspace")}
          onOverride={async () => {
            setIsDailyLimitReached(false);
            setSessionRatings([]);
            setIdx(0);
            await loadCards(user.id, true);
          }}
        />
      </main>
    );
  }

  if (isSessionComplete && studySummary) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        <SessionCompleteBoard
          sessionRatings={sessionRatings}
          summary={studySummary}
          xpEarned={sessionXpEarned}
          onHome={() => router.push("/workspace")}
          onContinue={async (overrideLimit: boolean) => {
            setIsSessionComplete(false);
            setSessionRatings([]);
            setIdx(0);
            await loadCards(user.id, overrideLimit);
          }}
        />
      </main>
    );
  }

  const leftHintOpacity  = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));
  const rightHintOpacity = Math.max(0, Math.min(1,  dragX / SWIPE_THRESHOLD));
  const cardRotate       = (dragX / 400) * 8;
  const cardScale        = isDragging ? 1.02 : 1;
  const difficultyLabel =
    card?.difficulty === "easy" ? "Dễ" :
    card?.difficulty === "medium" ? "Trung bình" :
    "Khó";
  const deckTempo = cards.length < 5 ? "Khởi động" : cards.length < 15 ? "Đang vào nhịp" : "Bền nhịp";

  return (
    <main className="h-[100dvh] max-h-[100dvh] bg-background relative overflow-hidden flex flex-col">
      {/* ── Offline banner ── */}
      {offline && (
        <div className="shrink-0 bg-amber-500 text-white py-2 px-4 text-center font-semibold text-xs flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4" /> Đang offline, tiến độ sẽ được đồng bộ khi có mạng
        </div>
      )}

      {/* ── Header ── */}
      <header className="shrink-0 z-50 bg-surface border-b border-border px-4 py-3 md:px-7 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={() => router.push("/workspace")}
            aria-label="Về workspace"
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border bg-background hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold text-primary uppercase tracking-[0.12em]">
              <Sparkles className="w-3.5 h-3.5" /> Ôn tập thông minh
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight truncate max-w-[220px] md:max-w-none">Deck #{deckId}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[0.88rem] transition-colors border",
              isExplainMode ? "bg-primary text-white border-primary" : "bg-background border-border text-foreground hover:bg-muted/50"
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
        "flex-1 min-h-0 flex flex-col md:flex-row gap-4 md:gap-5 p-3 md:p-6 max-w-[1360px] mx-auto w-full max-h-full overflow-hidden",
        isExplainMode ? "overflow-hidden" : ""
      )}>
        {/* ── Explain Sidebar ── */}
        {isExplainMode && (
          <aside className="w-full md:w-[360px] h-[42%] md:h-full max-h-full min-h-0 flex flex-col bg-surface-raised border border-border rounded-2xl shadow-sm animate-in slide-in-from-left-4 duration-300 overflow-hidden">
            <div className="shrink-0 p-4 border-b border-border bg-surface">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" /> Trợ lý học tập AI
                </h3>
                <button
                  onClick={() => setIsExplainMode(false)}
                  className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
                  aria-label="Đóng tutor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-muted-foreground text-[0.82rem] leading-relaxed">Hỏi trong phạm vi flashcard hiện tại.</p>
            </div>

            <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 custom-scrollbar">
              {chatHistory.length === 0 ? (
                <div className="min-h-full flex flex-col justify-center px-1 py-3 text-muted-foreground">
                  <div className="text-center px-4">
                    <Sparkles className="w-9 h-9 mb-4 text-primary mx-auto" />
                    <p className="text-sm font-medium leading-relaxed">Chọn một câu hỏi để bắt đầu nhanh.</p>
                  </div>
                  <div className="mt-5 grid max-h-[280px] gap-2 overflow-y-auto pr-1 custom-scrollbar">
                    {TUTOR_SUGGESTIONS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleTutorSuggestion(item.prompt)}
                        disabled={isChatting}
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] disabled:opacity-50 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map((m, i) => (
                  <div key={i} className={cn(
                    "p-3.5 rounded-2xl text-[0.9rem] leading-relaxed max-w-[92%] relative group/msg break-words",
                    m.role === "user"
                      ? "ml-auto bg-primary text-white font-medium rounded-tr-sm"
                      : "mr-auto bg-surface border border-border text-foreground font-medium rounded-tl-sm"
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
                <div className="mr-auto max-w-[92%] bg-surface border border-border p-3.5 rounded-2xl rounded-tl-sm text-muted-foreground text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    Đang tạo giải thích dựa trên thẻ này...
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-44 rounded-full bg-muted animate-pulse" />
                    <div className="h-2 w-32 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Citation Popover */}
            {activeCitation && (
              <div className="absolute inset-0 z-[60] bg-foreground/25 flex items-end p-3 animate-in fade-in duration-200">
                <div className="w-full bg-surface border border-border rounded-2xl p-5 shadow-lg animate-in slide-in-from-bottom-4 duration-300 relative">
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="absolute right-4 top-4 w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <X className="w-5 h-5"/>
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                      {activeCitation.id}
                    </div>
                    <h4 className="font-bold text-lg">Điểm chính</h4>
                  </div>
                  <p className="text-base font-semibold leading-relaxed mb-5 text-foreground">
                    {activeCitation.text}
                  </p>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-surface-muted border border-border/60">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-primary mb-2 flex items-center gap-2">
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

            <div className="shrink-0 p-3 bg-surface border-t border-border mt-auto">
              {chatHistory.length > 0 && !isChatting && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {TUTOR_SUGGESTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleTutorSuggestion(item.prompt)}
                      disabled={isChatting}
                      className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-[0.76rem] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative group">
                <input
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-border bg-background text-foreground font-medium placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder={isChatting ? "AI đang chuẩn bị câu trả lời..." : "Nhập câu hỏi của bạn..."}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isChatting) handleExplain();
                    e.stopPropagation();
                  }}
                  disabled={isChatting}
                />
                <button
                  className="absolute right-2 top-2 w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
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
        <section className="flex-1 min-h-0 flex flex-col items-center justify-center w-full relative overflow-hidden">
          {card && (
            <div className="w-full max-w-[860px] h-full min-h-0 flex flex-col gap-4">
              {/* Progress and status */}
              <div className="shrink-0 flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.76rem] font-semibold text-muted-foreground">Thẻ {idx + 1} trong {cards.length}</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                   <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-primary text-[0.75rem] font-semibold tracking-wide">
                    {deckTempo}
                  </div>
                </div>
              </div>

              {/* Card area */}
              <div className="relative group w-full flex-1 min-h-[320px]">
                {/* Swipe hints */}
                <div
                  className="absolute top-1/2 right-8 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 text-primary font-bold transition-opacity bg-surface px-4 py-2 rounded-xl shadow-lg border border-primary/60"
                  style={{ opacity: rightHintOpacity }}
                >
                  <Zap className="w-5 h-5" /> Dễ
                </div>
                <div
                  className="absolute top-1/2 left-8 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 text-rose-500 font-bold transition-opacity bg-surface px-4 py-2 rounded-xl shadow-lg border border-rose-500/60"
                  style={{ opacity: leftHintOpacity }}
                >
                  <RotateCcw className="w-5 h-5" /> Lại
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
                  <div className="absolute inset-0 w-full h-full rounded-[28px] p-6 md:p-8 bg-surface-muted border border-border shadow-sm [backface-visibility:hidden] flex flex-col">
                    <div className="flex justify-between items-start gap-4 mb-6">
                      <div>
                        <div className="text-[0.74rem] font-semibold text-muted-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" /> Câu hỏi
                        </div>
                        <div className="mt-2 text-xs font-semibold text-muted-foreground">Nhấn vào thẻ hoặc bấm Space để lật.</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onPointerDown={stopFlashcardPointer}
                          onPointerUp={stopFlashcardPointer}
                          onClick={handleExplainButtonClick}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-primary text-[0.72rem] font-semibold hover:bg-muted/50 transition-colors"
                        >
                          <Bot className="w-3.5 h-3.5" /> Giải thích
                        </button>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[0.72rem] font-semibold",
                          card.difficulty === "easy" ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" :
                          card.difficulty === "medium" ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" :
                          "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800"
                        )}>
                          {difficultyLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
                      {card.image_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={card.image_url}
                            alt={card.front}
                            className="max-h-48 md:max-h-56 w-auto rounded-2xl object-contain shadow-sm"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="text-center text-base md:text-lg lg:text-xl font-bold leading-tight text-foreground">
                            {card.front}
                          </div>
                        </>
                      ) : (
                        <div className="max-w-[720px] text-center text-xl md:text-2xl lg:text-[1.85rem] font-bold leading-tight text-foreground">
                          {card.front}
                        </div>
                      )}
                    </div>
                    <div className="pt-5 mt-auto border-t border-border/60 flex items-center justify-center gap-2 text-muted-foreground font-semibold text-xs">
                      Nhấn để lật đáp án
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 w-full h-full rounded-[28px] p-6 md:p-8 bg-surface border border-primary/30 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col">
                    <div className="flex justify-between items-start gap-4 mb-6">
                      <div className="text-[0.74rem] font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" /> Đáp án
                      </div>
                      <button
                        type="button"
                        onPointerDown={stopFlashcardPointer}
                        onPointerUp={stopFlashcardPointer}
                        onClick={handleExplainButtonClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-primary text-[0.72rem] font-semibold hover:bg-muted/50 transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" /> Giải thích
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1">
                      <div className="min-h-full flex items-center justify-center">
                        <p className={cn(
                          "max-w-[720px] text-base md:text-lg lg:text-xl font-semibold leading-relaxed text-foreground whitespace-pre-wrap",
                          card.back.includes("\n") ? "text-left" : "text-center"
                        )}>
                          {card.back}
                        </p>
                      </div>
                    </div>
                    <div className="pt-5 mt-auto border-t border-border/60 flex items-center justify-center gap-2 text-muted-foreground font-semibold text-xs">
                      Chấm điểm bên dưới để tiếp tục
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom UI area */}
              <div className="shrink-0 min-h-[116px] flex flex-col items-center justify-center">
                {!isFlipped ? (
                  <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {idx === 0 && (
                      <div className="flex gap-4 items-center px-4 py-2.5 rounded-xl bg-surface border border-border shadow-sm">
                        <Keyboard className="w-5 h-5 text-muted-foreground" />
                        <div className="flex gap-3 text-[0.75rem] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-background">Space</kbd> Lật</span>
                          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-background">←/→</kbd> Chuyển</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-2"
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold underline decoration-2 underline-offset-8">Kiểm tra kết quả</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in zoom-in-95 duration-200">
                    {([0, 1, 2, 3] as const).map((q) => {
                      const r = RATING[q];
                      const Icon = r.icon;
                      const isActive = ratingQuality === q;
                      return (
                        <button
                          key={q}
                          onClick={() => handleRate(q)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3.5 rounded-2xl transition-all duration-200 active:scale-95 shadow-sm",
                            r.color,
                            isActive ? "scale-90 opacity-50 ring-4 ring-background/80" : "hover:-translate-y-1 hover:brightness-105"
                          )}
                        >
                          <Icon className="w-6 h-6 mb-0.5" strokeWidth={3} />
                          <span className="text-[0.9rem] font-bold">{r.label}</span>
                          <span className="text-[0.68rem] font-semibold opacity-85">{r.hint}</span>
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
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-foreground/90 text-[hsl(var(--background))] rounded-2xl font-semibold text-sm shadow-lg animate-in slide-in-from-bottom flex items-center gap-3 z-50">
              <Sparkles className="text-primary w-6 h-6" /> {msg}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
