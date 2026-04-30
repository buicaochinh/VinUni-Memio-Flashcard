"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  AnalyticsData,
  fetchAnalytics,
  useStoredUser,
} from "../../lib/app-client";
import {
  BarChart3,
  Flame,
  BookOpen,
  Brain,
  Target,
  Lightbulb,
  Share2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";

function ForgetBar({ rate }: { rate: number }) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline gap-3">
        <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wide">
          Tốc độ quên ước tính
        </span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            rate > 40
              ? "text-rose-600 dark:text-rose-400"
              : rate > 20
                ? "text-amber-600 dark:text-amber-400"
                : "text-[hsl(var(--success))]"
          )}
        >
          {rate}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden ring-1 ring-border/60">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            rate > 40
              ? "bg-rose-500"
              : rate > 20
                ? "bg-amber-500"
                : "bg-[hsl(var(--primary))]"
          )}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <p className="text-[0.8rem] text-muted-foreground leading-relaxed">
        {rate > 40
          ? "Nhiều thẻ cần ôn lại. Thử thêm phiên ôn ngắn trong ngày."
          : rate > 20
            ? "Một số thẻ dễ trôi. Giữ nhịp ôn đều sẽ cải thiện dần."
            : "Ghi nhớ đang ổn định so với lượng thẻ bạn ôn."}
      </p>
    </div>
  );
}

function Heatmap({ data }: { data: Record<string, number> }) {
  const today = new Date();
  const cells: Array<{ date: string; level: number }> = [];

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = data[key] ?? 0;
    const level = count === 0 ? 0 : count < 5 ? 1 : count < 15 ? 2 : 3;
    cells.push({ date: key, level });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {cells.map(({ date, level }) => (
          <div
            key={date}
            className={cn(
              "w-3.5 h-3.5 rounded-[3px] transition-transform duration-200 ease-out hover:scale-125 hover:z-[1] cursor-help ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
              level === 0
                ? "bg-muted"
                : level === 1
                  ? "bg-primary/25"
                  : level === 2
                    ? "bg-primary/55"
                    : "bg-[hsl(var(--primary))] shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
            )}
            title={`${date}: ${data[date] ?? 0} thẻ`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center text-[0.65rem] text-muted-foreground">
        <span className="font-medium uppercase tracking-wider">Ít hoạt động</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((l) => (
            <div
              key={l}
              className={cn(
                "w-3 h-3 rounded-[3px] ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
                l === 0
                  ? "bg-muted"
                  : l === 1
                    ? "bg-primary/25"
                    : l === 2
                      ? "bg-primary/55"
                      : "bg-[hsl(var(--primary))]"
              )}
            />
          ))}
        </div>
        <span className="font-medium uppercase tracking-wider">ôn nhiều</span>
      </div>
    </div>
  );
}

function PredictedMasteryTimeline({
  timeline,
}: {
  timeline: Array<{ date: string; mastery: number }>;
}) {
  const maxHeight = 100;
  return (
    <div className="space-y-3">
      <div
        className="flex items-end gap-1 sm:gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-4"
        style={{ minHeight: maxHeight + 28 }}
      >
        {timeline.map((p, idx) => {
          const h = Math.max(4, (p.mastery / 100) * maxHeight);
          const showLabel = idx % 5 === 0;
          return (
            <div
              key={p.date}
              className="flex flex-col items-center gap-1 min-w-[12px]"
            >
              <div
                className="w-2 sm:w-2.5 rounded-t-sm bg-primary/40 hover:bg-primary/75 transition-colors cursor-help border border-primary/25"
                style={{ height: `${h}px` }}
                title={`${p.date}: ${p.mastery}%`}
              />
              {showLabel ? (
                <span className="text-[0.62rem] font-medium tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
              ) : (
                <span className="h-[0.875rem]" />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[0.82rem] text-muted-foreground leading-relaxed max-w-[70ch]">
        Ước tính tỉ lệ thẻ đến hạn ôn theo từng ngày, dựa trên `next_review` và lịch SM-2.
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const user = useStoredUser();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      const t = window.setTimeout(() => router.replace("/"), 0);
      return () => window.clearTimeout(t);
    }
    void fetchAnalytics(user.id)
      .then(setData)
      .catch(() => setError("Không tải được analytics. Hãy kiểm tra backend."))
      .finally(() => setLoading(false));
  }, [router, user]);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <header className="mb-12 max-w-3xl animate-in fade-in slide-in-from-bottom-3 duration-500">
        <p className="text-[0.8rem] font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary shrink-0" aria-hidden />
          Phân tích học tập
        </p>
        <h1 className="text-[clamp(1.65rem,3.8vw,2.75rem)] font-bold tracking-tight text-balance mb-4">
          Tiến độ của bạn
        </h1>
        <p className="text-muted-foreground text-[0.98rem] leading-relaxed">
          Chuỗi ôn tập, mật độ theo ngày và chỗ đang hụt để bạn chỉnh đúng chỗ,
          không chỉ nhìn số cho vui.
        </p>
      </header>

      {loading && (
        <div className="grid gap-5 animate-pulse">
          <div className="h-28 rounded-2xl bg-muted/60 ring-1 ring-border/50" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-56 rounded-2xl bg-muted/50 ring-1 ring-border/40" />
            <div className="h-56 rounded-2xl bg-muted/50 ring-1 ring-border/40" />
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-8 py-10 text-center animate-in zoom-in-95 duration-300"
        >
          <AlertTriangle
            className="w-10 h-10 mx-auto mb-3 opacity-70 text-rose-600 dark:text-rose-400"
            aria-hidden
          />
          <p className="font-semibold text-rose-900 dark:text-rose-100">
            {error}
          </p>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(100%,340px)] gap-10 xl:gap-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="space-y-10">
            {/* Unified metrics strip */}
            <section
              aria-label="Tóm tắt chỉ số"
              className="rounded-2xl ring-1 ring-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md overflow-hidden shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {[
                  {
                    label: "Chuỗi học",
                    value: String(data.streak),
                    unit: "ngày liên tiếp",
                    icon: Flame,
                    accent: "text-amber-600 dark:text-amber-400",
                  },
                  {
                    label: "Đã ôn",
                    value: String(data.total_reviewed),
                    unit: "thẻ đã duyệt",
                    icon: BookOpen,
                    accent: "text-[hsl(var(--primary))]",
                  },
                  {
                    label: "Tốc độ quên",
                    value: `${data.forgetting_rate}%`,
                    unit: "trung bình theo ôn",
                    icon: Brain,
                    accent:
                      data.forgetting_rate > 40
                        ? "text-rose-600 dark:text-rose-400"
                        : data.forgetting_rate > 20
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-[hsl(var(--success))]",
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.label}
                      className="px-6 py-6 flex flex-col gap-3 hover:bg-muted/40 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn("w-5 h-5 shrink-0", m.accent)}
                          aria-hidden
                        />
                        <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {m.label}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-[1.65rem] font-bold tabular-nums tracking-tight">
                        {m.value}
                      </p>
                      <p className="text-[0.8rem] text-muted-foreground leading-snug">
                        {m.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Activity heatmap */}
            <section className="rounded-2xl border border-border bg-background px-6 sm:px-8 py-7">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
                <div className="space-y-2 max-w-xl">
                  <h2 className="text-lg font-semibold flex items-center gap-2 tracking-tight">
                    <Calendar className="w-5 h-5 text-primary shrink-0" />
                    Hoạt động 35 ngày gần nhất
                  </h2>
                  <p className="text-[0.88rem] text-muted-foreground leading-relaxed">
                    Mật độ ôn theo ngày. Ô đậm hơn là nhiều thẻ hơn trong ngày đó.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-muted/80 px-3 py-2 text-[0.78rem] font-medium text-muted-foreground ring-1 ring-border/70 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                  Theo dõi xu hướng hằng tuần
                </div>
              </div>
              <Heatmap data={data.heatmap} />
            </section>

            {/* Predicted timeline */}
            <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic))] backdrop-blur-md px-6 sm:px-8 py-7 shadow-sm">
              <div className="mb-6 space-y-2 max-w-xl">
                <h2 className="text-lg font-semibold flex items-center gap-2 tracking-tight">
                  <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                  Dòng thời gian nắm vững (ước tính)
                </h2>
                <p className="text-[0.88rem] text-muted-foreground leading-relaxed">
                  Ba mươi ngày tới: cột biểu thị lượng thẻ dự kiến cần ôn hoặc
                  mức &quot;mastery&quot; theo backend.
                </p>
              </div>
              <PredictedMasteryTimeline timeline={data.predicted_mastery_timeline} />
            </section>

            {/* Weak areas */}
            <section className="rounded-2xl border border-border bg-background px-6 sm:px-8 py-7">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight">
                <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                Deck và thẻ đang yếu
              </h2>

              {data.weak_areas.weak_decks.length === 0 &&
              data.weak_areas.weak_cards.length === 0 ? (
                <p className="text-muted-foreground text-[0.9rem] rounded-xl bg-muted/50 px-4 py-4 ring-1 ring-border/70">
                  Chưa đủ phiên ôn để nhận diện chỗ yếu. Ôn thêm một vài hôm là
                  mục này sẽ có dữ liệu.
                </p>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-[0.85rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Deck có tỉ lệ yếu cao
                    </h3>
                    <div className="grid gap-3">
                      {data.weak_areas.weak_decks.map((d) => (
                        <div
                          key={d.id}
                          className="rounded-xl border border-border px-4 py-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <div className="font-semibold">{d.name}</div>
                              <div className="text-[0.82rem] text-muted-foreground">
                                Hard {d.hard_count} · Đã ôn {d.reviewed_count}
                              </div>
                            </div>
                            <dl className="text-right shrink-0">
                              <dt className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                                Weak ratio
                              </dt>
                              <dd className="text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                                {d.weak_ratio}%
                              </dd>
                            </dl>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[0.85rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Thẻ EF thấp (dễ trôi nhất)
                    </h3>
                    <div className="grid gap-3">
                      {data.weak_areas.weak_cards.map((c) => (
                        <div key={c.id} className="rounded-xl border border-border px-4 py-3.5 hover:border-primary/35 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0 ring-1 ring-border/80">
                              <span className="text-[0.5rem] font-bold text-muted-foreground uppercase">
                                EF
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                                {c.ease_factor.toFixed(1)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[0.9rem] text-foreground leading-snug line-clamp-2">
                                {c.front}
                              </p>
                              <p className="text-[0.8rem] text-muted-foreground line-clamp-2 mt-1">
                                {c.back}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Peers */}
            <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md px-6 sm:px-8 py-7 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight">
                <Users className="w-5 h-5 text-primary shrink-0" />
                So với học viên khác (ẩn danh)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(() => {
                  const yourF = data.peers_comparison.your_forgetting_rate;
                  const peerF = data.peers_comparison.peer_forgetting_rate;
                  const bad = yourF > peerF;
                  return (
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-4",
                        bad
                          ? "border-rose-200/80 bg-rose-50 dark:border-rose-500/25 dark:bg-rose-950/25"
                          : "border-emerald-200/80 bg-emerald-50 dark:border-emerald-600/25 dark:bg-emerald-950/25"
                      )}
                    >
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Tỉ lệ “quên” (hard / đã ôn)
                      </div>
                      <div className="flex justify-between items-end gap-3">
                        <div>
                          <div
                            className={cn(
                              "text-2xl font-semibold tabular-nums",
                              bad
                                ? "text-rose-700 dark:text-rose-400"
                                : "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {yourF}%
                          </div>
                          <div className="text-[0.8rem] text-muted-foreground mt-1">Bạn</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Trung bình</div>
                          <div className="text-lg font-semibold tabular-nums text-primary">
                            {peerF}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const yourR = data.peers_comparison.your_avg_reviews_per_day;
                  const peerR = data.peers_comparison.peer_avg_reviews_per_day;
                  const below = yourR < peerR;
                  return (
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-4",
                        below
                          ? "border-amber-200/90 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30"
                          : "border-emerald-200/80 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/20"
                      )}
                    >
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Trung bình ôn mỗi ngày
                      </div>
                      <div className="flex justify-between items-end gap-3">
                        <div>
                          <div
                            className={cn(
                              "text-2xl font-semibold tabular-nums",
                              below ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {yourR}
                          </div>
                          <div className="text-[0.8rem] text-muted-foreground mt-1">Bạn</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Trung bình</div>
                          <div className="text-lg font-semibold tabular-nums text-primary">
                            {peerR}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-border px-4 py-3.5 bg-muted/30">
                {data.peers_comparison.your_forgetting_rate >
                data.peers_comparison.peer_forgetting_rate ? (
                  <p className="text-[0.85rem] text-rose-800 dark:text-rose-200 leading-relaxed">
                    Bạn đang “khó ôn” hơn nhóm đối chiếu. Ưu tiên thẻ EF thấp và
                    Short Review trong ngắn hạn.
                  </p>
                ) : (
                  <p className="text-[0.85rem] text-emerald-900 dark:text-emerald-100 leading-relaxed">
                    Tốc độ quên của bạn tốt hơn trung bình. Tiếp tục ôn các deck có weak ratio cao để không bị lệch chỗ khác.
                  </p>
                )}
              </div>
            </section>

            {/* Per-deck forget */}
            <section className="rounded-2xl border border-border bg-background px-6 sm:px-10 py-8">
              <h2 className="text-lg font-semibold mb-8 flex items-center gap-2 tracking-tight">
                <Brain className="w-5 h-5 text-[hsl(var(--primary))]" />
                Tốc độ quên theo từng deck
              </h2>

              {data.deck_stats.length === 0 ? (
                <div className="py-16 text-center rounded-xl bg-muted/40 ring-1 ring-border/60">
                  <span className="text-4xl block mb-3" aria-hidden>
                    📚
                  </span>
                  <p className="font-medium text-foreground">Chưa có dữ liệu ôn tập.</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                    Bắt đầu một phiên ôn trong Bộ thẻ để báo cáo ở đây được điền dần.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                  {data.deck_stats.map((ds) => {
                    const rate =
                      ds.reviewed_count > 0
                        ? Math.round((ds.hard_count / ds.reviewed_count) * 100)
                        : 0;
                    return (
                      <article key={ds.id} className="border-b border-border/70 md:border-none pb-8 md:pb-0 last:border-none last:pb-0">
                        <div className="flex justify-between gap-4 items-start mb-5">
                          <h3 className="text-[1.05rem] font-semibold leading-snug hover:text-primary transition-colors cursor-default">
                            {ds.name}
                          </h3>
                          <div className="text-right shrink-0">
                            <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                              EF trung bình
                            </div>
                            <div className="text-xs font-semibold tabular-nums text-primary mt-1">
                              {ds.avg_ef?.toFixed(2) ?? "—"}
                            </div>
                          </div>
                        </div>
                        <ForgetBar rate={rate} />
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8 lg:sticky lg:top-28 h-fit">
            <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md px-6 py-7 shadow-sm">
              <h2 className="text-base font-semibold mb-6 flex items-center gap-2 tracking-tight">
                <Target className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                Thẻ gây vướng nhất
              </h2>

              {data.hardest_cards.length === 0 ? (
                <p className="text-[0.9rem] text-muted-foreground rounded-xl bg-muted/50 px-4 py-4 ring-1 ring-border/70 leading-relaxed">
                  Chưa có thẻ nào được đánh giá là “khó ôn”. Ôn thêm một vài phiên là danh sách sẽ xuất hiện.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.hardest_cards.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border px-3.5 py-3.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0 ring-1 ring-border/80">
                          <span className="text-[0.5rem] font-bold text-muted-foreground uppercase">
                            EF
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                            {c.ease_factor.toFixed(1)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[0.88rem] text-foreground leading-snug line-clamp-2">
                            {c.front}
                          </p>
                          <p className="text-[0.8rem] text-muted-foreground line-clamp-2 mt-1">
                            {c.back}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 rounded-xl bg-muted/60 px-3 py-3 ring-1 ring-border/70">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-[0.76rem] text-muted-foreground leading-relaxed">
                      EF thấp thường gắn với các lần trả lời khó hoặc không tự tin. Đánh giá đúng cảm giác trong lúc ôn để SM-2 kéo được lịch chuẩn.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-background px-6 py-7">
              <h2 className="text-base font-semibold mb-6 flex items-center gap-2 tracking-tight">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                Gợi ý ngắn
              </h2>
              <ul className="space-y-5">
                {[
                  "Ôn mỗi ngày, dù chỉ vài phút, để không vỡ chuỗi và không phải lấy lại từ đầu.",
                  "Ưu tiên các thẻ EF thấp: đó là chỗ một phút ôn đổi được nhiều chỗ vướng nhất.",
                  "Chấm điểm 0–3 trung thực trong lần flip; lịch `next_review` chỉ có ý nghĩa khi bạn không tự đánh lố.",
                ].map((tip, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border/80">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </span>
                    <span className="text-[0.85rem] text-muted-foreground leading-relaxed">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic))] backdrop-blur-md px-6 py-7 shadow-sm">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2 tracking-tight">
                <Share2 className="w-5 h-5 text-primary shrink-0" />
                Chia sẻ deck
              </h2>
              <p className="text-[0.88rem] text-muted-foreground mb-6 leading-relaxed">
                Deck công khai giúp người khác ôn được nội dung bạn đã chọn lọc. Bạn bật tùy chọn chia sẻ ngay trong màn Bộ thẻ.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push("/workspace")}
              >
                Mở Bộ thẻ
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
              </Button>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
