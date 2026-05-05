import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, RotateCcw, Home, Repeat, Trophy } from "lucide-react";
import { cn } from "../lib/utils";

type SummaryType = {
  due_cards: number;
  new_cards: number;
  completed_new: number;
  completed_review: number;
  daily_new_limit: number;
  daily_review_limit: number;
  total_cards: number;
};

type Props = {
  sessionRatings: number[];
  summary: SummaryType;
  onHome: () => void;
  onContinue: (overrideLimit: boolean) => void;
};

export default function SessionCompleteBoard({ sessionRatings, summary, onHome, onContinue }: Props) {
  useEffect(() => {
    if (sessionRatings.length === 0) return;
    const end = Date.now() + 1.5 * 1000;
    const colors = ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [sessionRatings.length]);

  const totalRated = sessionRatings.length;
  const goodCount = sessionRatings.filter((r) => r >= 2).length;
  const hardCount = totalRated - goodCount;
  const retentionRate = totalRated > 0 ? Math.round((goodCount / totalRated) * 100) : 0;

  const newProgress = summary.daily_new_limit > 0 
    ? Math.min(100, Math.round((summary.completed_new / summary.daily_new_limit) * 100))
    : 100;
  
  const reviewProgress = summary.daily_review_limit > 0
    ? Math.min(100, Math.round((summary.completed_review / summary.daily_review_limit) * 100))
    : 100;

  const hasMoreCards = summary.due_cards > 0 || summary.new_cards > 0;
  const reachedDailyLimit = summary.completed_new >= summary.daily_new_limit && summary.completed_review >= summary.daily_review_limit;

  return (
    <div className="w-full max-w-[600px] mx-auto p-8 bg-surface border border-border rounded-[32px] shadow-sm animate-in slide-in-from-bottom-8 fade-in duration-700">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-amber-50 dark:ring-amber-900/10">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Hoàn thành phiên học!</h2>
        <p className="text-muted-foreground">
          {totalRated > 0
            ? `Bạn vừa ôn xong ${totalRated} thẻ. Dưới đây là kết quả của bạn.`
            : "Dưới đây là tiến độ học tập hôm nay của bạn."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{goodCount}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70 mt-1">Nắm vững (Tốt/Dễ)</span>
        </div>
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex flex-col items-center text-center">
          <RotateCcw className="w-6 h-6 text-rose-500 mb-2" />
          <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{hardCount}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600/70 dark:text-rose-500/70 mt-1">Cần ôn lại (Khó/Lại)</span>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-surface-muted border border-border mb-8 space-y-6">
        <p className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-2">Tiến độ mục tiêu ngày</p>
        
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-foreground">Học thẻ mới</span>
            <span className="text-xs font-semibold text-muted-foreground">{summary.completed_new} / {summary.daily_new_limit}</span>
          </div>
          <div className="h-3 w-full bg-background rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${newProgress}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-foreground">Ôn tập thẻ cũ</span>
            <span className="text-xs font-semibold text-muted-foreground">{summary.completed_review} / {summary.daily_review_limit}</span>
          </div>
          <div className="h-3 w-full bg-background rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${reviewProgress}%` }} />
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 text-center">
          <p className="text-sm font-medium text-foreground">
            Tỷ lệ nhớ bài: <span className={cn("font-bold", retentionRate >= 80 ? "text-emerald-500" : "text-amber-500")}>{retentionRate}%</span>
          </p>
          {reachedDailyLimit && (
            <p className="text-xs font-bold text-emerald-500 mt-2 uppercase tracking-wide">Đã đạt mục tiêu hôm nay! 🎉</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onHome}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border bg-surface-raised text-foreground font-semibold hover:bg-muted/40 transition-colors"
        >
          <Home className="w-5 h-5" /> Về bộ thẻ
        </button>
        {(!reachedDailyLimit && hasMoreCards) ? (
          <button
            onClick={() => onContinue(false)}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary text-white font-semibold hover:brightness-105 shadow-md shadow-primary/20 transition-all"
          >
            <Repeat className="w-5 h-5" /> Học tiếp
          </button>
        ) : hasMoreCards ? (
          <button
            onClick={() => onContinue(true)}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 text-white font-semibold hover:brightness-105 shadow-md shadow-amber-500/20 transition-all"
          >
            <Repeat className="w-5 h-5" /> Học vượt mức
          </button>
        ) : null}
      </div>
    </div>
  );
}
