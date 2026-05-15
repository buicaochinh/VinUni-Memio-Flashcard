"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Clock3, DollarSign, ShieldAlert, Sparkles, Target, Users } from "lucide-react";

import AppShell from "../../../components/AppShell";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  fetchAdminPilotEvaluation,
  fetchMe,
  PilotEvaluationResponse,
  saveStoredUser,
  useClientReady,
  useStoredUser,
} from "../../../lib/app-client";
import { cn } from "../../../lib/utils";

function MetricCard({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background px-5 py-5 shadow-sm">
      <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
        {unit && <span className="pb-1 text-[0.78rem] font-medium text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="mt-2 text-[0.82rem] leading-relaxed text-muted-foreground">{hint}</p>}
    </article>
  );
}

export default function AdminEvaluationPage() {
  const router = useRouter();
  const clientReady = useClientReady();
  const storedUser = useStoredUser();
  const [verifiedAdmin, setVerifiedAdmin] = useState<boolean | null>(null);
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<PilotEvaluationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientReady) return;
    if (!storedUser) {
      const t = window.setTimeout(() => router.replace("/"), 0);
      return () => window.clearTimeout(t);
    }
    fetchMe()
      .then((freshUser) => {
        saveStoredUser(freshUser);
        if (!freshUser.is_admin) {
          router.replace("/workspace");
        } else {
          setVerifiedAdmin(true);
        }
      })
      .catch(() => {
        router.replace("/");
      });
  }, [clientReady, router, storedUser]);

  useEffect(() => {
    if (!verifiedAdmin) return;
    fetchAdminPilotEvaluation(days)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được dashboard evaluation."))
  }, [verifiedAdmin, days]);

  const loading = !data && !error;

  if (!clientReady || !storedUser || verifiedAdmin === null) {
    return (
      <AppShell user={null}>
        <div className="space-y-5">
          <Skeleton className="h-12 w-72 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const metrics = data?.metrics;

  return (
    <AppShell user={storedUser}>
      <header className="mb-8 max-w-4xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/35 px-3 py-1.5 text-[0.78rem] font-semibold text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5 text-primary" aria-hidden />
          Chỉ admin
        </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Đánh giá pilot</h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          Dashboard nội bộ để theo dõi learning outcome, AI quality và reliability của Memio trong pilot.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {[7, 14, 30].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setDays(value as 7 | 14 | 30);
              setData(null);
              setError(null);
            }}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              days === value
                ? "border-primary bg-primary text-[hsl(var(--primary-foreground))]"
                : "border-border bg-background text-foreground hover:bg-muted/40"
            )}
          >
            {value} ngày
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-200">
          {error}
        </div>
      )}

      {data && metrics && !loading && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Weekly Active Learners"
              value={String(metrics.weekly_active_learners.value)}
              unit="người học"
              hint={`${data.window.start_date} → ${data.window.end_date}`}
            />
            <MetricCard
              label="Mastered / Active"
              value={String(metrics.mastered_cards_per_active_learner_per_week.value)}
              unit="thẻ"
              hint={`${metrics.mastered_cards_per_active_learner_per_week.mastered_cards} thẻ đạt mastery`}
            />
            <MetricCard
              label="Due Completion"
              value={`${metrics.due_card_completion_rate.value}%`}
              unit="hôm nay"
              hint={`${metrics.due_card_completion_rate.completed_due_today}/${metrics.due_card_completion_rate.denominator} thẻ đến hạn đã hoàn thành`}
            />
            <MetricCard
              label="7-Day Retention"
              value={metrics.seven_day_retention.value === null ? "Chưa có" : `${metrics.seven_day_retention.value}%`}
              hint={data.window.d7_retention_note}
            />
            <MetricCard
              label="AI Acceptance"
              value={`${metrics.ai_card_acceptance_rate.value}%`}
              hint={`${metrics.ai_card_acceptance_rate.accepted_cards}/${metrics.ai_card_acceptance_rate.generated_candidates} thẻ được giữ lại`}
            />
            <MetricCard
              label="AI Edit Rate"
              value={`${metrics.ai_card_edit_delete_rate.value.edit_rate_percent}%`}
              hint={`${metrics.ai_card_edit_delete_rate.edited_cards} thẻ bị sửa trước/sau khi lưu`}
            />
            <MetricCard
              label="AI Delete Rate"
              value={`${metrics.ai_card_edit_delete_rate.value.delete_rate_percent}%`}
              hint={`${metrics.ai_card_edit_delete_rate.deleted_cards} thẻ bị xóa`}
            />
            <MetricCard
              label="Coach Action CTR"
              value={`${metrics.coach_action_click_through_rate.value}%`}
              hint={`${metrics.coach_action_click_through_rate.action_clicks}/${metrics.coach_action_click_through_rate.actions_shown} lượt click`}
            />
            <MetricCard
              label="Goal Readiness Accuracy"
              value={metrics.exam_goal_readiness_accuracy.value === null ? "Chưa có" : `${metrics.exam_goal_readiness_accuracy.value}%`}
              hint={`${metrics.exam_goal_readiness_accuracy.accurate_snapshots}/${metrics.exam_goal_readiness_accuracy.evaluated_snapshots} snapshots chính xác`}
            />
            <MetricCard
              label="OpenAI Cost / Active"
              value={`$${metrics.openai_cost_per_active_learner.value.toFixed(4)}`}
              hint={`Tổng $${metrics.openai_cost_per_active_learner.total_openai_cost_usd.toFixed(4)}`}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-border bg-background px-6 py-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold tracking-tight">AI latency p95</h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-muted-foreground">Overall</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{metrics.p95_latency_for_ai_endpoints.value} ms</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.entries(metrics.p95_latency_for_ai_endpoints.breakdown_ms).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-border px-4 py-3">
                      <p className="text-[0.78rem] font-semibold text-foreground">{key}</p>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">{value} ms</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background px-6 py-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold tracking-tight">Ghi chú vận hành</h2>
              </div>
              <ul className="space-y-4 text-[0.9rem] leading-relaxed text-muted-foreground">
                <li className="flex gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Active learner được tính theo meaningful learning evidence trong window, không phải chỉ theo login.
                </li>
                <li className="flex gap-3">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Mastery hiện tại và mastery transition được suy ra từ `review_history` và `progress`.
                </li>
                <li className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  AI acceptance/edit/delete đang dựa trên provenance fields của `flashcards` và `telemetry_events`.
                </li>
                <li className="flex gap-3">
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  D7 retention hiện là first meaningful learning event retention, chưa phải signup retention.
                </li>
              </ul>
            </article>
          </section>
        </div>
      )}
    </AppShell>
  );
}
