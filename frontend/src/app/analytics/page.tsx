"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  AnalyticsData,
  fetchAnalytics,
  getStoredUser,
  User,
} from "../../lib/app-client";

function ForgetBar({ rate }: { rate: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="helper-text">Tốc độ quên ước tính</span>
        <span style={{ fontWeight: 700, color: rate > 40 ? "var(--danger)" : rate > 20 ? "var(--warning)" : "var(--success)" }}>
          {rate}%
        </span>
      </div>
      <div className="forgetting-bar">
        <div className="forgetting-fill" style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <p className="helper-text" style={{ marginTop: 6 }}>
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
    <div>
      <div className="heatmap">
        {cells.map(({ date, level }) => (
          <div
            key={date}
            className={`heatmap-cell ${level ? `level-${level}` : ""}`}
            title={`${date}: ${data[date] ?? 0} thẻ`}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
        <span className="helper-text">Ít</span>
        {[0,1,2,3].map((l) => (
          <div key={l} className={`heatmap-cell ${l ? `level-${l}` : ""}`} style={{ width: 14, height: 14, borderRadius: 4 }} />
        ))}
        <span className="helper-text">Nhiều</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user,    setUser]    = useState<User | null>(null);
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void fetchAnalytics(storedUser.id)
      .then(setData)
      .catch(() => setError("Không tải được analytics. Hãy kiểm tra backend."))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow">📊 Learning Analytics</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", letterSpacing: "-0.05em", margin: "10px 0 6px" }}>
          Tiến độ học tập
        </h1>
        <p className="muted">Theo dõi streak, tốc độ quên và các khái niệm khó nhất của bạn.</p>
      </div>

      {loading && (
        <div style={{ display: "grid", gap: 16 }}>
          {[1,2,3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-xl)" }} />
          ))}
        </div>
      )}

      {error && (
        <div className="panel">
          <p style={{ color: "var(--danger)", marginBottom: 0 }}>{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="dashboard-grid">
          {/* ── Left column ── */}
          <div style={{ display: "grid", gap: 20 }}>

            {/* Overview metrics */}
            <section className="panel">
              <h2 style={{ marginBottom: 16 }}>Tổng quan</h2>
              <div className="hero-grid" style={{ marginTop: 0 }}>
                <div className="metric-card">
                  <div className="metric-label">🔥 Study Streak</div>
                  <div className="metric-value">{data.streak}</div>
                  <div className="helper-text" style={{ marginTop: 2 }}>ngày liên tiếp</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">📚 Đã ôn</div>
                  <div className="metric-value">{data.total_reviewed}</div>
                  <div className="helper-text" style={{ marginTop: 2 }}>thẻ</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">🧠 Tốc độ quên</div>
                  <div
                    className="metric-value"
                    style={{
                      color: data.forgetting_rate > 40
                        ? "var(--danger)"
                        : data.forgetting_rate > 20
                        ? "var(--warning)"
                        : "var(--success)",
                    }}
                  >
                    {data.forgetting_rate}%
                  </div>
                </div>
              </div>
            </section>

            {/* Heatmap */}
            <section className="panel analytics-card">
              <div className="section-head">
                <div>
                  <h2 style={{ marginBottom: 4 }}>Hoạt động 35 ngày qua</h2>
                  <p style={{ marginBottom: 0 }}>Mỗi ô = số thẻ đã ôn trong ngày</p>
                </div>
              </div>
              <Heatmap data={data.heatmap} />
            </section>

            {/* Forgetting speed detail */}
            <section className="panel">
              <h2 style={{ marginBottom: 16 }}>Tốc độ quên theo deck</h2>
              {data.deck_stats.length === 0 ? (
                <p className="muted">Chưa có dữ liệu ôn tập. Hãy bắt đầu học để xem thống kê.</p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {data.deck_stats.map((ds) => {
                    const rate = ds.reviewed_count > 0
                      ? Math.round((ds.hard_count / ds.reviewed_count) * 100)
                      : 0;
                    return (
                      <div key={ds.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <strong>{ds.name}</strong>
                          <span className="helper-text">EF avg: {ds.avg_ef?.toFixed(2) ?? "—"}</span>
                        </div>
                        <ForgetBar rate={rate} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Right column ── */}
          <aside style={{ display: "grid", gap: 20, alignContent: "start" }}>

            {/* Hardest concepts */}
            <section className="panel">
              <h3 style={{ marginBottom: 14 }}>🎯 Khái niệm khó nhất</h3>
              {data.hardest_cards.length === 0 ? (
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Ôn tập thêm để xem các thẻ khó nhất của bạn.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {data.hardest_cards.map((c, i) => (
                    <div key={i} className="hardest-card-item">
                      <div className="ef-badge">
                        {c.ease_factor.toFixed(1)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: 2, fontSize: "0.88rem" }}>{c.front}</p>
                        <p className="helper-text" style={{ marginBottom: 0 }}>{c.back}</p>
                      </div>
                    </div>
                  ))}
                  <p className="helper-text" style={{ marginTop: 4 }}>
                    EF (Ease Factor): càng thấp = càng khó nhớ
                  </p>
                </div>
              )}
            </section>

            {/* Tips */}
            <section className="panel">
              <h3 style={{ marginBottom: 12 }}>💡 Gợi ý học tập</h3>
              <div className="insight-list">
                {[
                  { icon: "🔁", tip: "Ôn tập mỗi ngày, dù chỉ 5 phút, để giữ streak." },
                  { icon: "🎯", tip: "Tập trung vào các thẻ EF thấp — đó là nơi não cần luyện nhất." },
                  { icon: "⏰", tip: "Lịch ôn SM-2 tối ưu nhất khi bạn đánh giá chính xác độ khó." },
                ].map((t) => (
                  <div key={t.tip} className="insight-item">
                    <div className="feature-icon" style={{ fontSize: "1rem" }}>{t.icon}</div>
                    <p className="helper-text" style={{ marginBottom: 0, paddingTop: 4 }}>{t.tip}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Sharing */}
            <section className="panel">
              <h3 style={{ marginBottom: 8 }}>🌐 Chia sẻ bộ thẻ</h3>
              <p className="helper-text">
                Vào Workspace → nhấn <strong>Bật chia sẻ</strong> trên deck → chia link cho bạn bè.
              </p>
              <button
                className="btn btn-secondary"
                style={{ marginTop: 10 }}
                onClick={() => router.push("/workspace")}
              >
                Đến Workspace
              </button>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
