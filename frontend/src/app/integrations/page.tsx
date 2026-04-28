"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  ChatIntegrationDTO,
  deleteIntegration,
  fetchIntegrations,
  getStoredTokens,
  getStoredUser,
  linkIntegration,
  testSendDueCards,
  testWeeklyReport,
  updateIntegration,
  User,
} from "../../lib/app-client";
import { Link2, Loader2, Send, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

const SEND_WINDOW_RE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

function providerLabel(p: string) {
  if (p === "telegram") return "Telegram";
  return p;
}

type FormRow = { timezone: string; send_window: string; daily_goal: string };

export default function IntegrationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<ChatIntegrationDTO[]>([]);
  const [forms, setForms] = useState<Record<string, FormRow>>({});
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const data = await fetchIntegrations();
      setRows(data);
      const f: Record<string, FormRow> = {};
      for (const r of data) {
        f[r.provider] = {
          timezone: r.timezone,
          send_window: r.send_window,
          daily_goal: String(r.daily_goal),
        };
      }
      setForms(f);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được liên kết.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (!getStoredTokens()) {
      router.replace("/login");
      return;
    }
    setUser(u);
    void load();
  }, [router, load]);

  const onLink = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      setErr("Nhập mã từ Telegram.");
      return;
    }
    setLinking(true);
    setErr(null);
    setMsg(null);
    try {
      await linkIntegration(c);
      setCode("");
      setMsg("Liên kết thành công.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Liên kết thất bại.");
    } finally {
      setLinking(false);
    }
  };

  const onSave = async (provider: string) => {
    const f = forms[provider];
    if (!f) return;
    if (!SEND_WINDOW_RE.test(f.send_window.trim())) {
      setErr("Khung giờ phải có dạng HH:MM-HH:MM (ví dụ 19:00-22:00).");
      return;
    }
    const dg = parseInt(f.daily_goal, 10);
    if (Number.isNaN(dg) || dg < 1 || dg > 500) {
      setErr("Mục tiêu mỗi ngày phải từ 1 đến 500.");
      return;
    }
    setSaving(provider);
    setErr(null);
    setMsg(null);
    try {
      await updateIntegration(provider, {
        timezone: f.timezone.trim(),
        send_window: f.send_window.trim(),
        daily_goal: dg,
      });
      setMsg("Đã lưu cấu hình.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setSaving(null);
    }
  };

  const onUnlink = async (provider: string) => {
    if (!window.confirm(`Hủy liên kết ${providerLabel(provider)}?`)) return;
    setErr(null);
    setMsg(null);
    try {
      await deleteIntegration(provider);
      setMsg("Đã hủy liên kết.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không hủy được.");
    }
  };

  const onTestWeekly = async () => {
    setErr(null);
    setMsg(null);
    try {
      await testWeeklyReport();
      setMsg("Đã gửi test weekly report (xem trong nhóm/DM).");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không gửi được weekly report.");
    }
  };

  const onTestDue = async () => {
    setErr(null);
    setMsg(null);
    try {
      await testSendDueCards();
      setMsg("Đã gửi test 1–3 thẻ đến hạn vào chat riêng với bot.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không gửi được thẻ đến hạn.");
    }
  };

  const updateForm = (provider: string, patch: Partial<FormRow>) => {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...patch },
    }));
  };

  const sentRatio = (r: ChatIntegrationDTO) => {
    const goal = Math.max(Number(r.daily_goal ?? 0), 0);
    if (goal <= 0) return 0;
    const sent = Math.max(Number(r.sent_today ?? 0), 0);
    return Math.min(1, sent / goal);
  };

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppShell user={user}>
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
          <Link2 className="w-8 h-8 text-primary" />
          Liên kết Telegram
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
          Mở Telegram, tìm bot Memio, gõ <code className="px-1.5 py-0.5 rounded bg-surface-muted border border-border text-xs font-mono">/start</code> để nhận mã 8 ký tự, rồi dán vào ô bên dưới (mã có hiệu lực 10 phút).
        </p>
      </div>

      <section className="rounded-[24px] border border-border bg-surface-raised p-6 shadow-[0_16px_60px_-30px_rgba(0,0,0,0.25)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Bước 1</p>
            <h2 className="text-lg font-black tracking-tight">Nhập mã liên kết</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: bạn có thể dán thẳng mã, hệ thống sẽ tự viết hoa.
          </p>
        </div>
        <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-black mb-1">Hướng dẫn nhanh</p>
          <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
            <li>Mở chat riêng với bot trên Telegram và gõ <span className="font-mono font-bold text-foreground">/start</span>.</li>
            <li>Dán mã 8 ký tự vào ô dưới để liên kết.</li>
            <li>Nếu muốn nhận weekly report vào nhóm: vào group và gõ <span className="font-mono font-bold text-foreground">/setgroup</span> (tắt: <span className="font-mono font-bold text-foreground">/unsetgroup</span>).</li>
            <li>Khi bot gửi thẻ, bấm nút 0–3 để chấm điểm (SM-2 sẽ tự cập nhật).</li>
          </ol>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 border border-border bg-surface-muted rounded-xl p-1 shadow-inner">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
              placeholder="VD: CP94N78Y"
              className="w-full bg-transparent border-none outline-none px-3 py-2.5 text-foreground text-sm font-mono tracking-[0.35em] placeholder:tracking-normal"
              maxLength={12}
              disabled={linking}
            />
          </div>
          <button
            type="button"
            onClick={() => void onLink()}
            disabled={linking || !code.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[0.92rem] transition-all text-white bg-primary shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:bg-primary/90 hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Liên kết
          </button>
        </div>
      </section>

      {msg && (
        <p className="mb-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-4 py-3">
          {msg}
        </p>
      )}
      {err && (
        <p className="mb-4 text-sm font-bold text-destructive border border-destructive/30 bg-destructive/10 rounded-xl px-4 py-3">
          {err}
        </p>
      )}

      <section className="rounded-[24px] border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Bước 2</p>
            <h2 className="text-lg font-black tracking-tight">Đã liên kết</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onTestWeekly()}
              className="px-4 py-2 rounded-xl border border-border-strong bg-surface text-foreground font-bold text-[0.82rem] hover:-translate-y-px active:translate-y-0 transition-transform shadow-xs"
            >
              Test weekly report
            </button>
            <button
              type="button"
              onClick={() => void onTestDue()}
              className="px-4 py-2 rounded-xl border border-border-strong bg-surface text-foreground font-bold text-[0.82rem] hover:-translate-y-px active:translate-y-0 transition-transform shadow-xs"
            >
              Test gửi thẻ
            </button>
            <p className="hidden md:block text-xs text-muted-foreground">
              Cấu hình giờ gửi và mục tiêu để bot nhắc học đúng nhịp.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-border rounded-[22px] p-8 bg-surface-muted/30">
            <p className="text-foreground font-black text-lg tracking-tight mb-1">Chưa có liên kết nào</p>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
              Hãy mở Telegram và gõ <span className="font-mono font-bold">/start</span> để lấy mã. Dán mã vào ô bên trên để liên kết.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {rows.map((r) => {
              const f = forms[r.provider] ?? {
                timezone: r.timezone,
                send_window: r.send_window,
                daily_goal: String(r.daily_goal),
              };
              return (
                <li key={r.provider} className="border border-border rounded-[22px] bg-surface-muted/30 overflow-hidden">
                  <div className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className="font-black text-lg tracking-tight">{providerLabel(r.provider)}</p>
                        <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-surface text-muted-foreground">
                          Active
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[0.85rem] font-medium mb-1.5 text-muted-foreground">
                          <span>Tiến độ hôm nay</span>
                          <span className="font-mono font-bold text-foreground">
                            {r.sent_today ?? 0}/{r.daily_goal}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width] duration-400 ease-in-out bg-gradient-to-r from-secondary to-[#34d399]"
                            style={{ width: `${Math.round(sentRatio(r) * 100)}%` }}
                          />
                        </div>
                        {r.sent_today_date ? (
                          <p className="text-[11px] text-muted-foreground font-mono mt-1">({r.sent_today_date})</p>
                        ) : null}
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-muted-foreground">
                        <p className="font-mono">user_id: {r.provider_user_id}</p>
                        {r.dm_chat_id ? (
                          <p className="font-mono">chat_id: {r.dm_chat_id}</p>
                        ) : (
                          <p className="text-amber-600 dark:text-amber-400 font-medium">
                            Chưa có chat_id — gõ /start lại trên Telegram rồi liên kết mã mới.
                          </p>
                        )}
                        {r.last_sent_at ? (
                          <p>Lần gửi gần nhất: {new Date(r.last_sent_at).toLocaleString("vi-VN")}</p>
                        ) : (
                          <p>Chưa gửi lần nào</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <button
                        type="button"
                        onClick={() => void onUnlink(r.provider)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-danger bg-[#fff1f2] dark:bg-danger/10 border border-danger/15 font-bold hover:-translate-y-px active:translate-y-0 transition-all text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hủy liên kết
                      </button>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="grid md:grid-cols-4 gap-3">
                      <label className="flex flex-col gap-1.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Múi giờ
                        <input
                          value={f.timezone}
                          onChange={(e) => updateForm(r.provider, { timezone: e.target.value })}
                          className="px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:border-primary transition-colors text-sm font-semibold normal-case text-foreground"
                          placeholder="Asia/Ho_Chi_Minh"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Khung giờ (HH:MM-HH:MM)
                        <input
                          value={f.send_window}
                          onChange={(e) => updateForm(r.provider, { send_window: e.target.value })}
                          className={cn(
                            "px-4 py-3 rounded-xl border bg-surface outline-none focus:border-primary transition-colors text-sm font-semibold normal-case text-foreground font-mono",
                            SEND_WINDOW_RE.test(f.send_window.trim()) ? "border-border" : "border-amber-500"
                          )}
                          placeholder="19:00-22:00"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Mục tiêu mỗi ngày
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={f.daily_goal}
                          onChange={(e) => updateForm(r.provider, { daily_goal: e.target.value })}
                          className="px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:border-primary transition-colors text-sm font-semibold normal-case text-foreground"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                        Group chat id (weekly report)
                        <input
                          defaultValue={r.group_target_id ?? ""}
                          onBlur={(e) => {
                            const v = e.currentTarget.value.trim();
                            void updateIntegration(r.provider, { group_target_id: v || undefined })
                              .then(() => load())
                              .catch((er) => setErr(er instanceof Error ? er.message : "Không lưu được."));
                          }}
                          className="px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:border-primary transition-colors text-sm font-semibold normal-case text-foreground font-mono"
                          placeholder="-100xxxxxxxxxx"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Bot sẽ gửi tối đa <span className="font-mono font-bold text-foreground">{r.daily_goal}</span> thẻ/ngày trong khung giờ trên.
                      </p>
                      <button
                        type="button"
                        disabled={saving === r.provider}
                        onClick={() => void onSave(r.provider)}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-0 font-bold text-[0.92rem] transition-all text-white bg-foreground shadow-xs hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {saving === r.provider ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Lưu cấu hình
                      </button>
                    </div>
                  </div>

                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
