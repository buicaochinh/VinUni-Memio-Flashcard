"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import AppShell from "../../../components/AppShell";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  HelpCircle,
  Loader2,
  Map,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

type AnswerRecord = {
  questionId: string;
  cardId: number;
  selectedIndex: number;
  correct: boolean;
  usedHint: boolean;
  quality: 0 | 1 | 2 | 3;
};

function flattenQuestions(campaign: GameCampaign): GameQuestion[] {
  return campaign.stages.flatMap((stage) => stage.questions);
}

function qualityForAnswer(correct: boolean, usedHint: boolean): 0 | 1 | 2 | 3 {
  if (correct && !usedHint) return 3;
  if (correct && usedHint) return 2;
  if (!correct && usedHint) return 1;
  return 0;
}

function scoreForAnswer(correct: boolean, usedHint: boolean, combo: number) {
  if (!correct) return 0;
  const base = usedHint ? 70 : 100;
  return base + Math.min(combo, 5) * 12;
}

export default function PlayCampaignPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);
  const router = useRouter();
  const clientReady = useClientReady();

  const [user, setUser] = useState<User | null>(null);
  const [cardsById, setCardsById] = useState<Record<number, Card>>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [campaign, setCampaign] = useState<GameCampaign | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const questions = useMemo(() => campaign ? flattenQuestions(campaign) : [], [campaign]);
  const stage = campaign?.stages[stageIndex] ?? null;
  const question = stage?.questions[questionIndex] ?? null;
  const answeredCount = answers.length;
  const correctCount = answers.filter((a) => a.correct).length;
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const xpEarned = Math.max(0, Math.round(score / 10) + correctCount * 8 + bestCombo * 4);

  const startGame = useCallback(async (currentUser: User) => {
    setIsLoading(true);
    setMsg(null);
    try {
      const [game, deckCards] = await Promise.all([
        startAdventureCampaign(deckId, 12),
        fetchDeckCards(deckId),
      ]);
      setSessionId(game.session_id);
      setCampaign(game.campaign);
      setCardsById(Object.fromEntries(deckCards.map((card) => [card.id, card])));
      setStageIndex(0);
      setQuestionIndex(0);
      setAnswers([]);
      setSelectedIndex(null);
      setUsedHint(false);
      setShowFeedback(false);
      setScore(0);
      setCombo(0);
      setBestCombo(0);
      setIsComplete(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Không khởi tạo được Thử thách AI.");
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (!clientReady) return;
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.replace("/");
      return;
    }
    setUser(storedUser);
    void startGame(storedUser);
  }, [clientReady, router, startGame]);

  const completeGame = useCallback(async (nextAnswers: AnswerRecord[], nextScore: number, nextBestCombo: number) => {
    if (!user || !sessionId || isCompleting) return;
    setIsCompleting(true);
    const nextCorrect = nextAnswers.filter((a) => a.correct).length;
    const nextAccuracy = nextAnswers.length ? Math.round((nextCorrect / nextAnswers.length) * 100) : 0;
    const nextXp = Math.max(0, Math.round(nextScore / 10) + nextCorrect * 8 + nextBestCombo * 4);

    try {
      await completeAdventureCampaign(sessionId, {
        score: nextScore,
        xp_earned: nextXp,
        accuracy: nextAccuracy,
        total_questions: nextAnswers.length,
        correct_answers: nextCorrect,
      });
    } catch {
      setMsg("Đã hoàn thành, nhưng chưa lưu được điểm XP. Bạn có thể thử lại sau.");
    } finally {
      setIsCompleting(false);
      setIsComplete(true);
    }
  }, [isCompleting, sessionId, user]);

  const handleAnswer = async (choiceIndex: number) => {
    if (!question || selectedIndex !== null || !user) return;
    const correct = choiceIndex === question.answer_index;
    const quality = qualityForAnswer(correct, usedHint);
    const nextCombo = correct ? combo + 1 : 0;
    const nextBestCombo = Math.max(bestCombo, nextCombo);
    const gained = scoreForAnswer(correct, usedHint, nextCombo);
    const nextScore = score + gained;
    const record: AnswerRecord = {
      questionId: question.id,
      cardId: question.card_id,
      selectedIndex: choiceIndex,
      correct,
      usedHint,
      quality,
    };
    const nextAnswers = [...answers, record];

    setSelectedIndex(choiceIndex);
    setShowFeedback(true);
    setScore(nextScore);
    setCombo(nextCombo);
    setBestCombo(nextBestCombo);
    setAnswers(nextAnswers);

    const card = cardsById[question.card_id];
    if (card) {
      await updateCardProgress(card, quality).catch(() => {
        setMsg("Một câu trả lời chưa cập nhật được lịch ôn. Kết quả game vẫn được giữ.");
      });
    }

    const isLastQuestionInStage = stage ? questionIndex >= stage.questions.length - 1 : true;
    const isLastStage = campaign ? stageIndex >= campaign.stages.length - 1 : true;
    if (isLastQuestionInStage && isLastStage) {
      await completeGame(nextAnswers, nextScore, nextBestCombo);
    }
  };

  const goNext = () => {
    if (!campaign || !stage) return;
    const isLastQuestionInStage = questionIndex >= stage.questions.length - 1;
    if (isLastQuestionInStage) {
      if (stageIndex < campaign.stages.length - 1) {
        setStageIndex((i) => i + 1);
        setQuestionIndex(0);
      }
    } else {
      setQuestionIndex((i) => i + 1);
    }
    setSelectedIndex(null);
    setUsedHint(false);
    setShowFeedback(false);
  };

  if (!user) return null;

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/workspace")}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-background/70 px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Workspace
          </button>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/75 px-3 py-2 font-semibold">
              <Trophy className="h-4 w-4 text-[hsl(var(--warning))]" aria-hidden />
              {score} điểm
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/75 px-3 py-2 font-semibold">
              <Zap className="h-4 w-4 text-primary" aria-hidden />
              Combo {combo}
            </span>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-background/70 shadow-sm">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(800px_circle_at_18%_0%,hsl(var(--primary)/0.10),transparent_42%),radial-gradient(620px_circle_at_88%_12%,hsl(var(--success)/0.10),transparent_38%)]" />
          <div className="relative px-5 py-5 sm:px-7 sm:py-6">
            {isLoading ? (
              <div className="min-h-[420px] flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">AI đang dựng bản đồ học</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Campaign được tạo một lần từ deck của bạn, sau đó bạn chơi liền mạch.
                  </p>
                </div>
              </div>
            ) : msg && !campaign ? (
              <div className="min-h-[360px] flex flex-col items-center justify-center gap-4 text-center">
                <XCircle className="h-10 w-10 text-[hsl(var(--danger))]" aria-hidden />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Chưa bắt đầu được game</h1>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">{msg}</p>
                </div>
                <Button type="button" variant="primary" onClick={() => startGame(user)}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Thử lại
                </Button>
              </div>
            ) : isComplete && campaign ? (
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-border bg-background/80 p-6">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                    <Flag className="h-4 w-4" aria-hidden />
                    Campaign complete
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{campaign.title}</h1>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{campaign.final_goal}</p>
                  {msg && <p className="mt-4 text-sm text-[hsl(var(--warning))]">{msg}</p>}
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Điểm", score],
                      ["XP", xpEarned],
                      ["Đúng", `${correctCount}/${answers.length}`],
                      ["Combo", bestCombo],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-border bg-muted/25 px-4 py-4">
                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button type="button" variant="primary" onClick={() => startGame(user)}>
                      <Play className="h-4 w-4" aria-hidden />
                      Chơi lại
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => router.push(`/study/${deckId}`)}>
                      Ôn flashcard
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/80 p-5">
                  <h2 className="font-semibold tracking-tight">Báo cáo chặng</h2>
                  <div className="mt-4 space-y-3">
                    {campaign.stages.map((item) => {
                      const stageAnswers = answers.filter((a) => item.questions.some((q) => q.id === a.questionId));
                      const stageCorrect = stageAnswers.filter((a) => a.correct).length;
                      return (
                        <div key={item.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {stageCorrect}/{stageAnswers.length} câu đúng
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : campaign && stage && question ? (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <aside className="rounded-2xl border border-border bg-background/80 p-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Map className="h-5 w-5 text-primary" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Thử thách AI</p>
                      <h1 className="font-bold tracking-tight">{campaign.title}</h1>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{campaign.premise}</p>

                  <div className="mt-5 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {answeredCount}/{questions.length} câu, accuracy {accuracy}%
                  </p>

                  <div className="mt-5 space-y-2">
                    {campaign.stages.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-sm",
                          index === stageIndex
                            ? "border-primary/50 bg-primary/10 text-foreground"
                            : index < stageIndex
                              ? "border-border bg-muted/25 text-muted-foreground"
                              : "border-border bg-background/60 text-muted-foreground"
                        )}
                      >
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs">{item.questions.length} thử thách</p>
                      </div>
                    ))}
                  </div>
                </aside>

                <main className="rounded-2xl border border-border bg-background/85 p-5 sm:p-7">
                  <p className="text-sm font-semibold text-primary">{stage.title}</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">{question.prompt}</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{stage.mission}</p>

                  <div className="mt-6 grid gap-3">
                    {question.choices.map((choice, index) => {
                      const isSelected = selectedIndex === index;
                      const isCorrect = index === question.answer_index;
                      const revealCorrect = showFeedback && isCorrect;
                      const revealWrong = showFeedback && isSelected && !isCorrect;
                      return (
                        <button
                          key={`${question.id}-${choice}-${index}`}
                          type="button"
                          onClick={() => handleAnswer(index)}
                          disabled={selectedIndex !== null}
                          className={cn(
                            "flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition-[background-color,border-color,transform]",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
                            selectedIndex === null && "hover:bg-muted/35 active:translate-y-px",
                            revealCorrect && "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.10)]",
                            revealWrong && "border-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.10)]",
                            !revealCorrect && !revealWrong && "border-border bg-background/70"
                          )}
                        >
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-sm tabular-nums">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed">{choice}</span>
                          {revealCorrect && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-[hsl(var(--success))]" aria-hidden />}
                          {revealWrong && <XCircle className="ml-auto h-5 w-5 shrink-0 text-[hsl(var(--danger))]" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-muted/25 p-4">
                    {showFeedback ? (
                      <div className="space-y-2">
                        <p className="font-semibold">
                          {selectedIndex === question.answer_index ? "Chính xác" : "Chưa đúng"}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{question.explanation}</p>
                      </div>
                    ) : usedHint ? (
                      <div className="space-y-2">
                        <p className="font-semibold">Gợi ý</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{question.hint}</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUsedHint(true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden />
                        Dùng gợi ý
                      </button>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={goNext}
                      disabled={!showFeedback || isComplete || isCompleting}
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Đang lưu
                        </>
                      ) : (
                        "Tiếp tục"
                      )}
                    </Button>
                  </div>
                </main>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
