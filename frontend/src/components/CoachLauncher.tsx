"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Map, Maximize2, Repeat, Sparkles, X } from "lucide-react";
import { Deck, fetchDecks, fetchStudySummary, User } from "../lib/app-client";
import CoachChat from "./CoachChat";

type StudySummary = Awaited<ReturnType<typeof fetchStudySummary>>;
type LauncherIntent = "none" | "quiz";

function actionableCount(summary?: StudySummary | null) {
  return (summary?.due_cards ?? 0) + (summary?.new_cards ?? 0);
}

export default function CoachLauncher({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [summaries, setSummaries] = useState<Record<number, StudySummary | null>>({});
  const [intent, setIntent] = useState<LauncherIntent>("none");
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSuggestions() {
      try {
        const nextDecks = await fetchDecks(user.id);
        if (cancelled) return;
        setDecks(nextDecks);
        const pairs = await Promise.all(
          nextDecks.map(async (deck) => {
            try {
              const summary = await fetchStudySummary(deck.id, user.id);
              return [deck.id, summary] as const;
            } catch {
              return [deck.id, null] as const;
            }
          })
        );
        if (!cancelled) setSummaries(Object.fromEntries(pairs));
      } catch {
        if (!cancelled) {
          setDecks([]);
          setSummaries({});
        }
      }
    }

    void hydrateSuggestions();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSuggestionOpen(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [user.id]);

  const suggestion = useMemo(() => {
    const totalCards = Object.values(summaries).reduce((sum, item) => sum + (item?.total_cards ?? 0), 0);
    const priorityDeck = [...decks].sort((a, b) => {
      const aSummary = summaries[a.id];
      const bSummary = summaries[b.id];
      const aPressure = (aSummary?.due_cards ?? 0) * 2 + (aSummary?.new_cards ?? 0);
      const bPressure = (bSummary?.due_cards ?? 0) * 2 + (bSummary?.new_cards ?? 0);
      if (bPressure !== aPressure) return bPressure - aPressure;
      return (bSummary?.total_cards ?? 0) - (aSummary?.total_cards ?? 0);
    })[0];
    const prioritySummary = priorityDeck ? summaries[priorityDeck.id] : null;
    const due = actionableCount(prioritySummary);

    if (decks.length === 0) {
      return {
        title: "Tạo deck đầu tiên",
        body: "Mình sẽ giúp bạn biến tài liệu thành flashcards và dựng phiên học đầu tiên.",
        primaryLabel: "Tạo deck",
        primaryHref: "/workspace",
        secondaryLabel: "Hỏi Coach",
        icon: Sparkles,
      };
    }

    if (totalCards === 0 && priorityDeck) {
      return {
        title: "Deck còn trống",
        body: `Thêm tài liệu vào ${priorityDeck.name} để mình tạo thẻ và quiz cho bạn.`,
        primaryLabel: "Thêm thẻ",
        primaryHref: `/generate?deckId=${priorityDeck.id}`,
        secondaryLabel: "Hỏi Coach",
        icon: Sparkles,
      };
    }

    if (due > 0 && priorityDeck) {
      return {
        title: `${due} thẻ cần ôn`,
        body: `Ưu tiên ${priorityDeck.name}. Bạn có thể ôn ngay hoặc để mình quiz trong chat.`,
        primaryLabel: "Ôn ngay",
        primaryHref: `/study/${priorityDeck.id}`,
        secondaryLabel: "Quiz trong chat",
        icon: Repeat,
      };
    }

    if (priorityDeck && (prioritySummary?.total_cards ?? 0) >= 2) {
      return {
        title: "Hôm nay đã ổn",
        body: `Không còn thẻ đến hạn. Làm thử thách ${priorityDeck.name} để kiểm tra độ chắc.`,
        primaryLabel: "Thử thách",
        primaryHref: `/play/${priorityDeck.id}`,
        secondaryLabel: "Quiz trong chat",
        icon: Map,
      };
    }

    return {
      title: "Memio Coach sẵn sàng",
      body: "Mình có thể gợi ý bước học tiếp theo dựa trên deck và tiến độ của bạn.",
      primaryLabel: "Mở Coach",
      primaryHref: "/coach",
      secondaryLabel: "Hỏi Coach",
      icon: Bot,
    };
  }, [decks, summaries]);

  const SuggestionIcon = suggestion.icon;

  const openChat = (nextIntent: LauncherIntent = "none") => {
    setIntent(nextIntent);
    setSuggestionOpen(false);
    setOpen(true);
  };

  const expandHref = activeThreadId ? `/coach?threadId=${activeThreadId}` : "/coach?draft=1";

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[160] h-[min(680px,calc(100vh-140px))] w-[min(420px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl md:bottom-24">
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            <Link
              href={expandHref}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background/90 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Mở trang Memio Coach"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSuggestionOpen(false);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background/90 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Đóng Memio Coach"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <CoachChat
            user={user}
            compact
            initialQuiz={intent === "quiz"}
            initialThreadId={activeThreadId}
            onThreadChange={setActiveThreadId}
          />
        </div>
      )}

      {!open && suggestionOpen && (
        <div className="fixed bottom-[9.75rem] right-5 z-[158] hidden w-[min(360px,calc(100vw-40px))] rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur-md sm:block md:bottom-24">
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-border/70">
              <SuggestionIcon className="h-4.5 w-4.5 text-primary" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight">{suggestion.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{suggestion.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={suggestion.primaryHref}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                >
                  {suggestion.primaryLabel}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => openChat(suggestion.secondaryLabel === "Quiz trong chat" ? "quiz" : "none")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                >
                  {suggestion.secondaryLabel}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openChat()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Mở Memio Coach"
            >
              <Bot className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            setSuggestionOpen(false);
            return;
          }
          setSuggestionOpen((value) => !value);
        }}
        className="fixed bottom-24 right-5 z-[159] inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-[hsl(var(--primary-foreground))] shadow-xl transition-[opacity,transform] hover:opacity-95 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] md:bottom-6"
        aria-label={open || suggestionOpen ? "Đóng Memio Coach" : "Mở Memio Coach"}
        aria-expanded={open || suggestionOpen}
      >
        <Bot className="h-6 w-6" aria-hidden />
      </button>
    </>
  );
}
