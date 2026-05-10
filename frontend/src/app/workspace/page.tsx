"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { Skeleton } from "../../components/ui/skeleton";
import {
  CoachLearningIntelligence,
  createDeck,
  Deck,
  deleteDeck,
  disableDeckSharing,
  enableDeckSharing,
  fetchAnalytics,
  fetchCoachLearningIntelligence,
  fetchStudySummary,
  fetchDecks,
  fetchLearningGoals,
  getStoredUser,
  LearningGoal,
  useClientReady,
  upsertLearningGoal,
  deleteLearningGoal,
  User,
} from "../../lib/app-client";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, FolderKanban, Link2, Map, Pencil, Plus, SlidersHorizontal, Sparkles, Target, Trash, X, Lock, Globe2, Repeat, Brain, CalendarDays } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

function shareUrl(token: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/deck/${token}`;
}

type StudySummary = Awaited<ReturnType<typeof fetchStudySummary>>;

type MissionState = "no_deck" | "no_cards" | "ready" | "complete";

function actionableCount(summary?: StudySummary | null) {
  return (summary?.due_cards ?? 0) + (summary?.new_cards ?? 0);
}

function todayProgress(summary?: StudySummary | null) {
  const total = summary?.total_cards ?? 0;
  if (total <= 0) return 0;
  const remaining = Math.min(total, actionableCount(summary));
  return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
}

export default function WorkspacePage() {
  const router = useRouter();
  const clientReady = useClientReady();
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<number, StudySummary | null>>({});
  const [learningIntel, setLearningIntel] = useState<CoachLearningIntelligence | null>(null);
  const [learningGoals, setLearningGoals] = useState<Record<number, LearningGoal>>({});
  const [goalDrafts, setGoalDrafts] = useState<Record<number, { target_date: string; desired_mastery: number; daily_workload: number }>>({});
  const [savingGoalId, setSavingGoalId] = useState<number | null>(null);
  const [editingGoalDeckId, setEditingGoalDeckId] = useState<number | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [showReadyOnly, setShowReadyOnly] = useState(false);
  const [sort, setSort] = useState<"activity" | "name">("activity");
  const [shareModal, setShareModal] = useState<Deck | null>(null);
  const [deleteConfirmDeck, setDeleteConfirmDeck] = useState<Deck | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createDeckOpen, setCreateDeckOpen] = useState(false);

  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const setRevealVars = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  useEffect(() => {
    if (!clientReady) return;
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void hydrate(storedUser.id);
  }, [clientReady, router]);

  const hydrate = async (userId: number) => {
    try {
      const d = await fetchDecks();
      setDecks(d);
      const counts = await Promise.all(
        d.map(async (deck) => {
          try {
            const summary = await fetchStudySummary(deck.id);
            return [deck.id, summary] as const;
          } catch {
            return [deck.id, null] as const;
          }
        })
      );
      setCardCounts(Object.fromEntries(counts));
      fetchLearningGoals()
        .then((goals) => {
          setLearningGoals(Object.fromEntries(goals.map((goal) => [goal.deck_id, goal])));
        })
        .catch(() => setLearningGoals({}));
      fetchCoachLearningIntelligence(3)
        .then(setLearningIntel)
        .catch(() => setLearningIntel(null));
      fetchAnalytics()
        .then((data) => setStreak(data.streak ?? 0))
        .catch(() => {});
    } catch {
      setMsg("Không tải được workspace. Hãy kiểm tra backend.");
    }
  };

  const totalCards = useMemo(() => Object.values(cardCounts).reduce((s, n) => s + (n?.total_cards ?? 0), 0), [cardCounts]);
  const totalDueCards = useMemo(() => Object.values(cardCounts).reduce((s, n) => s + (n?.due_cards ?? 0), 0), [cardCounts]);
  const totalNewCards = useMemo(() => Object.values(cardCounts).reduce((s, n) => s + (n?.new_cards ?? 0), 0), [cardCounts]);
  const totalActionableCards = totalDueCards + totalNewCards;
  const readyDecks = useMemo(() => decks.filter((d) => {
    const sum = cardCounts[d.id];
    return actionableCount(sum) > 0;
  }).length, [decks, cardCounts]);
  const decksByActivity = useMemo(() => {
    return [...decks].sort((a, b) => {
      const suma = cardCounts[a.id];
      const sumb = cardCounts[b.id];
      const goalA = learningGoals[a.id];
      const goalB = learningGoals[b.id];
      const goalBoostA = goalA ? (goalA.urgency === "high" ? 40 : goalA.urgency === "medium" ? 20 : 8) : 0;
      const goalBoostB = goalB ? (goalB.urgency === "high" ? 40 : goalB.urgency === "medium" ? 20 : 8) : 0;
      const aPriority = (suma?.due_cards ?? 0) * 2 + (suma?.new_cards ?? 0) + goalBoostA;
      const bPriority = (sumb?.due_cards ?? 0) * 2 + (sumb?.new_cards ?? 0) + goalBoostB;
      if (bPriority !== aPriority) return bPriority - aPriority;
      return (sumb?.total_cards ?? 0) - (suma?.total_cards ?? 0);
    });
  }, [decks, cardCounts, learningGoals]);
  const priorityDeck = useMemo(() => {
    const d = decksByActivity.find((x) => {
      const sum = cardCounts[x.id];
      return actionableCount(sum) > 0;
    });
    return d ?? decksByActivity.find((x) => (cardCounts[x.id]?.total_cards ?? 0) >= 2) ?? decksByActivity[0] ?? null;
  }, [decksByActivity, cardCounts]);
  const prioritySummary = priorityDeck ? cardCounts[priorityDeck.id] : null;
  const defaultGoal = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return {
      target_date: date.toISOString().slice(0, 10),
      desired_mastery: 85,
      daily_workload: 20,
    };
  }, []);
  const missionState: MissionState = decks.length === 0
    ? "no_deck"
    : totalCards === 0
      ? "no_cards"
      : totalActionableCards > 0
        ? "ready"
        : "complete";
  const estimatedMinutes = Math.max(3, Math.min(25, Math.ceil(Math.max(1, actionableCount(prioritySummary)) * 0.75)));
  const priorityGoal = priorityDeck ? learningGoals[priorityDeck.id] : null;
  const missionCopy = {
    no_deck: {
      eyebrow: "Bắt đầu",
      title: "Tạo bộ thẻ đầu tiên",
      body: "Đặt tên theo môn học hoặc chủ đề. Sau đó Memio sẽ giúp bạn biến tài liệu thành flashcards để ôn mỗi ngày.",
      cta: "Tạo deck đầu tiên",
    },
    no_cards: {
      eyebrow: "Cần nội dung",
      title: "Deck đã sẵn sàng, hãy thêm thẻ",
      body: "Bạn đã có deck nhưng chưa có flashcards. Tải tài liệu hoặc thêm thẻ để Memio tạo phiên học đầu tiên.",
      cta: "Thêm thẻ ngay",
    },
    ready: {
      eyebrow: "Nhiệm vụ hôm nay",
      title: priorityDeck ? `Ôn ${priorityDeck.name}` : "Bắt đầu phiên học hôm nay",
      body: priorityDeck
        ? priorityGoal
          ? `Mục tiêu thi còn ${priorityGoal.days_remaining} ngày. Ưu tiên ${priorityGoal.recommended_daily_cards} thẻ/ngày để giữ tiến độ.`
          : `${actionableCount(prioritySummary)} thẻ đang chờ trong deck này. Ưu tiên hoàn thành phiên ngắn trước khi chuyển sang thử thách.`
        : "Bạn có thẻ cần ôn hôm nay. Hoàn thành một phiên ngắn để giữ nhịp nhớ.",
      cta: "Bắt đầu phiên học hôm nay",
    },
    complete: {
      eyebrow: "Đã ổn hôm nay",
      title: "Không còn thẻ đến hạn",
      body: priorityDeck
        ? "Bạn đã xử lý xong nhịp ôn chính. Nếu còn thời gian, làm một thử thách ngắn để kiểm tra độ chắc."
        : "Bạn đã ổn hôm nay. Có thể thêm thẻ mới để chuẩn bị phiên học tiếp theo.",
      cta: "Kiểm tra lại bằng thử thách",
    },
  }[missionState];
  const filteredDecks = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = sort === "activity"
      ? decksByActivity
      : [...decks].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "vi"));

    return base.filter((d) => {
      const sum = cardCounts[d.id];
      const due = actionableCount(sum);
      if (showReadyOnly && due <= 0) return false;
      if (!query) return true;
      const hay = `${d.name ?? ""} ${d.description ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q, sort, decks, decksByActivity, showReadyOnly, cardCounts]);

  const handleCreateDeck = async () => {
    if (!user || !newDeckName.trim()) return;
    setCreating(true);
    try {
      await createDeck(newDeckName.trim(), newDeckDesc.trim());
      setNewDeckName(""); setNewDeckDesc(""); setMsg(null);
      setCreateDeckOpen(false);
      await hydrate(user.id);
    } catch {
      setMsg("Không tạo được deck.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeck = (deck: Deck) => {
    setDeleteConfirmDeck(deck);
  };

  const confirmDeleteDeck = async () => {
    if (!deleteConfirmDeck) return;
    setDeleting(true);
    try {
      await deleteDeck(deleteConfirmDeck.id);
      setDeleteConfirmDeck(null);
      if (user) await hydrate(user.id);
    } catch {
      setMsg("Không xóa được deck.");
    } finally {
      setDeleting(false);
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

  const handlePrimaryMission = () => {
    if (missionState === "no_deck") {
      setCreateDeckOpen(true);
      return;
    }
    if (missionState === "no_cards") {
      router.push(priorityDeck ? `/generate?deckId=${priorityDeck.id}` : "/generate");
      return;
    }
    if (missionState === "ready" && priorityDeck) {
      router.push(`/study/${priorityDeck.id}`);
      return;
    }
    if (priorityDeck && (prioritySummary?.total_cards ?? 0) >= 2) {
      router.push(`/play/${priorityDeck.id}`);
      return;
    }
    router.push("/generate");
  };

  const goToCoachQuiz = () => {
    router.push("/coach");
  };

  const explainCluster = (label: string, deckName: string, deckId: number) => {
    router.push(`/coach?deckId=${deckId}&prompt=${encodeURIComponent(`Hãy giải thích cụm kiến thức yếu "${label}" trong deck "${deckName}" và chỉ cho tôi cách ôn hiệu quả.`)}`);
  };

  const quizCluster = (deckId: number, cardIds: number[]) => {
    const ids = cardIds.slice(0, 10).join(",");
    router.push(`/coach?quiz=1&quizDeckId=${deckId}&cardIds=${ids}`);
  };

  const updateGoalDraft = (deckId: number, patch: Partial<{ target_date: string; desired_mastery: number; daily_workload: number }>) => {
    setGoalDrafts((prev) => ({
      ...prev,
      [deckId]: { ...(prev[deckId] ?? defaultGoal), ...patch },
    }));
  };

  const saveGoal = async (deckId: number) => {
    if (!user) return;
    const draft = goalDrafts[deckId] ?? defaultGoal;
    setSavingGoalId(deckId);
    try {
      const goal = await upsertLearningGoal({
        deck_id: deckId,
        target_date: draft.target_date,
        desired_mastery: draft.desired_mastery,
        daily_workload: draft.daily_workload,
      });
      setLearningGoals((prev) => ({ ...prev, [deckId]: goal }));
      setEditingGoalDeckId(null);
      setMsg(null);
    } catch {
      setMsg("Không lưu được mục tiêu ôn thi.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const deleteGoal = async (deckId: number, goalId: number) => {
    setDeletingGoalId(goalId);
    try {
      await deleteLearningGoal(goalId);
      setLearningGoals((prev) => {
        const next = { ...prev };
        delete next[deckId];
        return next;
      });
      setEditingGoalDeckId(null);
    } catch {
      setMsg("Không xóa được mục tiêu.");
    } finally {
      setDeletingGoalId(null);
    }
  };

  const startEditGoal = (deckId: number, goal: LearningGoal) => {
    setGoalDrafts((prev) => ({
      ...prev,
      [deckId]: {
        target_date: goal.target_date,
        desired_mastery: goal.desired_mastery,
        daily_workload: goal.daily_workload,
      },
    }));
    setEditingGoalDeckId(deckId);
  };

  if (!user) return (
    <AppShell user={null}>
      <div className="space-y-6">
        <Skeleton className="h-[340px] rounded-2xl" />
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex justify-between items-center">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[390px]" />)}
          </div>
        </div>
      </div>
    </AppShell>
  );

  return (
    <AppShell user={user}>
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-background/55 backdrop-blur-xl",
          "shadow-[0_14px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_14px_50px_rgba(0,0,0,0.35)]",
          "before:pointer-events-none before:absolute before:inset-0 before:opacity-100",
          "before:bg-[radial-gradient(900px_circle_at_20%_-10%,hsl(var(--primary)/0.10),transparent_45%),radial-gradient(700px_circle_at_85%_0%,hsl(var(--primary)/0.06),transparent_40%)]"
        )}
      >
        <header className="px-6 sm:px-8 pt-7 pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-4xl">
              <p className="text-[0.8rem] font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-border/70">
                  <FolderKanban className="w-4 h-4 text-primary shrink-0" aria-hidden />
                </span>
                Bộ thẻ
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance mb-4">
                Xin chào, {user.name}
              </h1>
              <p className="text-muted-foreground text-[0.98rem] leading-relaxed">
                Tạo deck theo chủ đề, thêm tài liệu để sinh thẻ, rồi ôn đều mỗi ngày.
              </p>
            </div>
          </div>
        </header>

        {/* Daily Mission */}
        <section className="px-6 sm:px-8 pb-8">
        <section
          aria-label="Nhiệm vụ hôm nay"
          className="self-start overflow-hidden rounded-2xl ring-1 ring-border/80 bg-background/75 shadow-sm"
        >
          <div>
            <div className="px-6 py-6 sm:px-7 sm:py-7">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/35 px-3 py-1.5 text-[0.78rem] font-semibold text-muted-foreground">
                  <Target className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {missionCopy.eyebrow}
                </div>
                {streak > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/60 bg-orange-50/80 px-3 py-1.5 text-[0.78rem] font-semibold text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300">
                    🔥 {streak} ngày liên tiếp
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-balance">
                {missionCopy.title}
              </h2>
              <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                {missionCopy.body}
              </p>

              {priorityDeck && totalCards > 0 && (
                <div className="mt-5 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[0.78rem] font-semibold text-muted-foreground">
                        Deck ưu tiên
                      </p>
                      <p className="mt-1 truncate text-[0.95rem] font-semibold text-foreground">
                        {priorityDeck.name}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[300px]">
                      <div className="rounded-xl bg-background/70 px-3 py-2 ring-1 ring-border/70">
                        <p className="text-lg font-bold tabular-nums">{prioritySummary?.due_cards ?? 0}</p>
                        <p className="text-[0.72rem] text-muted-foreground">đến hạn</p>
                      </div>
                      <div className="rounded-xl bg-background/70 px-3 py-2 ring-1 ring-border/70">
                        <p className="text-lg font-bold tabular-nums">{prioritySummary?.new_cards ?? 0}</p>
                        <p className="text-[0.72rem] text-muted-foreground">thẻ mới</p>
                      </div>
                      <div className="rounded-xl bg-background/70 px-3 py-2 ring-1 ring-border/70">
                        <p className="text-lg font-bold tabular-nums">{estimatedMinutes}</p>
                        <p className="text-[0.72rem] text-muted-foreground">phút</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {priorityGoal && (
                <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-2 text-[0.78rem] font-semibold text-primary">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        Mục tiêu thi
                      </p>
                      <p className="mt-1 text-[0.9rem] text-foreground">
                        {priorityGoal.plan_summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/coach?deckId=${priorityGoal.deck_id}&prompt=${encodeURIComponent("Tôi có kịp ôn trước ngày thi không? Hãy lập kế hoạch học hôm nay dựa trên mục tiêu hiện tại.")}`)}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 px-3 py-2 text-[0.82rem] font-semibold text-foreground transition-colors hover:bg-muted/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                    >
                      Hỏi Coach
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-[0.95rem] text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-opacity"
                  onClick={handlePrimaryMission}
                >
                  {missionState === "no_deck" || missionState === "no_cards" ? (
                    <Sparkles className="w-4 h-4" aria-hidden />
                  ) : missionState === "complete" ? (
                    <Map className="w-4 h-4" aria-hidden />
                  ) : (
                    <Repeat className="w-4 h-4" aria-hidden />
                  )}
                  {missionCopy.cta}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-3 text-[0.92rem] font-semibold text-foreground transition-colors hover:bg-muted/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={goToCoachQuiz}
                  disabled={totalCards < 2}
                  title="Mở Memio Coach để quiz nhanh trong chat"
                >
                  <FolderKanban className="w-4 h-4 text-primary" aria-hidden />
                  Quiz nhanh với Coach
                </button>
            </div>
          </div>

          {learningIntel && learningIntel.clusters.length > 0 && (
            <div className="border-t border-border bg-background/45 px-6 py-5 sm:px-7">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-[0.78rem] font-semibold text-muted-foreground">
                    <Brain className="h-3.5 w-3.5 text-primary" aria-hidden />
                    Điểm yếu cần xử lý
                  </p>
                  <p className="mt-1 text-[0.86rem] text-muted-foreground">
                    {learningIntel.total_weak_cards} thẻ đang tạo thành các cụm kiến thức nên ôn theo nhóm.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {learningIntel.clusters.map((cluster) => (
                  <article
                    key={cluster.id}
                    className="flex min-h-[190px] flex-col rounded-xl border border-border/75 bg-background/75 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[0.95rem] font-semibold tracking-tight">
                          {cluster.label}
                        </h3>
                        <p className="mt-1 truncate text-[0.78rem] text-muted-foreground">
                          {cluster.deck_name} · {cluster.card_count} thẻ
                        </p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-muted/45 px-2.5 py-1 text-right ring-1 ring-border/70">
                        <p className="text-[0.72rem] text-muted-foreground">mastery</p>
                        <p className="text-sm font-bold tabular-nums">{cluster.mastery_score}%</p>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-[0.84rem] leading-relaxed text-muted-foreground">
                      {cluster.reason}
                    </p>
                    <div className="mt-3 space-y-1">
                      {cluster.sample_cards.slice(0, 2).map((card) => (
                        <p key={card.id} className="truncate text-[0.78rem] text-foreground/80">
                          {card.front}
                        </p>
                      ))}
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => explainCluster(cluster.label, cluster.deck_name, cluster.deck_id)}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-background/70 px-3 py-2 text-[0.8rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                      >
                        Giải thích
                      </button>
                      <button
                        type="button"
                        onClick={() => quizCluster(cluster.deck_id, cluster.card_ids)}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-[0.8rem] font-semibold text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                      >
                        Quiz cụm này
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

            <div className="border-t border-border bg-muted/20 px-6 py-4 sm:px-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Deck", value: decks.length, hint: "đang quản lý" },
                  { label: "Flashcards", value: totalCards, hint: "đã tạo" },
                  { label: "Cần xử lý", value: totalActionableCards, hint: readyDecks > 0 ? `${readyDecks} deck sẵn sàng` : "không có thẻ đến hạn" },
                ].map((m) => (
                  <div key={m.label} className="flex min-w-0 items-center justify-between gap-4 rounded-xl bg-background/70 px-4 py-3 ring-1 ring-border/70">
                    <div className="min-w-0">
                      <p className="truncate text-[0.8rem] font-semibold text-foreground">{m.label}</p>
                      <p className="truncate text-[0.72rem] text-muted-foreground">{m.hint}</p>
                    </div>
                    <p className="shrink-0 text-xl font-bold tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        </section>
      </section>

      {/* Deck list */}
      <section className="rounded-2xl border border-border bg-background/70 backdrop-blur-md mt-6 shadow-[0_10px_36px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_36px_rgba(0,0,0,0.30)]">
        <div className="px-6 sm:px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg tracking-tight">Deck của tôi</h2>
            <p className="text-muted-foreground text-[0.9rem]">
              {decks.length === 0 ? "Chưa có deck nào. Tạo một deck để bắt đầu." : `${decks.length} deck · ${readyDecks} sẵn sàng`}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setCreateDeckOpen(true)}
            className="shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden /> Thêm
          </Button>
        </div>

        {decks.length === 0 ? (
          <div className="px-6 sm:px-8 py-10">
            <div className="rounded-2xl bg-muted/40 ring-1 ring-border/60 px-6 py-7 max-w-2xl">
              <p className="font-medium text-foreground mb-2">Bắt đầu từ một deck</p>
              <p className="text-muted-foreground text-[0.9rem] leading-relaxed">
                Đặt tên theo chủ đề bạn đang học. Sau đó sang “Tạo thẻ” để tải tài liệu và sinh flashcards.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="sr-only" htmlFor="deck-search">
                    Tìm deck
                  </label>
                  <Input
                    id="deck-search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm deck"
                    className="bg-background/70"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[0.9rem] font-semibold",
                      "ring-1 ring-border/80 bg-background/70 hover:bg-muted/35 transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
                      showReadyOnly ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => setShowReadyOnly((v) => !v)}
                    aria-pressed={showReadyOnly}
                  >
                    <SlidersHorizontal className="w-4 h-4" aria-hidden />
                    Sẵn sàng
                    {showReadyOnly && <Check className="w-4 h-4" aria-hidden />}
                  </button>

                  <label className="sr-only" htmlFor="deck-sort">
                    Sắp xếp deck
                  </label>
                  <Select value={sort} onValueChange={(v) => setSort(v as "activity" | "name")}>
                    <SelectTrigger id="deck-sort" aria-label="Sắp xếp deck" className="bg-background/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Hoạt động</SelectItem>
                      <SelectItem value="name">Tên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-[0.85rem] text-muted-foreground">
                {filteredDecks.length}/{decks.length}
              </div>
            </div>

            {filteredDecks.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 ring-1 ring-border/60 px-6 py-7 max-w-2xl">
                <p className="font-medium text-foreground mb-2">Không có kết quả</p>
                <p className="text-muted-foreground text-[0.9rem] leading-relaxed">
                  Thử đổi từ khóa, tắt lọc “Sẵn sàng”, hoặc tạo thêm deck mới.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {filteredDecks.map((deck) => {
                const summary = cardCounts[deck.id];
                const count = summary?.total_cards ?? 0;
                const due = actionableCount(summary);
                const isReady = due > 0;
                const progressW = count > 0 ? Math.max(6, todayProgress(summary)) : 6;
                const recommendedLabel = count === 0 ? "Thêm thẻ" : isReady ? "Ôn ngay" : "Thử thách AI";
                const recommendedIcon = count === 0 ? Sparkles : isReady ? Repeat : Map;
                const RecommendedIcon = recommendedIcon;
                const goal = learningGoals[deck.id];
                const goalDraft = goalDrafts[deck.id] ?? {
                  target_date: goal?.target_date ?? defaultGoal.target_date,
                  desired_mastery: goal?.desired_mastery ?? 85,
                  daily_workload: goal?.daily_workload ?? 20,
                };

                return (
                  <article
                    key={deck.id}
                    className={cn(
                      "group relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/55 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow",
                      "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover:before:opacity-100",
                      "motion-reduce:before:transition-none motion-reduce:transition-none",
                      "before:bg-[radial-gradient(600px_circle_at_var(--x,50%)_var(--y,30%),hsl(var(--primary)/0.10),transparent_40%)]"
                    )}
                    onPointerMove={setRevealVars}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[1.05rem] font-semibold tracking-tight truncate">
                          {deck.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ring-1 ring-border/80",
                              deck.is_public ? "bg-muted text-foreground" : "bg-primary/10 text-primary"
                            )}
                          >
                            {deck.is_public ? (
                              <Globe2 className="w-3.5 h-3.5" aria-hidden />
                            ) : (
                              <Lock className="w-3.5 h-3.5" aria-hidden />
                            )}
                            {deck.is_public ? "Công khai" : "Riêng tư"}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ring-1 ring-border/70",
                              isReady
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isReady ? `Cần ôn: ${due}` : count > 0 ? "Đã xong hôm nay" : "Chưa có thẻ"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-border bg-background/70 text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/35 transition-colors"
                          onClick={() => router.push(`/deck/${deck.id}/edit`)}
                          aria-label="Chỉnh sửa deck"
                          title="Chỉnh sửa deck"
                        >
                          <Pencil className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300 font-semibold hover:opacity-90 transition-opacity"
                          onClick={() => handleDeleteDeck(deck)}
                          aria-label="Xóa deck"
                          title="Xóa deck"
                        >
                          <Trash className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      {deck.description ? (
                        <p className="text-muted-foreground text-[0.9rem] leading-relaxed line-clamp-3">
                          {deck.description}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-[0.9rem] leading-relaxed italic">
                          Thêm mô tả ngắn để dễ nhận diện deck khi có nhiều chủ đề.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-baseline gap-2 text-[0.85rem] text-muted-foreground">
                          <span className="tabular-nums font-medium text-foreground/90">
                            {count}
                          </span>
                          <span>flashcards</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 h-1.5 rounded-full bg-muted ring-1 ring-border/60 overflow-hidden">
                            <span
                              className={cn(
                                "block h-full rounded-full transition-[width] duration-500 ease-out",
                                isReady ? "bg-primary" : "bg-muted-foreground/35"
                              )}
                              style={{ width: `${progressW}%` }}
                            />
                          </span>
                          <span className="text-[0.78rem] tabular-nums text-muted-foreground w-[3ch] text-right">
                            {count > 0 ? `${progressW}%` : "0%"}
                          </span>
                        </div>
                        <p className="text-[0.76rem] text-muted-foreground">
                          {count > 0 ? "tiến độ hoàn thành nhịp hôm nay" : "chưa có dữ liệu học"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                        <p className="text-[0.78rem] font-semibold text-muted-foreground">
                          Hành động phù hợp
                        </p>
                        <p className="mt-1 text-[0.86rem] leading-relaxed text-foreground/90">
                          {count === 0
                            ? "Deck này chưa có thẻ. Hãy thêm tài liệu hoặc tạo flashcards trước."
                            : isReady
                              ? `${due} thẻ đang đến hạn. Nên ôn trước để giữ nhịp nhớ.`
                              : "Hôm nay đã ổn. Có thể làm Thử thách AI để kiểm tra lại."}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
                            Mục tiêu thi
                          </p>
                          {goal && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
                                goal.urgency === "high"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/25 dark:text-rose-200"
                                  : goal.urgency === "medium"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-200"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-200"
                              )}
                            >
                              {goal.days_remaining} ngày
                            </span>
                          )}
                        </div>

                        {goal && editingGoalDeckId !== deck.id ? (
                          <div className="space-y-2">
                            <p className="text-[0.84rem] leading-relaxed text-foreground/90">
                              {goal.plan_summary}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg bg-muted/35 px-2 py-1.5">
                                <p className="text-sm font-bold tabular-nums">{goal.readiness_score}%</p>
                                <p className="text-[0.68rem] text-muted-foreground">sẵn sàng</p>
                              </div>
                              <div className="rounded-lg bg-muted/35 px-2 py-1.5">
                                <p className="text-sm font-bold tabular-nums">{goal.weak_cards}</p>
                                <p className="text-[0.68rem] text-muted-foreground">thẻ yếu</p>
                              </div>
                              <div className="rounded-lg bg-muted/35 px-2 py-1.5">
                                <p className="text-sm font-bold tabular-nums">{goal.recommended_daily_cards}</p>
                                <p className="text-[0.68rem] text-muted-foreground">/ngày</p>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => startEditGoal(deck.id, goal)}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/75 px-3 py-1.5 text-[0.78rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteGoal(deck.id, goal.id)}
                                disabled={deletingGoalId === goal.id}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/25 px-3 py-1.5 text-[0.78rem] font-semibold text-rose-700 dark:text-rose-300 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                              >
                                <Trash className="h-3.5 w-3.5" aria-hidden />
                                {deletingGoalId === goal.id ? "Đang xóa..." : "Xóa"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 gap-2">
                              <label className="sr-only" htmlFor={`goal-date-${deck.id}`}>Ngày thi</label>
                              <Input
                                id={`goal-date-${deck.id}`}
                                type="date"
                                value={goalDraft.target_date}
                                onChange={(e) => updateGoalDraft(deck.id, { target_date: e.target.value })}
                                className="h-9 bg-background/70 text-[0.82rem]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="sr-only" htmlFor={`goal-mastery-${deck.id}`}>Mastery mong muốn</label>
                              <Input
                                id={`goal-mastery-${deck.id}`}
                                type="number"
                                min={50}
                                max={100}
                                value={goalDraft.desired_mastery}
                                onChange={(e) => updateGoalDraft(deck.id, { desired_mastery: Number(e.target.value) })}
                                className="h-9 bg-background/70 text-[0.82rem]"
                              />
                              <label className="sr-only" htmlFor={`goal-workload-${deck.id}`}>Thẻ mỗi ngày</label>
                              <Input
                                id={`goal-workload-${deck.id}`}
                                type="number"
                                min={5}
                                max={200}
                                value={goalDraft.daily_workload}
                                onChange={(e) => updateGoalDraft(deck.id, { daily_workload: Number(e.target.value) })}
                                className="h-9 bg-background/70 text-[0.82rem]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveGoal(deck.id)}
                                disabled={savingGoalId === deck.id}
                                className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-background/75 px-3 py-2 text-[0.8rem] font-semibold text-foreground transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                              >
                                {savingGoalId === deck.id ? "Đang lưu..." : goal ? "Lưu thay đổi" : "Đặt mục tiêu"}
                              </button>
                              {goal && (
                                <button
                                  type="button"
                                  onClick={() => setEditingGoalDeckId(null)}
                                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background/75 px-3 py-2 text-[0.8rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                                >
                                  Hủy
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto pt-5 space-y-3">
                      <button
                        type="button"
                        className={cn(
                          "group/reveal relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                          isReady
                            ? "font-semibold text-[0.95rem] text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95"
                            : "border border-border/80 bg-background/75 text-foreground font-semibold text-[0.95rem] shadow-sm hover:bg-muted/35",
                          "active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-[opacity,background-color,transform] duration-150",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0",
                          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover/reveal:before:opacity-100",
                          "motion-reduce:before:transition-none motion-reduce:transition-none",
                          isReady
                            ? "before:bg-[radial-gradient(560px_circle_at_var(--x,50%)_var(--y,50%),rgba(255,255,255,0.20),transparent_45%)]"
                            : "before:bg-[radial-gradient(520px_circle_at_var(--x,50%)_var(--y,50%),hsl(var(--primary)/0.08),transparent_55%)]"
                        )}
                        onClick={() => router.push(count === 0 ? `/generate?deckId=${deck.id}` : isReady ? `/study/${deck.id}` : `/play/${deck.id}`)}
                        onPointerMove={setRevealVars}
                        disabled={!isReady && count === 1}
                      >
                        <RecommendedIcon className={cn("w-4 h-4", !isReady && count > 0 ? "text-primary" : "")} aria-hidden />
                        {recommendedLabel}
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/70 px-2.5 py-2.5 text-[0.82rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                          onClick={() => router.push(`/generate?deckId=${deck.id}`)}
                          title="Thêm tài liệu hoặc tạo flashcards cho deck này"
                        >
                          <Sparkles className="w-4 h-4 text-primary" aria-hidden />
                          Thêm
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/70 px-2.5 py-2.5 text-[0.82rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                          onClick={() => router.push(isReady ? `/play/${deck.id}` : `/study/${deck.id}`)}
                          disabled={count === 0 || (isReady && count < 2)}
                          title={isReady ? "Đổi sang chế độ chơi AI" : "Ôn flashcards truyền thống"}
                        >
                          {isReady ? (
                            <>
                              <Map className="w-4 h-4 text-primary" aria-hidden />
                              Chơi
                            </>
                          ) : (
                            <>
                              <Repeat className="w-4 h-4 text-primary" aria-hidden />
                              Ôn
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/70 px-2.5 py-2.5 text-[0.82rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                          onClick={() => handleShare(deck)}
                          title={deck.share_token ? "Xem link chia sẻ" : "Tạo link chia sẻ"}
                        >
                          <Link2 className="w-4 h-4" aria-hidden />
                          Link
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            )}
          </div>
        )}
      </section>

      {/* ── Create Deck Modal ── */}
      <Dialog.Root open={createDeckOpen} onOpenChange={(open) => { setCreateDeckOpen(open); if (!open) { setNewDeckName(""); setNewDeckDesc(""); setMsg(null); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-6 shadow-xl sm:rounded-[24px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] outline-none">
            <div className="flex justify-between items-center mb-5">
              <Dialog.Title className="text-xl font-bold">Tạo deck mới</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted/50 transition-colors outline-none cursor-pointer">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-3">
              <div>
                <label className="sr-only" htmlFor="modal-deck-name">Tên deck</label>
                <Input
                  id="modal-deck-name"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Tên deck (ví dụ: IELTS Writing)"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
                  autoFocus
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="modal-deck-desc">Mô tả</label>
                <Input
                  id="modal-deck-desc"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Mô tả ngắn (tùy chọn)"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
                />
              </div>

              {msg && (
                <p className="text-rose-600 dark:text-rose-400 text-[0.88rem]">{msg}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Dialog.Close asChild>
                  <button className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm cursor-pointer hover:bg-muted/40 transition-colors">
                    Hủy
                  </button>
                </Dialog.Close>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-[2]"
                  onClick={handleCreateDeck}
                  disabled={creating || !newDeckName.trim()}
                >
                  {creating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang tạo</>
                  ) : (
                    <><Plus className="w-4 h-4" aria-hidden /> Tạo deck</>
                  )}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Radix UI Share Modal ── */}
      <Dialog.Root open={!!shareModal} onOpenChange={(open) => !open && setShareModal(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-xl sm:rounded-[24px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] outline-none">
            <div className="flex justify-between items-center mb-1">
              <Dialog.Title className="text-xl font-bold">Chia sẻ deck</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-surface-muted transition-colors outline-none cursor-pointer">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-muted-foreground text-[0.95rem]">
              {shareModal?.share_token
                ? "Bất kỳ ai có link này đều có thể xem bộ thẻ (chỉ đọc)."
                : "Kích hoạt chia sẻ để tạo link công khai."}
            </Dialog.Description>

            {shareModal?.share_token ? (
              <div className="flex flex-col gap-5 mt-2">
                <div className="flex items-center gap-2 border border-border bg-surface-muted rounded-xl p-1 shadow-inner">
                  <input
                    className="flex-1 bg-transparent border-none outline-none px-3 text-foreground text-sm font-mono"
                    readOnly
                    value={shareUrl(shareModal.share_token)}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-semibold text-sm text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-opacity cursor-pointer"
                    onClick={() => copyLink(shareModal.share_token!)}
                  >
                    <Copy className="w-4 h-4" /> {copied ? "Đã chép" : "Chép"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2.5 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm"
                    onClick={() => handleUnshare(shareModal.id)}
                  >
                    Tắt chia sẻ
                  </button>
                  <Dialog.Close asChild>
                    <button className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm cursor-pointer hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-colors">
                      Đóng
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[0.92rem] font-semibold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-opacity"
                  onClick={() => handleShare(shareModal!)}
                >
                  <Globe2 className="w-5 h-5" /> Kích hoạt chia sẻ
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete deck confirm dialog */}
      <Dialog.Root open={!!deleteConfirmDeck} onOpenChange={(open) => { if (!open && !deleting) setDeleteConfirmDeck(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-6 shadow-xl sm:rounded-[24px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] outline-none">
            <div className="flex items-start justify-between gap-4 mb-3">
              <Dialog.Title className="text-lg font-bold">Xóa deck?</Dialog.Title>
              <Dialog.Close asChild>
                <button disabled={deleting} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40" aria-label="Đóng">
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-[0.92rem] text-muted-foreground leading-relaxed mb-6">
              Deck <span className="font-semibold text-foreground">&ldquo;{deleteConfirmDeck?.name}&rdquo;</span> và toàn bộ flashcard bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[0.9rem] font-semibold border border-border bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-40"
                >
                  Hủy
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteDeck}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.9rem] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {deleting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                Xóa deck
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </AppShell>
  );
}
