"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import {
  CoachAction,
  CoachMessage,
  CoachQuizQuestion,
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

type InlineQuizState = {
  questions: CoachQuizQuestion[];
  index: number;
  selected: number | null;
  correct: number;
};

export default function CoachChat({ user, compact = false, initialPrompt }: CoachChatProps) {
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quiz, setQuiz] = useState<InlineQuizState | null>(null);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (!initialPrompt || messages.length > 0) return;
    void handleSend(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

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
        user_id: user.id,
        message: text,
        thread_id: threadId,
      });
      setThreadId(reply.thread_id);
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

  const startInlineQuiz = async () => {
    if (isStartingQuiz) return;
    setIsStartingQuiz(true);
    setError(null);
    try {
      const questions = await startCoachQuiz({ user_id: user.id, count: 5 });
      setQuiz({ questions, index: 0, selected: null, correct: 0 });
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
    setQuiz({ ...quiz, selected: choiceIndex, correct: quiz.correct + (isCorrect ? 1 : 0) });
    await updateCardProgress(user.id, {
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

  const nextQuizQuestion = () => {
    if (!quiz) return;
    if (quiz.index >= quiz.questions.length - 1) {
      const total = quiz.questions.length;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Quiz xong: bạn đúng ${quiz.correct}/${total} câu. Muốn mình giải thích các câu sai hoặc tạo quiz tiếp không?`,
          actions: [
            { type: "quiz_in_chat", label: "Quiz tiếp", payload: {}, requires_confirmation: false },
            { type: "start_study", label: "Ôn flashcards", href: "/workspace", payload: {}, requires_confirmation: false },
          ],
        },
      ]);
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
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                    {message.citations.map((citation) => (
                      <div key={citation.id} className="rounded-xl bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">{citation.label}</p>
                        <p className="mt-1 line-clamp-3">{citation.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action, actionIndex) => (
                      <ActionButton key={`${action.type}-${actionIndex}`} action={action} onQuiz={startInlineQuiz} />
                    ))}
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
                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-primary">
                          Quiz {quiz.index + 1}/{quiz.questions.length} · {question.deck_name}
                        </p>
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
                          <p className="font-semibold">{isCorrect ? "Đúng rồi" : "Chưa đúng"}</p>
                          <p className="mt-1 text-muted-foreground">{question.explanation}</p>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={nextQuizQuestion}
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
