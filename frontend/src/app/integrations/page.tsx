"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import AppShell from "../../components/AppShell";
import {
  ChatIntegrationDTO,
  Deck,
  IngestionRunDTO,
  IngestionSourceDTO,
  createIngestionSource,
  deleteIngestionSource,
  deleteIntegration,
  fetchDecks,
  fetchIngestionRuns,
  fetchIngestionSources,
  fetchIntegrations,
  fetchTelegramBotMeta,
  getStoredTokens,
  getStoredUser,
  linkIntegration,
  syncIngestionSource,
  testSendDueCards,
  testWeeklyReport,
  updateIngestionSource,
  updateIntegration,
  useClientReady,
  User,
} from "../../lib/app-client";
import { BookMarked, Link2, Loader2, RefreshCw, Rss, Send, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import QRCode from "qrcode";

const SEND_WINDOW_RE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

function providerLabel(p: string) {
  if (p === "telegram") return "Telegram";
  if (p === "rss") return "RSS / News";
  if (p === "notion") return "Notion";
  if (p === "obsidian") return "Obsidian";
  if (p === "roam") return "Roam";
  return p;
}

type FormRow = { timezone: string; send_window: string; daily_goal: string };

type SourceForm = {
  name: string;
  source_url: string;
  target_deck_id: string;
  frequency_minutes: string;
  cards_per_item: string;
  auto_tag: boolean;
  sync_mode: string;
};

const INITIAL_SOURCE_FORM: SourceForm = {
  name: "",
  source_url: "",
  target_deck_id: "",
  frequency_minutes: "360",
  cards_per_item: "6",
  auto_tag: true,
  sync_mode: "one_way",
};

export default function IntegrationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const clientReady = useClientReady();

  const [rows, setRows] = useState<ChatIntegrationDTO[]>([]);
  const [forms, setForms] = useState<Record<string, FormRow>>({});
  const [code, setCode] = useState("");

  const [sources, setSources] = useState<IngestionSourceDTO[]>([]);
  const [runs, setRuns] = useState<Record<number, IngestionRunDTO[]>>({});
  const [decks, setDecks] = useState<Deck[]>([]);
  const [sourceForm, setSourceForm] = useState<SourceForm>(INITIAL_SOURCE_FORM);
  const [sourceProvider, setSourceProvider] = useState("rss");

  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [creatingSource, setCreatingSource] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrErr, setQrErr] = useState<string | null>(null);

  const loadTelegram = useCallback(async () => {
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
  }, []);

  const loadIngestion = useCallback(async () => {
    const [sourceRows, deckRows] = await Promise.all([
      fetchIngestionSources(),
      user ? fetchDecks(user.id) : Promise.resolve([] as Deck[]),
    ]);
    setSources(sourceRows);
    setDecks(deckRows);

    const runPairs = await Promise.all(
      sourceRows.map(async (source) => ({
        sourceId: source.id,
        runs: await fetchIngestionRuns(source.id).catch(() => [] as IngestionRunDTO[]),
      }))
    );
    const nextRuns: Record<number, IngestionRunDTO[]> = {};
    for (const pair of runPairs) nextRuns[pair.sourceId] = pair.runs;
    setRuns(nextRuns);
  }, [user]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      await Promise.all([loadTelegram(), loadIngestion()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong tai duoc integrations.");
    } finally {
      setLoading(false);
    }
  }, [loadIngestion, loadTelegram]);

  useEffect(() => {
    if (!clientReady) return;
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
  }, [clientReady, router]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  useEffect(() => {
    if (!clientReady) return;
    setQrErr(null);
    void fetchTelegramBotMeta()
      .then(async (meta) => {
        setBotUrl(meta.url);
        setBotUsername(meta.username);
        const url = await QRCode.toDataURL(meta.url, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
        });
        setQrDataUrl(url);
      })
      .catch((e) => {
        setQrErr(e instanceof Error ? e.message : "Không tải được QR bot.");
      });
  }, [clientReady]);

  const onLink = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      setErr("Nhap ma tu Telegram.");
      return;
    }
    setLinking(true);
    setErr(null);
    setMsg(null);
    try {
      await linkIntegration(c);
      setCode("");
      setMsg("Lien ket thanh cong.");
      await loadTelegram();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lien ket that bai.");
    } finally {
      setLinking(false);
    }
  };

  const onSave = async (provider: string) => {
    const f = forms[provider];
    if (!f) return;
    if (!SEND_WINDOW_RE.test(f.send_window.trim())) {
      setErr("Khung gio phai co dang HH:MM-HH:MM.");
      return;
    }
    const dg = parseInt(f.daily_goal, 10);
    if (Number.isNaN(dg) || dg < 1 || dg > 500) {
      setErr("Muc tieu moi ngay phai tu 1 den 500.");
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
      setMsg("Da luu cau hinh Telegram.");
      await loadTelegram();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong luu duoc.");
    } finally {
      setSaving(null);
    }
  };

  const onUnlink = async (provider: string) => {
    if (!window.confirm(`Huy lien ket ${providerLabel(provider)}?`)) return;
    setErr(null);
    setMsg(null);
    try {
      await deleteIntegration(provider);
      setMsg("Da huy lien ket.");
      await loadTelegram();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong huy duoc.");
    }
  };

  const onTestWeekly = async () => {
    setErr(null);
    setMsg(null);
    try {
      await testWeeklyReport();
      setMsg("Da gui test weekly report.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong gui duoc weekly report.");
    }
  };

  const onTestDue = async () => {
    setErr(null);
    setMsg(null);
    try {
      await testSendDueCards();
      setMsg("Da gui test the den han.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong gui duoc the den han.");
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

  const createSource = async () => {
    if (!sourceForm.name.trim()) {
      setErr("Nhap ten source.");
      return;
    }
    if (sourceProvider === "rss" && !sourceForm.source_url.trim()) {
      setErr("RSS source can source_url.");
      return;
    }
    const frequency = parseInt(sourceForm.frequency_minutes, 10);
    const cardsPerItem = parseInt(sourceForm.cards_per_item, 10);
    const deckId = sourceForm.target_deck_id ? parseInt(sourceForm.target_deck_id, 10) : undefined;
    setCreatingSource(true);
    setErr(null);
    setMsg(null);
    try {
      await createIngestionSource({
        provider: sourceProvider,
        name: sourceForm.name.trim(),
        source_url: sourceForm.source_url.trim() || undefined,
        target_deck_id: deckId,
        auto_tag: sourceForm.auto_tag,
        frequency_minutes: frequency,
        cards_per_item: cardsPerItem,
        sync_mode: sourceForm.sync_mode,
        config:
          sourceProvider === "rss"
            ? {}
            : {
                status: "scaffolded",
                note: `${providerLabel(sourceProvider)} adapter chua duoc implement day du trong MVP nay.`,
              },
      });
      setSourceForm(INITIAL_SOURCE_FORM);
      setSourceProvider("rss");
      setMsg("Da tao ingestion source.");
      await loadIngestion();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong tao duoc ingestion source.");
    } finally {
      setCreatingSource(false);
    }
  };

  const updateSource = async (source: IngestionSourceDTO, patch: Partial<SourceForm>) => {
    const merged = {
      name: patch.name ?? source.name,
      source_url: patch.source_url ?? (source.source_url ?? ""),
      target_deck_id: patch.target_deck_id ?? String(source.target_deck_id ?? ""),
      frequency_minutes: patch.frequency_minutes ?? String(source.frequency_minutes),
      cards_per_item: patch.cards_per_item ?? String(source.cards_per_item),
      auto_tag: patch.auto_tag ?? source.auto_tag,
      sync_mode: patch.sync_mode ?? source.sync_mode,
    };
    setErr(null);
    try {
      await updateIngestionSource(source.id, {
        name: merged.name.trim(),
        source_url: merged.source_url.trim() || undefined,
        target_deck_id: merged.target_deck_id ? parseInt(merged.target_deck_id, 10) : undefined,
        frequency_minutes: parseInt(merged.frequency_minutes, 10),
        cards_per_item: parseInt(merged.cards_per_item, 10),
        auto_tag: merged.auto_tag,
        sync_mode: merged.sync_mode,
      });
      await loadIngestion();
      setMsg("Da cap nhat ingestion source.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong cap nhat duoc ingestion source.");
    }
  };

  const removeSource = async (sourceId: number) => {
    if (!window.confirm("Xoa ingestion source nay?")) return;
    setErr(null);
    try {
      await deleteIngestionSource(sourceId);
      await loadIngestion();
      setMsg("Da xoa ingestion source.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Khong xoa duoc ingestion source.");
    }
  };

  const runSync = async (sourceId: number, previewOnly: boolean) => {
    setSyncing(sourceId);
    setErr(null);
    setMsg(null);
    try {
      const result = await syncIngestionSource(sourceId, previewOnly);
      setMsg(
        previewOnly
          ? `Preview sync xong: ${result.preview_cards} cards duoc tao tam.`
          : `Sync xong: fetched ${result.fetched_count}, tao ${result.created_count} cards.`
      );
      await loadIngestion();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sync that bai.");
    } finally {
      setSyncing(null);
    }
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
        <h1 className="text-[clamp(1.65rem,3.8vw,2.25rem)] font-bold tracking-tight mb-2 flex items-center gap-3">
          <Link2 className="w-8 h-8 text-primary" />
          Integrations
        </h1>
        <p className="text-muted-foreground text-[0.95rem] max-w-2xl leading-relaxed">
          Telegram giup nhac hoc. Knowledge ingestion bien RSS, notes va second-brain sources thanh flashcards.
          MVP nay uu tien RSS chay that, con Notion va Obsidian duoc scaffold de noi tiep.
        </p>
      </div>
      {msg && (
        <p className="mb-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-2xl px-4 py-3">
          {msg}
        </p>
      )}
      {err && (
        <p className="mb-4 text-sm font-semibold text-destructive border border-destructive/30 bg-destructive/10 rounded-2xl px-4 py-3">
          {err}
        </p>
      )}

      <Tabs.Root defaultValue="telegram" className="space-y-6">
        <Tabs.List className="inline-flex rounded-2xl border border-border bg-surface-raised p-1">
          <Tabs.Trigger
            value="telegram"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            Telegram
          </Tabs.Trigger>
          <Tabs.Trigger
            value="ingestion"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            Knowledge Ingestion
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="telegram" className="space-y-6">
          <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mở bot nhanh
                </p>
                <h2 className="text-lg font-semibold tracking-tight">Quét QR để mở bot trên Telegram</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Quét QR bằng camera hoặc Telegram. Nếu bạn dùng desktop, có thể bấm nút “Mở bot” để đi thẳng tới chat.
                </p>
                {botUsername ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    Bot: <span className="font-mono font-semibold text-foreground">@{botUsername}</span>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!botUrl}
                    onClick={() => {
                      if (botUrl) window.open(botUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Mở bot trên Telegram
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!botUrl}
                    onClick={async () => {
                      if (!botUrl) return;
                      try {
                        await navigator.clipboard.writeText(botUrl);
                        setMsg("Đã copy link bot.");
                      } catch {
                        setErr("Không copy được link. Hãy copy thủ công.");
                      }
                    }}
                  >
                    Copy link bot
                  </Button>
                </div>
                {qrErr ? (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Không tải được QR/link bot tự động. Bạn vẫn có thể tìm bot trong Telegram và gõ /start.
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 self-start">
                <div className="rounded-2xl border border-border bg-[hsl(var(--acrylic))] backdrop-blur-md p-3 w-[176px]">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR code mở bot Telegram"
                      className="w-full h-auto rounded-xl"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-xl bg-surface-muted flex items-center justify-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Buoc 1
                </p>
                <h2 className="text-lg font-semibold tracking-tight">Nhap ma lien ket</h2>
              </div>
              <p className="text-xs text-muted-foreground">Dung bot Telegram de link tai khoan va bat study nudges.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 border border-border/70 bg-[hsl(var(--acrylic))] backdrop-blur-md rounded-xl p-1 shadow-sm">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
                  placeholder="VD: CP94N78Y"
                  className="w-full bg-transparent border-none outline-none px-3 py-2.5 text-foreground text-sm font-mono tracking-[0.35em] placeholder:tracking-normal"
                  maxLength={12}
                  disabled={linking}
                />
              </div>
              <Button type="button" variant="primary" onClick={() => void onLink()} disabled={linking || !code.trim()}>
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Lien ket
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Buoc 2</p>
                <h2 className="text-lg font-semibold tracking-tight">Da lien ket</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void onTestWeekly()}>
                  Test weekly report
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => void onTestDue()}>
                  Test gui the
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="border border-dashed border-border/80 rounded-2xl p-8 bg-[hsl(var(--acrylic))] backdrop-blur-md">
                <p className="text-foreground font-semibold text-lg tracking-tight mb-1">Chua co lien ket nao</p>
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
                    <li
                      key={r.provider}
                      className="border border-border rounded-2xl bg-[hsl(var(--acrylic-strong))] backdrop-blur-md overflow-hidden shadow-sm"
                    >
                      <div className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="font-semibold text-lg tracking-tight">{providerLabel(r.provider)}</p>
                            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border/70 bg-[hsl(var(--acrylic))] text-muted-foreground">
                              Active
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[0.85rem] font-medium mb-1.5 text-muted-foreground">
                              <span>Tien do hom nay</span>
                              <span className="font-mono font-bold text-foreground">
                                {r.sent_today ?? 0}/{r.daily_goal}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-[width] duration-400 ease-in-out bg-[linear-gradient(90deg,hsl(var(--primary))_0%,hsl(var(--success))_100%)]"
                                style={{ width: `${Math.round(sentRatio(r) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          <Button type="button" size="sm" variant="danger" onClick={() => void onUnlink(r.provider)}>
                            <Trash2 className="w-4 h-4" />
                            Huy lien ket
                          </Button>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <div className="grid md:grid-cols-4 gap-3">
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Mui gio
                            <Input
                              value={f.timezone}
                              onChange={(e) => updateForm(r.provider, { timezone: e.target.value })}
                              className="font-medium"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Khung gio
                            <Input
                              value={f.send_window}
                              onChange={(e) => updateForm(r.provider, { send_window: e.target.value })}
                              className={cn(
                                "font-mono",
                                SEND_WINDOW_RE.test(f.send_window.trim()) ? "" : "border-amber-500"
                              )}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Muc tieu moi ngay
                            <Input
                              type="number"
                              min={1}
                              max={500}
                              value={f.daily_goal}
                              onChange={(e) => updateForm(r.provider, { daily_goal: e.target.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Group chat id
                            <Input
                              defaultValue={r.group_target_id ?? ""}
                              onBlur={(e) => {
                                const v = e.currentTarget.value.trim();
                                void updateIntegration(r.provider, { group_target_id: v || undefined })
                                  .then(() => loadTelegram())
                                  .catch((er) => setErr(er instanceof Error ? er.message : "Khong luu duoc."));
                              }}
                              className="font-mono"
                              placeholder="-100xxxxxxxxxx"
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button type="button" variant="secondary" disabled={saving === r.provider} onClick={() => void onSave(r.provider)}>
                            {saving === r.provider ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Luu cau hinh
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Tabs.Content>

        <Tabs.Content value="ingestion" className="space-y-6">
          <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">MVP</p>
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-primary" />
                  Multi-Source Knowledge Ingestion
                </h2>
              </div>
              <div className="text-xs text-muted-foreground max-w-md">
                RSS sync chay that. Notion va Obsidian duoc scaffold de mo rong tiep theo huong pilot, khong gia lap OAuth hay two-way sync.
              </div>
            </div>

            <div className="grid lg:grid-cols-6 gap-3">
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide lg:col-span-1">
                Provider
                <select
                  value={sourceProvider}
                  onChange={(e) => setSourceProvider(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="rss">RSS</option>
                  <option value="notion">Notion</option>
                  <option value="obsidian">Obsidian</option>
                  <option value="roam">Roam</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide lg:col-span-2">
                Name
                <Input value={sourceForm.name} onChange={(e) => setSourceForm((prev) => ({ ...prev, name: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide lg:col-span-3">
                Source URL / Endpoint
                <Input
                  value={sourceForm.source_url}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, source_url: e.target.value }))}
                  placeholder={sourceProvider === "rss" ? "https://example.com/rss.xml" : "Optional for scaffold"}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide lg:col-span-2">
                Target deck
                <select
                  value={sourceForm.target_deck_id}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, target_deck_id: e.target.value }))}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Chon deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={String(deck.id)}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Frequency (min)
                <Input
                  type="number"
                  value={sourceForm.frequency_minutes}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, frequency_minutes: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Cards / item
                <Input
                  type="number"
                  value={sourceForm.cards_per_item}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, cards_per_item: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Sync mode
                <select
                  value={sourceForm.sync_mode}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, sync_mode: e.target.value }))}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="one_way">one_way</option>
                  <option value="two_way">two_way</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground pt-7">
                <input
                  type="checkbox"
                  checked={sourceForm.auto_tag}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, auto_tag: e.target.checked }))}
                />
                Auto-tag by topic
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" variant="primary" disabled={creatingSource} onClick={() => void createSource()}>
                {creatingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
                Tao source
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
                <h2 className="text-lg font-semibold tracking-tight">RSS, Notion, Obsidian</h2>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : sources.length === 0 ? (
              <div className="border border-dashed border-border/80 rounded-2xl p-8 bg-[hsl(var(--acrylic))] backdrop-blur-md">
                <p className="text-foreground font-semibold text-lg tracking-tight mb-1">Chua co ingestion source nao</p>
                <p className="text-muted-foreground text-sm">Tao RSS source truoc. Notion va Obsidian se di tiep sau khi chot adapter.</p>
              </div>
            ) : (
              <ul className="space-y-5">
                {sources.map((source) => {
                  const latestRun = (runs[source.id] ?? [])[0];
                  return (
                    <li
                      key={source.id}
                      className="border border-border rounded-2xl bg-[hsl(var(--acrylic-strong))] backdrop-blur-md overflow-hidden shadow-sm"
                    >
                      <div className="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="font-semibold text-lg tracking-tight">{source.name}</p>
                            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border/70 bg-[hsl(var(--acrylic))] text-muted-foreground">
                              {providerLabel(source.provider)}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border/70 bg-background text-muted-foreground">
                              {source.status}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            <p>Deck dich: {decks.find((d) => d.id === source.target_deck_id)?.name ?? "Chua chon"}</p>
                            <p>Lan sync cuoi: {source.last_synced_at ? new Date(source.last_synced_at).toLocaleString("vi-VN") : "Chua sync"}</p>
                            {source.source_url ? <p className="font-mono break-all">{source.source_url}</p> : null}
                            {source.last_error ? <p className="text-destructive">{source.last_error}</p> : null}
                            {source.provider !== "rss" ? (
                              <p className="text-amber-600 dark:text-amber-400">
                                Provider nay moi o muc scaffold. OAuth/plugin sync chua duoc implement trong MVP.
                              </p>
                            ) : null}
                          </div>
                          {latestRun ? (
                            <div className="mt-3 text-xs text-muted-foreground font-mono">
                              Run gan nhat: {latestRun.status} | fetched {latestRun.fetched_count} | normalized {latestRun.normalized_count} | created {latestRun.created_count}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-start">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={syncing === source.id}
                            onClick={() => void runSync(source.id, true)}
                          >
                            {syncing === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Preview
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={syncing === source.id || !source.target_deck_id}
                            onClick={() => void runSync(source.id, false)}
                          >
                            {syncing === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                            Sync now
                          </Button>
                          <Button type="button" size="sm" variant="danger" onClick={() => void removeSource(source.id)}>
                            <Trash2 className="w-4 h-4" />
                            Xoa
                          </Button>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <div className="grid md:grid-cols-5 gap-3">
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide md:col-span-2">
                            Name
                            <Input
                              defaultValue={source.name}
                              onBlur={(e) => void updateSource(source, { name: e.currentTarget.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide md:col-span-3">
                            Source URL
                            <Input
                              defaultValue={source.source_url ?? ""}
                              onBlur={(e) => void updateSource(source, { source_url: e.currentTarget.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Deck
                            <select
                              defaultValue={String(source.target_deck_id ?? "")}
                              onChange={(e) => void updateSource(source, { target_deck_id: e.currentTarget.value })}
                              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                            >
                              <option value="">Chon deck</option>
                              {decks.map((deck) => (
                                <option key={deck.id} value={String(deck.id)}>
                                  {deck.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Frequency
                            <Input
                              type="number"
                              defaultValue={String(source.frequency_minutes)}
                              onBlur={(e) => void updateSource(source, { frequency_minutes: e.currentTarget.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Cards / item
                            <Input
                              type="number"
                              defaultValue={String(source.cards_per_item)}
                              onBlur={(e) => void updateSource(source, { cards_per_item: e.currentTarget.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Sync mode
                            <select
                              defaultValue={source.sync_mode}
                              onChange={(e) => void updateSource(source, { sync_mode: e.currentTarget.value })}
                              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                            >
                              <option value="one_way">one_way</option>
                              <option value="two_way">two_way</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-foreground pt-7">
                            <input
                              type="checkbox"
                              defaultChecked={source.auto_tag}
                              onChange={(e) => void updateSource(source, { auto_tag: e.currentTarget.checked })}
                            />
                            Auto-tag
                          </label>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Tabs.Content>
      </Tabs.Root>
    </AppShell>
  );
}
