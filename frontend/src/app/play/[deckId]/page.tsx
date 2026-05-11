"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  completeAdventureCampaign,
  fetchDeckCards,
  GameCampaign,
  GameQuestion,
  getStoredUser,
  startAdventureCampaign,
  updateCardProgress,
  useClientReady,
  User,
} from "../../../lib/app-client";
import { cn } from "../../../lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Heart,
  Play,
  RotateCcw,
  Swords,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | "loading"
  | "stage-intro"
  | "playing"
  | "feedback"
  | "game-over"
  | "complete";

type AnswerRecord = {
  questionId: string;
  cardId: number;
  selectedIndex: number;
  correct: boolean;
  usedHint: boolean;
  quality: 0 | 1 | 2 | 3;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_LIVES = 3;
const FEEDBACK_MS = 1500;
const CHOICE_LABELS = ["A", "B", "C", "D"];
const LOAD_STEPS = [
  "Đang đọc deck của bạn...",
  "Dựng câu chuyện...",
  "Tạo các thử thách...",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenQuestions(campaign: GameCampaign): GameQuestion[] {
  return campaign.stages.flatMap((s) => s.questions);
}

function quality(correct: boolean, usedHint: boolean): 0 | 1 | 2 | 3 {
  if (correct && !usedHint) return 3;
  if (correct && usedHint) return 2;
  if (!correct && usedHint) return 1;
  return 0;
}

function score(correct: boolean, usedHint: boolean, combo: number): number {
  if (!correct) return 0;
  return (usedHint ? 70 : 100) + Math.min(combo, 5) * 12;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlayCampaignPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);
  const router = useRouter();
  const clientReady = useClientReady();

  // Game data
  const [user, setUser] = useState<User | null>(null);
  const [cardsById, setCardsById] = useState<Record<number, Card>>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [campaign, setCampaign] = useState<GameCampaign | null>(null);

  // Navigation
  const [phase, setPhase] = useState<Phase>("loading");
  const [stageIndex, setStageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  // Answer state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);

  // Score / lives
  const [totalScore, setTotalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [scoreGain, setScoreGain] = useState<number | null>(null);

  // Misc
  const [loadStep, setLoadStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Refs to avoid stale closures in timers
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<(() => void) | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const questions = useMemo(
    () => (campaign ? flattenQuestions(campaign) : []),
    [campaign]
  );
  const stage = campaign?.stages[stageIndex] ?? null;
  const question = stage?.questions[questionIndex] ?? null;
  const answeredCount = answers.length;
  const correctCount = answers.filter((a) => a.correct).length;
  const progressPct = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const xpEarned = Math.max(
    0,
    Math.round(totalScore / 10) + correctCount * 8 + bestCombo * 4
  );
  const lastWasCorrect = answers[answers.length - 1]?.correct ?? false;

  // ─── Loading animation ────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "loading") return;
    const timers = LOAD_STEPS.map((_, i) =>
      setTimeout(() => setLoadStep(i), i * 1600)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // ─── Start game ───────────────────────────────────────────────────────────

  const startGame = useCallback(
    async (currentUser: User) => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      advanceRef.current = null;
      setPhase("loading");
      setLoadStep(0);
      setErrorMsg(null);
      try {
        const [game, deckCards] = await Promise.all([
          startAdventureCampaign(deckId, 12),
          fetchDeckCards(deckId),
        ]);
        setSessionId(game.session_id);
        setCampaign(game.campaign);
        setCardsById(
          Object.fromEntries(deckCards.map((c) => [c.id, c]))
        );
        setStageIndex(0);
        setQuestionIndex(0);
        setAnswers([]);
        setSelectedIndex(null);
        setUsedHint(false);
        setTotalScore(0);
        setCombo(0);
        setBestCombo(0);
        setLives(MAX_LIVES);
        setPhase("stage-intro");
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Không khởi tạo được game."
        );
      }
    },
    [deckId]
  );

  useEffect(() => {
    if (!clientReady) return;
    const u = getStoredUser();
    if (!u) { router.replace("/"); return; }
    setUser(u);
    void startGame(u);
  }, [clientReady, router, startGame]);

  // ─── Stage intro auto-advance ─────────────────────────────────────────────

  const startStage = useCallback(() => {
    setPhase("playing");
  }, []);

  useEffect(() => {
    if (phase !== "stage-intro") return;
    const t = setTimeout(startStage, 3000);
    return () => clearTimeout(t);
  }, [phase, stageIndex, startStage]);

  // ─── Complete game ────────────────────────────────────────────────────────

  const completeGame = useCallback(
    async (
      finalAnswers: AnswerRecord[],
      finalScore: number,
      finalBestCombo: number
    ) => {
      if (!sessionId || isCompleting) return;
      setIsCompleting(true);
      const nc = finalAnswers.filter((a) => a.correct).length;
      const acc = finalAnswers.length
        ? Math.round((nc / finalAnswers.length) * 100)
        : 0;
      const xp = Math.max(
        0,
        Math.round(finalScore / 10) + nc * 8 + finalBestCombo * 4
      );
      try {
        await completeAdventureCampaign(sessionId, {
          score: finalScore,
          xp_earned: xp,
          accuracy: acc,
          total_questions: finalAnswers.length,
          correct_answers: nc,
        });
      } catch {
        // score recorded client-side regardless
      } finally {
        setIsCompleting(false);
        setPhase("complete");
      }
    },
    [sessionId, isCompleting]
  );

  // ─── Advance to next question ──────────────────────────────────────────────

  const goNext = useCallback(
    (
      nextAnswers: AnswerRecord[],
      nextScore: number,
      nextBestCombo: number,
      nextLives: number
    ) => {
      if (!campaign || !stage) return;

      if (nextLives <= 0) {
        setPhase("game-over");
        return;
      }

      const isLastQInStage = questionIndex >= stage.questions.length - 1;
      const isLastStage = stageIndex >= campaign.stages.length - 1;

      if (isLastQInStage && isLastStage) {
        void completeGame(nextAnswers, nextScore, nextBestCombo);
        return;
      }

      setSelectedIndex(null);
      setUsedHint(false);

      if (isLastQInStage) {
        setStageIndex((i) => i + 1);
        setQuestionIndex(0);
        setPhase("stage-intro");
      } else {
        setQuestionIndex((i) => i + 1);
        setPhase("playing");
      }
    },
    [campaign, stage, questionIndex, stageIndex, completeGame]
  );

  // ─── Handle answer ────────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    async (choiceIndex: number) => {
      if (!question || selectedIndex !== null || phase !== "playing") return;

      const correct = choiceIndex === question.answer_index;
      const q = quality(correct, usedHint);
      const nextCombo = correct ? combo + 1 : 0;
      const nextBestCombo = Math.max(bestCombo, nextCombo);
      const gained = score(correct, usedHint, nextCombo);
      const nextScore = totalScore + gained;
      const nextLives = correct ? lives : lives - 1;
      const record: AnswerRecord = {
        questionId: question.id,
        cardId: question.card_id,
        selectedIndex: choiceIndex,
        correct,
        usedHint,
        quality: q,
      };
      const nextAnswers = [...answers, record];

      setSelectedIndex(choiceIndex);
      setTotalScore(nextScore);
      setCombo(nextCombo);
      setBestCombo(nextBestCombo);
      setLives(nextLives);
      setAnswers(nextAnswers);
      setScoreGain(gained > 0 ? gained : null);
      setPhase("feedback");

      const card = cardsById[question.card_id];
      if (card) updateCardProgress(card, q).catch(() => {});

      // Capture advance in a ref so timer + skip both work without stale closures
      advanceRef.current = () => {
        setScoreGain(null);
        goNext(nextAnswers, nextScore, nextBestCombo, nextLives);
      };
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        advanceRef.current?.();
        advanceRef.current = null;
      }, FEEDBACK_MS);
    },
    [
      question,
      selectedIndex,
      phase,
      usedHint,
      combo,
      bestCombo,
      totalScore,
      lives,
      answers,
      cardsById,
      goNext,
    ]
  );

  // ─── Skip feedback on click ───────────────────────────────────────────────

  const skipFeedback = useCallback(() => {
    if (phase !== "feedback") return;
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    advanceRef.current?.();
    advanceRef.current = null;
  }, [phase]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "feedback") { skipFeedback(); return; }
      if (phase === "stage-intro") { startStage(); return; }
      if (phase !== "playing") return;
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      if (e.key in map) void handleAnswer(map[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleAnswer, skipFeedback, startStage]);

  if (!user) return null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">

      {/* ── HUD ── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm z-10">
        <button
          type="button"
          onClick={() => router.push("/workspace")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Thoát
        </button>

        {campaign && (
          <p className="hidden sm:block text-xs font-semibold text-muted-foreground truncate max-w-xs">
            {campaign.title}
          </p>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  i < lives
                    ? "text-red-500 fill-red-500"
                    : "text-muted-foreground/25 fill-transparent"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {totalScore}
          </div>

          <div
            className={cn(
              "flex items-center gap-1 text-sm font-bold transition-all duration-200",
              combo >= 2 ? "text-primary scale-110" : "text-muted-foreground/40 scale-100"
            )}
          >
            <Zap className="h-4 w-4" />
            {combo}×
          </div>
        </div>
      </header>

      {/* ── Progress bar ── */}
      {campaign && (phase === "playing" || phase === "feedback") && (
        <div className="h-1 bg-muted shrink-0">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">

        {/* LOADING */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-full gap-8 px-5 py-16 text-center">
            {errorMsg ? (
              <>
                <XCircle className="h-12 w-12 text-[hsl(var(--danger))]" />
                <div>
                  <p className="text-xl font-bold">Chưa khởi tạo được</p>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm">{errorMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={() => user && void startGame(user)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Thử lại
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Swords className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="space-y-3">
                  {LOAD_STEPS.map((step, i) => (
                    <p
                      key={step}
                      className={cn(
                        "text-sm font-semibold transition-all duration-500",
                        i < loadStep && "text-muted-foreground line-through opacity-50",
                        i === loadStep && "text-foreground",
                        i > loadStep && "text-muted-foreground/30"
                      )}
                    >
                      {i < loadStep ? "✓ " : i === loadStep ? "· " : "  "}{step}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* STAGE INTRO */}
        {phase === "stage-intro" && stage && campaign && (
          <div
            className="flex flex-col items-center justify-center min-h-full gap-6 px-5 py-16 text-center cursor-pointer select-none"
            onClick={startStage}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Chặng {stageIndex + 1} / {campaign.stages.length}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-lg">
              {stage.title}
            </h2>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              {stage.mission}
            </p>
            <p className="text-xs text-muted-foreground">
              {stage.questions.length} câu · Tự động bắt đầu sau 3 giây
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); startStage(); }}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
            >
              <Play className="h-4 w-4" /> Bắt đầu ngay
            </button>
          </div>
        )}

        {/* PLAYING / FEEDBACK */}
        {(phase === "playing" || phase === "feedback") && question && stage && (
          <div
            className={cn(
              "flex flex-col items-center min-h-full px-5 py-10",
              phase === "feedback" && "cursor-pointer select-none"
            )}
            onClick={phase === "feedback" ? skipFeedback : undefined}
          >
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-7">

              {/* Stage label + question */}
              <div className="text-center space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {stage.title}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
                  {question.prompt}
                </h2>
              </div>

              {/* Choices */}
              <div className="grid gap-3">
                {question.choices.map((choice, index) => {
                  const isSelected = selectedIndex === index;
                  const isCorrect = index === question.answer_index;
                  const revealCorrect = phase === "feedback" && isCorrect;
                  const revealWrong =
                    phase === "feedback" && isSelected && !isCorrect;

                  return (
                    <button
                      key={`${question.id}-${index}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAnswer(index);
                      }}
                      disabled={phase !== "playing"}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left font-semibold transition-all duration-150",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
                        phase === "playing" &&
                          "hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]",
                        revealCorrect &&
                          "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.10)] scale-[1.01]",
                        revealWrong &&
                          "border-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.08)] animate-shake",
                        !revealCorrect &&
                          !revealWrong &&
                          "border-border bg-background/80"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm transition-colors",
                          revealCorrect
                            ? "bg-[hsl(var(--success))] text-white"
                            : revealWrong
                            ? "bg-[hsl(var(--danger))] text-white"
                            : isSelected
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {CHOICE_LABELS[index]}
                      </span>
                      <span className="leading-relaxed flex-1">{choice}</span>
                      {revealCorrect && (
                        <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-[hsl(var(--success))]" />
                      )}
                      {revealWrong && (
                        <XCircle className="ml-auto h-5 w-5 shrink-0 text-[hsl(var(--danger))]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback / hint */}
              {phase === "feedback" ? (
                <div
                  className={cn(
                    "rounded-2xl border-2 p-5 text-sm leading-relaxed",
                    lastWasCorrect
                      ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.06)]"
                      : "border-[hsl(var(--danger)/0.35)] bg-[hsl(var(--danger)/0.06)]"
                  )}
                >
                  <p className="font-bold mb-1.5">
                    {lastWasCorrect
                      ? combo > 1
                        ? `${combo}× Combo! Chính xác.`
                        : "Chính xác!"
                      : "Chưa đúng."}
                  </p>
                  <p className="text-muted-foreground">{question.explanation}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Nhấn phím bất kỳ hoặc click để tiếp tục
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => !usedHint && setUsedHint(true)}
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      usedHint
                        ? "text-muted-foreground cursor-default"
                        : "text-primary hover:underline underline-offset-4"
                    )}
                  >
                    {usedHint
                      ? `Gợi ý: ${question.hint}`
                      : "Dùng gợi ý (điểm thấp hơn)"}
                  </button>
                  <p className="text-xs text-muted-foreground">Phím 1–4</p>
                </div>
              )}
            </div>

            {/* Score gain popup */}
            {scoreGain !== null && scoreGain > 0 && (
              <div className="fixed top-14 right-6 animate-score-pop text-xl font-extrabold text-[hsl(var(--success))] pointer-events-none select-none z-50">
                +{scoreGain}
              </div>
            )}
          </div>
        )}

        {/* GAME OVER */}
        {phase === "game-over" && (
          <div className="flex flex-col items-center justify-center min-h-full gap-8 px-5 py-16 text-center">
            <div className="text-6xl select-none">💔</div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Hết tim rồi!</h2>
              <p className="mt-2 text-muted-foreground">
                Bạn đã trả lời đúng {correctCount}/{answeredCount} câu trước khi dừng.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {(
                [
                  ["Điểm", totalScore],
                  ["Combo tốt nhất", bestCombo],
                ] as const
              ).map(([l, v]) => (
                <div
                  key={l}
                  className="rounded-2xl border border-border bg-muted/25 px-4 py-4"
                >
                  <p className="text-xs font-semibold text-muted-foreground">{l}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => user && void startGame(user)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Chơi lại
              </button>
              <button
                type="button"
                onClick={() => router.push("/workspace")}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 font-bold hover:bg-muted/40 transition-colors"
              >
                Workspace
              </button>
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {phase === "complete" && campaign && (
          <div className="flex flex-col items-center justify-center min-h-full gap-8 px-5 py-16 text-center">
            <div className="text-6xl select-none">🏆</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Hoàn thành
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                {campaign.title}
              </h2>
              <p className="mt-3 text-muted-foreground max-w-md leading-relaxed">
                {campaign.final_goal}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
              {(
                [
                  ["Điểm", totalScore],
                  ["XP", xpEarned],
                  ["Đúng", `${correctCount}/${answers.length}`],
                  ["Combo", bestCombo],
                ] as const
              ).map(([l, v]) => (
                <div
                  key={l}
                  className="rounded-2xl border border-border bg-muted/25 px-4 py-4"
                >
                  <p className="text-xs font-semibold text-muted-foreground">{l}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            {/* Stage breakdown */}
            <div className="w-full max-w-lg space-y-2 text-left">
              {campaign.stages.map((s) => {
                const sa = answers.filter((a) =>
                  s.questions.some((q) => q.id === a.questionId)
                );
                const sc = sa.filter((a) => a.correct).length;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold text-sm">{s.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {sc}/{sa.length}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => user && void startGame(user)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" /> Chơi lại
              </button>
              <button
                type="button"
                onClick={() => router.push(`/study/${deckId}`)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 font-bold hover:bg-muted/40 transition-colors"
              >
                Ôn flashcard
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
