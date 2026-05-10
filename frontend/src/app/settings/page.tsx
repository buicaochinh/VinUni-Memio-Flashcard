"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  fetchUserSettings,
  updateUserSettings,
  useClientReady,
  useStoredUser,
} from "../../lib/app-client";
import { Button } from "../../components/ui/button";
import { Check, Bell, BookOpen, Clock } from "lucide-react";

const TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Việt Nam (UTC+7)" },
  { value: "Asia/Bangkok",     label: "Bangkok (UTC+7)" },
  { value: "Asia/Singapore",   label: "Singapore (UTC+8)" },
  { value: "Asia/Tokyo",       label: "Tokyo (UTC+9)" },
  { value: "Europe/London",    label: "London (UTC+0/+1)" },
  { value: "America/New_York", label: "New York (UTC-5/-4)" },
  { value: "UTC",              label: "UTC" },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useStoredUser();
  const clientReady = useClientReady();

  const [dailyNew, setDailyNew] = useState(20);
  const [dailyReview, setDailyReview] = useState(50);
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientReady) return;
    if (!user) { router.replace("/"); return; }
    fetchUserSettings()
      .then((s) => {
        setDailyNew(s.daily_new_limit);
        setDailyReview(s.daily_review_limit);
        setTimezone(s.timezone);
      })
      .catch(() => setError("Không tải được cài đặt."))
      .finally(() => setLoading(false));
  }, [clientReady, router, user]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateUserSettings(dailyNew, dailyReview, timezone);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Lưu thất bại. Hãy thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (!clientReady || !user) return null;

  return (
    <AppShell user={user}>
      <div className="max-w-xl mx-auto space-y-6">

        {/* Study limits */}
        <section className="p-7 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[28px] shadow-sm space-y-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Giới hạn học mỗi ngày
          </h2>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider">
                Thẻ mới mỗi ngày
              </label>
              <span className="text-primary font-bold text-lg tabular-nums">{dailyNew}</span>
            </div>
            <input
              type="range" min={5} max={100} step={5}
              value={dailyNew}
              onChange={(e) => setDailyNew(Number(e.target.value))}
              className="w-full h-2 bg-surface-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between mt-1.5 text-[0.75rem] font-semibold text-muted-foreground">
              <span>5</span><span>100</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider">
                Ôn tập mỗi ngày
              </label>
              <span className="text-primary font-bold text-lg tabular-nums">{dailyReview}</span>
            </div>
            <input
              type="range" min={10} max={300} step={10}
              value={dailyReview}
              onChange={(e) => setDailyReview(Number(e.target.value))}
              className="w-full h-2 bg-surface-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between mt-1.5 text-[0.75rem] font-semibold text-muted-foreground">
              <span>10</span><span>300</span>
            </div>
          </div>
        </section>

        {/* Timezone */}
        <section className="p-7 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[28px] shadow-sm space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Múi giờ
          </h2>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[0.9rem] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-[0.78rem] text-muted-foreground">
            Múi giờ ảnh hưởng đến lịch ôn tập, streak và thông báo nhắc học.
          </p>
        </section>

        {/* Notifications info */}
        <section className="p-7 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[28px] shadow-sm space-y-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Thông báo
          </h2>
          <p className="text-[0.88rem] text-muted-foreground leading-relaxed">
            Memio gửi thông báo qua <strong className="text-foreground">Telegram</strong> khi có thẻ đến hạn, streak sắp mất, hoặc kỳ thi đang đến gần.
          </p>
          <p className="text-[0.88rem] text-muted-foreground">
            Liên kết tài khoản Telegram trong{" "}
            <a href="/integrations" className="text-primary font-semibold hover:underline">Liên kết →</a>
          </p>
        </section>

        {/* Save */}
        {error && (
          <p className="text-[0.85rem] text-rose-500 font-medium text-center">{error}</p>
        )}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saved ? (
            <><Check className="w-4 h-4" /> Đã lưu</>
          ) : saving ? "Đang lưu…" : "Lưu cài đặt"}
        </Button>
      </div>
    </AppShell>
  );
}
