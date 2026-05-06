import React from "react";
import { CalendarCheck, Home, Zap } from "lucide-react";
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
  summary: SummaryType;
  onHome: () => void;
  onOverride: () => void;
};

export default function DailyLimitReached({ summary, onHome, onOverride }: Props) {
  const isNewLimitReached = summary.completed_new >= summary.daily_new_limit;
  const isReviewLimitReached = summary.completed_review >= summary.daily_review_limit;
  
  const title = (isNewLimitReached && isReviewLimitReached) 
    ? "Đã đạt mục tiêu hôm nay!" 
    : "Đã hoàn thành thẻ hôm nay!";
    
  const description = (isNewLimitReached && isReviewLimitReached)
    ? "Bạn đã hoàn thành hạn mức học trong ngày. Nghỉ ngơi để não ghi nhớ tốt hơn, hoặc tiếp tục nếu muốn."
    : "Tuyệt vời! Bạn đã xử lý hết các thẻ cần học trong bộ này. Bạn có muốn học thêm thẻ mới không?";

  const newProgress = summary.daily_new_limit > 0
    ? Math.min(100, Math.round((summary.completed_new / summary.daily_new_limit) * 100))
    : 100;

  const reviewProgress = summary.daily_review_limit > 0
    ? Math.min(100, Math.round((summary.completed_review / summary.daily_review_limit) * 100))
    : 100;

  return (
    <div className="w-full max-w-[520px] mx-auto p-8 bg-surface border border-border rounded-[32px] shadow-sm animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-5 ring-4 ring-emerald-50 dark:ring-emerald-900/10">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-muted-foreground text-[0.92rem] leading-relaxed max-w-sm">
          {description}
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-surface-muted border border-border mb-8 space-y-5">
        <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider mb-1">Mục tiêu ngày</p>
        
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-sm font-semibold text-foreground">Học thẻ mới</span>
            <span className={cn("text-xs font-semibold", isNewLimitReached ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {summary.completed_new} / {summary.daily_new_limit} {isNewLimitReached && "✓"}
            </span>
          </div>
          <div className="h-2.5 w-full bg-background rounded-full overflow-hidden shadow-inner">
            <div className={cn("h-full rounded-full transition-all duration-700", isNewLimitReached ? "bg-emerald-500" : "bg-primary")} style={{ width: `${newProgress}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-sm font-semibold text-foreground">Ôn tập thẻ cũ</span>
            <span className={cn("text-xs font-semibold", isReviewLimitReached ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {summary.completed_review} / {summary.daily_review_limit} {isReviewLimitReached && "✓"}
            </span>
          </div>
          <div className="h-2.5 w-full bg-background rounded-full overflow-hidden shadow-inner">
            <div className={cn("h-full rounded-full transition-all duration-700", isReviewLimitReached ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${reviewProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onHome}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary text-white font-semibold hover:brightness-105 shadow-md shadow-primary/20 transition-all"
        >
          <Home className="w-5 h-5" /> Về bộ thẻ
        </button>
        <button
          onClick={onOverride}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border bg-surface-raised text-foreground font-semibold hover:bg-muted/40 transition-colors"
        >
          <Zap className="w-5 h-5 text-amber-500" /> Học vượt mức
        </button>
      </div>
    </div>
  );
}
