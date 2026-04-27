"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  AnalyticsData,
  fetchAnalytics,
  getStoredUser,
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
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { cn } from "../../lib/utils";

function ForgetBar({ rate }: { rate: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">Tốc độ quên ước tính</span>
        <span className={cn(
          "text-sm font-black transition-colors duration-300",
          rate > 40 ? "text-rose-500" : rate > 20 ? "text-amber-500" : "text-primary"
        )}>
          {rate}%
        </span>
      </div>
      <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden border border-border/50 shadow-inner">
        <div
          className={cn(
            "h-full transition-all duration-700 ease-out rounded-full shadow-[0_0_12px_rgba(0,0,0,0.05)]",
            rate > 40 ? "bg-rose-500 shadow-rose-200 dark:shadow-rose-500/20" : rate > 20 ? "bg-amber-500 shadow-amber-100 dark:shadow-amber-500/10" : "bg-primary shadow-blue-200 dark:shadow-blue-900/20"
          )}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <p className="text-[0.8rem] text-muted-foreground leading-relaxed px-1">
        {rate > 40
          ? "⚠️ Nhiều thẻ cần ôn lại — hãy học thêm phiên Short Review."
          : rate > 20
          ? "Một số thẻ đang có xu hướng quên — duy trì lịch ôn đều đặn."
          : "Tốt! Bạn đang ghi nhớ rất hiệu quả."}
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 p-1">
        {cells.map(({ date, level }) => (
          <div
            key={date}
            className={cn(
              "w-4 h-4 rounded-sm border border-black/5 transition-all duration-300 hover:scale-125 cursor-help",
              level === 0 ? "bg-surface-muted" :
              level === 1 ? "bg-amber-100" :
              level === 2 ? "bg-amber-300" :
              "bg-primary shadow-[0_2px_8px_var(--primary-glow)]"
            )}
            title={`${date}: ${data[date] ?? 0} thẻ`}
          />
        ))}
      </div>
      <div className="flex gap-4 items-center px-1">
        <span className="text-[0.65rem] font-bold text-subtle uppercase tracking-widest">Ít</span>
        <div className="flex gap-1.5">
          {[0,1,2,3].map((l) => (
            <div key={l} className={cn(
              "w-3.5 h-3.5 rounded-sm border border-black/5",
              l === 0 ? "bg-surface-muted" : l === 1 ? "bg-amber-100" : l === 2 ? "bg-amber-300" : "bg-primary"
            )} />
          ))}
        </div>
        <span className="text-[0.65rem] font-bold text-subtle uppercase tracking-widest">Nhiều</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const user = useMemo(() => getStoredUser(), []);
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace("/"); return; }
    void fetchAnalytics(user.id)
      .then(setData)
      .catch(() => setError("Không tải được analytics. Hãy kiểm tra backend."))
      .finally(() => setLoading(false));
  }, [router, user]);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-border text-muted-foreground text-[0.82rem] font-semibold mb-3.5 shadow-xs">
          <BarChart3 className="w-4 h-4 text-primary" /> Phân tích học tập
        </div>
        <h1 className="text-[clamp(1.8rem,4vw,3.2rem)] font-extrabold tracking-[-0.05em] mb-2.5 leading-tight">
          Tiến độ học tập
        </h1>
        <p className="text-muted-foreground text-base max-w-[64ch] leading-relaxed">Theo dõi streak, tốc độ quên và các khái niệm khó nhất của bạn.</p>
      </div>

      {loading && (
        <div className="grid gap-6 animate-pulse">
          <div className="h-40 bg-surface-raised border border-border rounded-[32px]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-60 bg-surface-raised border border-border rounded-[32px]" />
            <div className="h-60 bg-surface-raised border border-border rounded-[32px]" />
          </div>
        </div>
      )}

      {error && (
        <div className="p-10 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-[32px] text-center text-rose-600 dark:text-rose-400 animate-in zoom-in-95 duration-300">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-bold text-lg">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* ── Left col ── */}
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "Chuỗi học", value: data.streak, sub: "ngày liên tiếp", icon: Flame, color: "text-amber-500 bg-amber-50", glow: "shadow-amber-100" },
                { label: "Đã ôn tập", value: data.total_reviewed, sub: "thẻ flashcards", icon: BookOpen, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", glow: "shadow-blue-100" },
                { label: "Tốc độ quên", value: `${data.forgetting_rate}%`, sub: "trung bình", icon: Brain,
                  color: data.forgetting_rate > 40 ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10" : data.forgetting_rate > 20 ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "text-green-500 bg-green-50 dark:bg-green-500/10",
                  glow: data.forgetting_rate > 40 ? "shadow-rose-100" : data.forgetting_rate > 20 ? "shadow-amber-100 dark:shadow-amber-500/10" : "shadow-green-100"
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className={cn("p-6 bg-surface-raised border border-border rounded-[32px] shadow-sm flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-md group", m.glow)}>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300", m.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-[0.75rem] font-bold text-subtle uppercase tracking-widest mb-1.5">{m.label}</div>
                    <div className="text-3xl font-black text-foreground mb-1 tracking-tight">{m.value}</div>
                    <div className="text-[0.8rem] font-medium text-muted-foreground">{m.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Heatmap */}
            <section className="p-8 bg-surface-raised border border-border rounded-[40px] shadow-sm backdrop-blur-xl relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-extrabold flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-primary" /> Hoạt động 35 ngày qua
                  </h3>
                  <p className="text-[0.88rem] text-muted-foreground italic">Mỗi ô tương ứng với số thẻ bạn đã ôn trong ngày đó.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 text-[0.8rem] font-bold border border-green-200 dark:border-green-900/50">
                  <TrendingUp className="w-4 h-4" /> Hiệu suất ổn định
                </div>
              </div>
              <Heatmap data={data.heatmap} />

              <div className="absolute top-0 right-0 p-12 -mr-16 -mt-16 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            </section>

            {/* Deck detail stats */}
            <section className="p-10 bg-surface border border-border rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
              <h3 className="text-xl font-extrabold mb-8 flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" /> Tốc độ quên theo deck
              </h3>

              {data.deck_stats.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground pt-1">📚</div>
                  <p className="text-muted-foreground font-bold text-lg">Chưa có dữ liệu ôn tập.</p>
                  <p className="text-sm text-subtle">Hãy bắt đầu một phiên học để xem thống kê tại đây.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {data.deck_stats.map((ds) => {
                    const rate = ds.reviewed_count > 0
                      ? Math.round((ds.hard_count / ds.reviewed_count) * 100)
                      : 0;
                    return (
                      <div key={ds.id} className="group flex flex-col justify-between">
                        <div className="flex justify-between items-end mb-4 border-b border-border/50 pb-2">
                          <strong className="text-[1.1rem] font-black group-hover:text-primary transition-colors">{ds.name}</strong>
                          <div className="flex flex-col items-end">
                            <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Thiết lập học</span>
                            <span className="text-xs font-black text-primary">EF: {ds.avg_ef?.toFixed(2) ?? "—"}</span>
                          </div>
                        </div>
                        <ForgetBar rate={rate} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Right col ── */}
          <aside className="space-y-8 h-fit">
            {/* Hardest Cards */}
            <section className="p-8 bg-surface-raised border border-border rounded-[32px] shadow-sm">
              <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> Khái niệm khó nhất
              </h3>

              {data.hardest_cards.length === 0 ? (
                <p className="text-muted-foreground text-[0.88rem] leading-relaxed italic bg-surface p-4 rounded-2xl border border-dashed border-border-strong">
                  Não bạn đang xử lý rất tốt! Ôn tập thêm để hệ thống nhận diện các điểm cần cải thiện.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.hardest_cards.map((c, i) => (
                    <div key={i} className="group p-4 bg-surface border border-border rounded-2xl shadow-xs hover:border-rose-300 transition-all hover:shadow-md hover:-translate-x-1 duration-300">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex-shrink-0 flex flex-col items-center justify-center">
                          <span className="text-[0.5rem] font-black text-rose-300 dark:text-rose-400 uppercase leading-none mb-0.5">EF</span>
                          <span className="text-[0.85rem] font-black text-rose-500 leading-none">{c.ease_factor.toFixed(1)}</span>
                        </div>
                        <div>
                          <p className="font-extrabold text-[0.88rem] text-foreground mb-1 leading-tight line-clamp-2">{c.front}</p>
                          <p className="text-[0.8rem] text-muted-foreground line-clamp-2 leading-relaxed">{c.back}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-3.5 bg-surface-muted rounded-xl flex items-start gap-3 border border-border/50">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[0.72rem] font-bold text-subtle leading-relaxed italic">
                      Ease Factor (EF) thấp có nghĩa là bạn thường xuyên trả lời sai hoặc cần nhiều thời gian để nhớ lại.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Study Tips */}
            <section className="p-8 bg-surface border border-border rounded-[32px] shadow-sm relative overflow-hidden group">
              <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2 relative z-10">
                <Lightbulb className="w-5 h-5 text-amber-500" /> Gợi ý học tập
              </h3>
              <div className="space-y-6 relative z-10">
                {[
                  { icon: ChevronRight, tip: "Ôn tập mỗi ngày, dù chỉ 5 phút, để duy trì streak và bảo vệ nơ-ron học tập." },
                  { icon: ChevronRight, tip: "Tập trung vào các thẻ EF thấp — đó là nơi não bộ của bạn đang phát triển mạnh mẽ nhất." },
                  { icon: ChevronRight, tip: "SM-2 hoạt động tốt nhất khi bạn đánh giá trung thực cảm giác của mình khi học thẻ." },
                ].map((t, idx) => {
                  const Icon = t.icon;
                  return (
                    <div key={idx} className="flex gap-3 group/tip">
                      <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center shrink-0 group-hover/tip:bg-amber-100 transition-colors">
                        <Icon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-[0.82rem] font-bold text-muted-foreground leading-relaxed group-hover/tip:text-foreground transition-colors">{t.tip}</p>
                    </div>
                  );
                })}
              </div>
              {/* Background accent */}
              <div className="absolute bottom-0 right-0 p-16 -mr-20 -mb-20 bg-amber-50 dark:bg-amber-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
            </section>

            {/* Sharing */}
            <section className="p-8 bg-surface-muted border border-border rounded-[32px] shadow-sm">
              <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" /> Chia sẻ kiến thức
              </h3>
              <p className="text-[0.88rem] text-muted-foreground font-medium mb-6 leading-relaxed">
                Giúp cộng đồng học tập bằng cách chia sẻ bộ thẻ chất lượng của bạn. Bạn có thể bật chia sẻ tại Bộ thẻ.
              </p>
              <button
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-extrabold text-[0.88rem] text-white bg-primary shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                onClick={() => router.push("/workspace")}
              >
                Đến Bộ thẻ <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
