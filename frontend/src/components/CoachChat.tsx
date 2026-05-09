"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, ExternalLink, FileText, Loader2, Send, Sparkles, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import {
  CoachAction,
  CoachCitation,
  CoachMessage,
  CoachQuizQuestion,
  fetchCoachMessages,
  logCoachTrustEvent,
  saveCoachQuizSummary,
  sendCoachMessage,
  startCoachQuiz,
  updateCardProgress,
  User,
} from "../lib/app-client";
import { cn } from "../lib/utils";

type CoachChatProps = {
  user: User;
  compact?: boolean;
  initialPrompt?: string;
  initialContextDeckId?: number | null;
  initialQuiz?: boolean;
  initialQuizDeckId?: number | null;
  initialQuizCardIds?: number[] | null;
  initialThreadId?: number | null;
  onThreadChange?: (threadId: number) => void;
};

const QUICK_ACTIONS = [
  { label: "Hôm nay học gì?", message: "Hôm nay tôi nên học gì trước? Hãy dựa trên tiến độ và thẻ yếu của tôi." },
  { label: "Quiz tôi", message: "Quiz tôi nhanh bằng các thẻ yếu hoặc thẻ cần ôn." },
  { label: "Giải thích thẻ khó", message: "Chọn các thẻ khó nhất của tôi và giải thích ngắn gọn cách ghi nhớ." },
  { label: "Tạo thử thách", message: "Gợi ý một Thử thách AI phù hợp với deck tôi nên ôn nhất." },
];

function ActionButton({ action, onQuiz }: { action: CoachAction; onQuiz: () => void }) {
  const router = useRouter();

  const handleClick = () => {
    if (action.requires_confirmation && !confirm(`Xác nhận: ${action.label}?`)) return;
    if (action.type === "quiz_in_chat") {
      onQuiz();
      return;
    }
    if (action.href) router.push(action.href);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
    >
      {action.label}
      {action.href && <ExternalLink className="h-3.5 w-3.5 text-primary" aria-hidden />}
    </button>
  );
}

function renderInlineMarkdown(text: string) {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={`${token}-${match.index}`} className="rounded-md bg-muted px-1.5 py-0.5 text-[0.9em] font-semibold">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${token}-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MarkdownMessage({ content, inverted = false }: { content: string; inverted?: boolean }) {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className={cn("space-y-2", inverted ? "text-[hsl(var(--primary-foreground))]" : "text-foreground")}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const heading = block.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          const levelClass = heading[1].length === 1 ? "text-base" : "text-[0.95rem]";
          return (
            <h3 key={blockIndex} className={cn("font-bold tracking-tight", levelClass)}>
              {renderInlineMarkdown(heading[2])}
            </h3>
          );
        }

        const isList = lines.every((line) => /^([-*]\s+|\d+\.\s+)/.test(line));
        if (isList) {
          const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
          const items = lines.map((line) => line.replace(/^([-*]\s+|\d+\.\s+)/, ""));
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              key={blockIndex}
              className={cn(
                "space-y-1 pl-5",
                ordered ? "list-decimal" : "list-disc",
                inverted ? "marker:text-[hsl(var(--primary-foreground))]/75" : "marker:text-muted-foreground"
              )}
            >
              {items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={blockIndex} className={cn("leading-relaxed", inverted ? "text-[hsl(var(--primary-foreground))]" : "text-foreground")}>
            {renderInlineMarkdown(lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}

function citationTone(sourceType: string) {
  if (sourceType === "web") return "border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100";
  if (sourceType === "source_context") return "border-emerald-300/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100";
  return "border-primary/25 bg-primary/5 text-foreground";
}

function citationLabel(citation: CoachCitation) {
  if (citation.source_label) return citation.source_label;
  if (citation.source_type === "web") return "External web";
  if (citation.source_type === "source_context") return "Source context";
  return "Internal card";
}

function CitationList({
  citations,
  userId,
  threadId,
  messageId,
}: {
  citations: CoachCitation[];
  userId: number;
  threadId: number | null;
  messageId?: number;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
        Nguồn tham chiếu
      </div>
      {citations.map((citation) => {
        const body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold", citationTone(citation.source_type))}>
                {citationLabel(citation)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{citation.label}</span>
              {citation.url && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
            </div>
            <p className="mt-1.5 line-clamp-3 text-muted-foreground">{citation.text}</p>
          </>
        );
        const logClick = () => {
          void logCoachTrustEvent({
            thread_id: threadId,
            message_id: messageId,
            event_type: "citation_click",
            citation_id: citation.id,
            source_type: citation.source_type,
          });
        };

        if (citation.url) {
          return (
            <a
              key={citation.id}
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              onClick={logClick}
              className="block rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
            >
              {body}
            </a>
          );
        }

        return (
          <button
            key={citation.id}
            type="button"
            onClick={logClick}
            className="block w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

function AnswerFeedback({
  userId,
  threadId,
  message,
}: {
  userId: number;
  threadId: number | null;
  message: CoachMessage;
}) {
  const [selected, setSelected] = useState<"helpful" | "not_helpful" | null>(null);
  const handleFeedback = (value: "helpful" | "not_helpful") => {
    setSelected(value);
    void logCoachTrustEvent({
      thread_id: threadId,
      message_id: message.id,
      event_type: "answer_feedback",
      value,
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Câu trả lời này hữu ích không?</span>
      <button
        type="button"
        onClick={() => handleFeedback("helpful")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
          selected === "helpful" ? "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.10)] text-[hsl(var(--success))]" : "border-border bg-background hover:bg-muted/40"
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
        Có
      </button>
      <button
        type="button"
        onClick={() => handleFeedback("not_helpful")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
          selected === "not_helpful" ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.10)] text-[hsl(var(--danger))]" : "border-border bg-background hover:bg-muted/40"
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
        Chưa
      </button>
    </div>
  );
}

type InlineQuizState = {
  questions: CoachQuizQuestion[];
  index: number;
  selected: number | null;
  correct: number;
  answered: Array<{
    question: CoachQuizQuestion;
    selected: number;
    correct: boolean;
  }>;
};

type CoachDraft = {
  threadId: number | null;
  messages: CoachMessage[];
  quiz: InlineQuizState | null;
  updatedAt: number;
};

const COACH_DRAFT_TTL_MS = 6 * 60 * 60 * 1000;

function coachDraftKey(userId: number) {
  return `memio_coach_draft_${userId}`;
}

function readCoachDraft(userId: number): CoachDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(coachDraftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as CoachDraft;
    if (!draft.updatedAt || Date.now() - draft.updatedAt > COACH_DRAFT_TTL_MS) {
      window.localStorage.removeItem(coachDraftKey(userId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function writeCoachDraft(userId: number, draft: Omit<CoachDraft, "updatedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(coachDraftKey(userId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    /* ignore local draft failures */
  }
}

function clearCoachDraft(userId: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(coachDraftKey(userId));
  } catch {
    /* ignore */
  }
}

function quizXp(correct: number, total: number) {
  return correct * 12 + Math.max(0, total - correct) * 3;
}

function buildQuizSummary(answered: InlineQuizState["answered"], total: number) {
  const correct = answered.filter((item) => item.correct).length;
  const wrong = answered.filter((item) => !item.correct);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const xp = quizXp(correct, total);
  const weakLines = wrong.slice(0, 3).map((item, index) => `${index + 1}. ${item.question.prompt}`);
  const weakText = weakLines.length > 0
    ? `\n\nCác câu nên xem lại:\n${weakLines.join("\n")}`
    : "\n\nBạn không sai câu nào trong lượt này.";

  return {
    correct,
    wrong,
    accuracy,
    xp,
    text: `Quiz xong: bạn đúng ${correct}/${total} câu (${accuracy}%). Bạn nhận ${xp} XP.${weakText}\n\nBước tiếp theo: quiz tiếp nếu muốn kiểm tra thêm, hoặc ôn flashcards để củng cố lịch nhớ.`,
  };
}

export default function CoachChat({
  user,
  compact = false,
  initialPrompt,
  initialContextDeckId = null,
  initialQuiz = false,
  initialQuizDeckId = null,
  initialQuizCardIds = null,
  initialThreadId = null,
  onThreadChange,
}: CoachChatProps) {
  const [threadId, setThreadId] = useState<number | null>(initialThreadId);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quiz, setQuiz] = useState<InlineQuizState | null>(null);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQuizStartedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    const draft = readCoachDraft(user.id);
    if (draft && (!initialThreadId || draft.threadId === initialThreadId || draft.quiz)) {
      setThreadId(draft.threadId ?? initialThreadId);
      setMessages(draft.messages ?? []);
      setQuiz(draft.quiz ?? null);
      if (draft.threadId) onThreadChange?.(draft.threadId);
    }
    setDraftReady(true);
  }, [initialThreadId, onThreadChange, user.id]);

  useEffect(() => {
    if (!draftReady) return;
    if (messages.length === 0 && !quiz && !threadId) {
      clearCoachDraft(user.id);
      return;
    }
    writeCoachDraft(user.id, { threadId, messages, quiz });
  }, [draftReady, messages, quiz, threadId, user.id]);

  useEffect(() => {
    if (!initialThreadId) return;
    const draft = readCoachDraft(user.id);
    if (draft?.quiz && (!draft.threadId || draft.threadId === initialThreadId)) return;
    const threadToLoad = initialThreadId;
    setThreadId(threadToLoad);
    onThreadChange?.(threadToLoad);
    let cancelled = false;

    async function hydrateThread() {
      setError(null);
      try {
        const storedMessages = await fetchCoachMessages(threadToLoad);
        if (!cancelled) setMessages(storedMessages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được hội thoại Coach.");
        }
      }
    }

    void hydrateThread();
    return () => {
      cancelled = true;
    };
  }, [initialThreadId, onThreadChange, user.id]);

  useEffect(() => {
    if (!draftReady || !initialPrompt || messages.length > 0) return;
    void handleSend(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, initialPrompt, initialContextDeckId]);

  useEffect(() => {
    if (!draftReady || !initialQuiz || quiz || isStartingQuiz || initialQuizStartedRef.current) return;
    initialQuizStartedRef.current = true;
    void startInlineQuiz(initialQuizDeckId, initialQuizCardIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, initialQuiz, quiz, isStartingQuiz, initialQuizDeckId, initialQuizCardIds]);

  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isSending) return;
    setInput("");
    setError(null);
    const userMessage: CoachMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const reply = await sendCoachMessage({
        message: text,
        thread_id: threadId,
        context_deck_id: initialContextDeckId,
      });
      setThreadId(reply.thread_id);
      onThreadChange?.(reply.thread_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply.answer,
          citations: reply.citations,
          actions: reply.actions,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Memio Coach chưa phản hồi được.");
    } finally {
      setIsSending(false);
    }
  };

  const startInlineQuiz = async (deckId?: number | null, cardIds?: number[] | null) => {
    if (isStartingQuiz) return;
    setIsStartingQuiz(true);
    setError(null);
    try {
      const questions = await startCoachQuiz({
        deck_id: deckId ?? undefined,
        card_ids: cardIds ?? undefined,
        count: 5,
      });
      setQuiz({ questions, index: 0, selected: null, correct: 0, answered: [] });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Mình đã chuẩn bị ${questions.length} câu quiz ngay trong chat. Trả lời từng câu, mình sẽ cập nhật lịch ôn cho bạn.`,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được quiz trong chat.");
    } finally {
      setIsStartingQuiz(false);
    }
  };

  const answerQuiz = async (choiceIndex: number) => {
    if (!quiz || quiz.selected !== null) return;
    const question = quiz.questions[quiz.index];
    const isCorrect = choiceIndex === question.answer_index;
    const quality: 0 | 1 | 2 | 3 = isCorrect ? 3 : 0;
    setQuiz({
      ...quiz,
      selected: choiceIndex,
      correct: quiz.correct + (isCorrect ? 1 : 0),
      answered: [...quiz.answered, { question, selected: choiceIndex, correct: isCorrect }],
    });
    await updateCardProgress({
      id: question.card_id,
      front: question.prompt,
      back: question.explanation,
      difficulty: question.difficulty as "easy" | "medium" | "hard",
      ease_factor: question.ease_factor ?? 2.5,
      repetition: question.repetition ?? 0,
      interval: question.interval ?? 0,
    }, quality).catch(() => {
      setError("Câu trả lời đã ghi trong chat, nhưng chưa cập nhật được lịch ôn.");
    });
  };

  const nextQuizQuestion = async () => {
    if (!quiz) return;
    if (quiz.index >= quiz.questions.length - 1) {
      const total = quiz.questions.length;
      const summary = buildQuizSummary(quiz.answered, total);
      const primaryDeckId = quiz.questions[0]?.deck_id;
      const actions: CoachAction[] = [
        { type: "quiz_in_chat", label: "Quiz tiếp", payload: { deck_id: primaryDeckId }, requires_confirmation: false },
        { type: "start_study", label: "Ôn flashcards", href: primaryDeckId ? `/study/${primaryDeckId}` : "/workspace", payload: { deck_id: primaryDeckId }, requires_confirmation: false },
      ];
      const localMessage: CoachMessage = {
        role: "assistant",
        content: summary.text,
        actions,
      };
      setMessages((prev) => [...prev, localMessage]);
      saveCoachQuizSummary({
        summary: summary.text,
        thread_id: threadId,
        context_deck_id: primaryDeckId,
        actions,
      }).then((saved) => {
        setThreadId(saved.thread_id);
        onThreadChange?.(saved.thread_id);
      }).catch(() => {
        setError("Quiz đã hoàn tất, nhưng chưa lưu được tóm tắt vào lịch sử Coach.");
      });
      setQuiz(null);
      return;
    }
    setQuiz({ ...quiz, index: quiz.index + 1, selected: null });
  };

  return (
    <section className={cn("flex h-full min-h-0 flex-col", compact ? "max-h-[620px]" : "")}>
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-border/70">
            <Bot className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold tracking-tight">Memio Coach</h2>
            <p className="text-sm text-muted-foreground">Hỏi, học, quiz và mở bước tiếp theo.</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-4">
              <p className="font-semibold">Mình có thể giúp bạn học chủ động hơn.</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Mình đọc deck, thẻ yếu, lịch ôn và source context để đề xuất hành động học phù hợp.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_ACTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => item.label === "Quiz tôi" ? startInlineQuiz() : handleSend(item.message)}
                  className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                >
                  <Sparkles className="mb-2 h-4 w-4 text-primary" aria-hidden />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-primary text-[hsl(var(--primary-foreground))]"
                    : "mr-auto border border-border bg-background/85 text-foreground"
                )}
              >
                <MarkdownMessage content={message.content} inverted={message.role === "user"} />
                {message.citations && message.citations.length > 0 && (
                  <CitationList
                    citations={message.citations}
                    userId={user.id}
                    threadId={threadId}
                    messageId={message.id}
                  />
                )}
                {message.role === "assistant" && (
                  <AnswerFeedback userId={user.id} threadId={threadId} message={message} />
                )}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action, actionIndex) => {
                      const deckId = typeof action.payload?.deck_id === "number" ? action.payload.deck_id : null;
                      const cardIds = Array.isArray(action.payload?.card_ids)
                        ? action.payload.card_ids.filter((id): id is number => typeof id === "number")
                        : null;
                      return (
                        <ActionButton
                          key={`${action.type}-${actionIndex}`}
                          action={action}
                          onQuiz={() => startInlineQuiz(deckId, cardIds)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {quiz && (
              <div className="mr-auto max-w-[94%] rounded-2xl border border-border bg-background/90 px-4 py-4 text-sm">
                {(() => {
                  const question = quiz.questions[quiz.index];
                  const answered = quiz.selected !== null;
                  const isCorrect = quiz.selected === question.answer_index;
                  const projectedCorrect = quiz.correct;
                  const projectedAccuracy = Math.round((projectedCorrect / quiz.questions.length) * 100);
                  return (
                    <div className="space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                          <span>Quiz {quiz.index + 1}/{quiz.questions.length}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{question.deck_name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{projectedCorrect}/{quiz.questions.length} đúng</span>
                        </div>
                        <h3 className="mt-2 font-semibold leading-relaxed">{question.prompt}</h3>
                      </div>
                      <div className="grid gap-2">
                        {question.choices.map((choice, index) => {
                          const revealCorrect = answered && index === question.answer_index;
                          const revealWrong = answered && quiz.selected === index && !revealCorrect;
                          return (
                            <button
                              key={`${question.id}-${index}`}
                              type="button"
                              disabled={answered}
                              onClick={() => answerQuiz(index)}
                              className={cn(
                                "rounded-xl border px-3 py-2.5 text-left font-medium transition-colors",
                                !answered && "border-border bg-background hover:bg-muted/35",
                                revealCorrect && "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.10)]",
                                revealWrong && "border-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.10)]",
                              )}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className="rounded-xl bg-muted/30 px-3 py-3">
                          <p className="flex items-center gap-2 font-semibold">
                            {isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" aria-hidden />
                            ) : (
                              <Trophy className="h-4 w-4 text-[hsl(var(--warning))]" aria-hidden />
                            )}
                            {isCorrect ? "Đúng rồi" : "Chưa đúng"}
                          </p>
                          <p className="mt-1 text-muted-foreground">{question.explanation}</p>
                          <p className="mt-2 text-xs font-semibold text-muted-foreground">
                            Tạm tính: {projectedAccuracy}% · {quizXp(projectedCorrect, quiz.questions.length)} XP
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void nextQuizQuestion()}
                          disabled={!answered}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {quiz.index >= quiz.questions.length - 1 ? "Kết thúc" : "Câu tiếp"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {isSending && (
              <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-border bg-background/85 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                Memio Coach đang nghĩ...
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-2 text-sm text-[hsl(var(--danger))] sm:px-5">{error}</p>}

      <form
        className="border-t border-border p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background/80 p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi Memio Coach..."
            rows={compact ? 1 : 2}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending || isStartingQuiz}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}
