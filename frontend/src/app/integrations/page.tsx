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

  const updateForm = (provider: string, patch: Partial<FormRow>) => {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...patch },
    }));
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

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm mb-8">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4">Nhập mã</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
            placeholder="VD: CP94N78Y"
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface-muted outline-none focus:border-primary font-mono tracking-widest"
            maxLength={12}
            disabled={linking}
          />
          <button
            type="button"
            onClick={() => void onLink()}
            disabled={linking || !code.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
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

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-6">Đã liên kết</h2>
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có tích hợp nào. Hãy nhập mã từ Telegram ở trên.</p>
        ) : (
          <ul className="space-y-8">
            {rows.map((r) => {
              const f = forms[r.provider] ?? {
                timezone: r.timezone,
                send_window: r.send_window,
                daily_goal: String(r.daily_goal),
              };
              return (
                <li
                  key={r.provider}
                  className="border border-border rounded-2xl p-5 bg-surface-muted/40 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-lg">{providerLabel(r.provider)}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">user_id: {r.provider_user_id}</p>
                      {r.dm_chat_id ? (
                        <p className="text-xs text-muted-foreground font-mono">chat_id: {r.dm_chat_id}</p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                          Chưa có chat_id — gõ /start lại trên Telegram rồi liên kết mã mới.
                        </p>
                      )}
                      {r.last_sent_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Lần gửi gần nhất: {new Date(r.last_sent_at).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void onUnlink(r.provider)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hủy liên kết
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Múi giờ
                      <input
                        value={f.timezone}
                        onChange={(e) => updateForm(r.provider, { timezone: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm font-semibold normal-case text-foreground"
                        placeholder="Asia/Ho_Chi_Minh"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Khung giờ (HH:MM-HH:MM)
                      <input
                        value={f.send_window}
                        onChange={(e) => updateForm(r.provider, { send_window: e.target.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg border bg-surface text-sm font-semibold normal-case text-foreground font-mono",
                          SEND_WINDOW_RE.test(f.send_window.trim()) ? "border-border" : "border-amber-500"
                        )}
                        placeholder="19:00-22:00"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Mục tiêu mỗi ngày
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={f.daily_goal}
                        onChange={(e) => updateForm(r.provider, { daily_goal: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm font-semibold normal-case text-foreground"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={saving === r.provider}
                    onClick={() => void onSave(r.provider)}
                    className="px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {saving === r.provider ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Lưu cấu hình
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
