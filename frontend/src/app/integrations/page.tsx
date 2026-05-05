"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import QRCode from "qrcode";
import { BookMarked, Link2, Loader2, Send, Trash2 } from "lucide-react";

import AppShell from "../../components/AppShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  ChatIntegrationDTO,
  Deck,
  disconnectNotion,
  fetchDecks,
  fetchIngestionRuns,
  fetchIngestionSources,
  fetchIntegrations,
  fetchNotionPages,
  fetchNotionStatus,
  fetchTelegramBotMeta,
  getNotionConnectUrl,
  getStoredTokens,
  getStoredUser,
  IngestionRunDTO,
  IngestionSourceDTO,
  linkIntegration,
  NotionConnectionStatusDTO,
  NotionPageDTO,
  syncIngestionSource,
  testSendDueCards,
  testWeeklyReport,
  updateIngestionSource,
  updateIntegration,
  useClientReady,
  User,
  createNotionIngestionSource,
  deleteIngestionSource,
  deleteIntegration,
} from "../../lib/app-client";

const SEND_WINDOW_RE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

function providerLabel(p: string) {
  if (p === "telegram") return "Telegram";
  if (p === "notion") return "Notion";
  return p;
}

type FormRow = { timezone: string; send_window: string; daily_goal: string };

type NotionForm = {
  page_id: string;
  target_deck_id: string;
};

const INITIAL_NOTION_FORM: NotionForm = {
  page_id: "",
  target_deck_id: "",
};

export default function IntegrationsPage() {
  const router = useRouter();
  const clientReady = useClientReady();
  const [user, setUser] = useState<User | null>(null);

  const [rows, setRows] = useState<ChatIntegrationDTO[]>([]);
  const [forms, setForms] = useState<Record<string, FormRow>>({});
  const [code, setCode] = useState("");

  const [sources, setSources] = useState<IngestionSourceDTO[]>([]);
  const [runs, setRuns] = useState<Record<number, IngestionRunDTO[]>>({});
  const [decks, setDecks] = useState<Deck[]>([]);

  const [notionStatus, setNotionStatus] = useState<NotionConnectionStatusDTO>({ connected: false });
  const [notionPages, setNotionPages] = useState<NotionPageDTO[]>([]);
  const [notionForm, setNotionForm] = useState<NotionForm>(INITIAL_NOTION_FORM);

  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [disconnectingNotion, setDisconnectingNotion] = useState(false);
  const [loadingNotionPages, setLoadingNotionPages] = useState(false);
  const [creatingNotionCards, setCreatingNotionCards] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrErr, setQrErr] = useState<string | null>(null);

  const loadTelegram = useCallback(async () => {
    const data = await fetchIntegrations();
    setRows(data);
    const nextForms: Record<string, FormRow> = {};
    for (const row of data) {
      nextForms[row.provider] = {
        timezone: row.timezone,
        send_window: row.send_window,
        daily_goal: String(row.daily_goal),
      };
    }
    setForms(nextForms);
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
    for (const pair of runPairs) {
      nextRuns[pair.sourceId] = pair.runs;
    }
    setRuns(nextRuns);
  }, [user]);

  const loadNotion = useCallback(async () => {
    const status = await fetchNotionStatus();
    setNotionStatus(status);
    if (!status.connected) {
      setNotionPages([]);
      return;
    }

    setLoadingNotionPages(true);
    try {
      const pages = await fetchNotionPages();
      setNotionPages(pages);
      setNotionForm((prev) => ({
        ...prev,
        page_id: prev.page_id || (pages[0]?.id ?? ""),
      }));
    } finally {
      setLoadingNotionPages(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      await Promise.all([loadTelegram(), loadIngestion(), loadNotion()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được integrations.");
    } finally {
      setLoading(false);
    }
  }, [loadIngestion, loadNotion, loadTelegram]);

  useEffect(() => {
    if (!clientReady) return;
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (!getStoredTokens()) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
  }, [clientReady, router]);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user, loadAll]);

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

  useEffect(() => {
    if (!clientReady) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("provider") !== "notion") return;
    const status = params.get("status");
    const message = params.get("message");
    if (status === "success") {
      setMsg("Đã kết nối Notion.");
      void loadNotion();
    } else if (status === "error") {
      setErr(message || "Kết nối Notion thất bại.");
    }
    window.history.replaceState({}, "", "/integrations");
  }, [clientReady, loadNotion]);

  const onLink = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setErr("Nhập mã từ Telegram.");
      return;
    }
    setLinking(true);
    setErr(null);
    setMsg(null);
    try {
      await linkIntegration(normalized);
      setCode("");
      setMsg("Liên kết thành công.");
      await loadTelegram();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Liên kết thất bại.");
    } finally {
      setLinking(false);
    }
  };

  const onSave = async (provider: string) => {
    const form = forms[provider];
    if (!form) return;
    if (!SEND_WINDOW_RE.test(form.send_window.trim())) {
      setErr("Khung giờ phải có dạng HH:MM-HH:MM.");
      return;
    }
    const dailyGoal = parseInt(form.daily_goal, 10);
    if (Number.isNaN(dailyGoal) || dailyGoal < 1 || dailyGoal > 500) {
      setErr("Mục tiêu mỗi ngày phải từ 1 đến 500.");
      return;
    }

    setSaving(provider);
    setErr(null);
    setMsg(null);
    try {
      await updateIntegration(provider, {
        timezone: form.timezone.trim(),
        send_window: form.send_window.trim(),
        daily_goal: dailyGoal,
      });
      setMsg("Đã lưu cấu hình Telegram.");
      await loadTelegram();
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
      await loadTelegram();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không hủy được.");
    }
  };

  const onTestWeekly = async () => {
    setErr(null);
    setMsg(null);
    try {
      await testWeeklyReport();
      setMsg("Đã gửi test weekly report.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không gửi được weekly report.");
    }
  };

  const onTestDue = async () => {
    setErr(null);
    setMsg(null);
    try {
      await testSendDueCards();
      setMsg("Đã gửi test thẻ đến hạn.");
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

  const sentRatio = (row: ChatIntegrationDTO) => {
    const goal = Math.max(Number(row.daily_goal ?? 0), 0);
    if (goal <= 0) return 0;
    const sent = Math.max(Number(row.sent_today ?? 0), 0);
    return Math.min(1, sent / goal);
  };

  const connectNotion = async () => {
    setConnectingNotion(true);
    setErr(null);
    try {
      const connectUrl = await getNotionConnectUrl();
      window.location.href = connectUrl;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tạo được Notion connect URL.");
      setConnectingNotion(false);
    }
  };

  const unlinkNotion = async () => {
    if (!window.confirm("Ngắt kết nối Notion?")) return;
    setDisconnectingNotion(true);
    setErr(null);
    try {
      await disconnectNotion();
      setNotionStatus({ connected: false });
      setNotionPages([]);
      setNotionForm(INITIAL_NOTION_FORM);
      setMsg("Đã ngắt kết nối Notion.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không ngắt được Notion.");
    } finally {
      setDisconnectingNotion(false);
    }
  };

  const createNotionCardsFromPage = async () => {
    if (!notionForm.page_id) {
      setErr("Chọn một trang Notion.");
      return;
    }
    if (!notionForm.target_deck_id) {
      setErr("Chọn bộ thẻ để lưu flashcard.");
      return;
    }

    const targetDeckId = notionForm.target_deck_id ? parseInt(notionForm.target_deck_id, 10) : undefined;
    const selectedPage = notionPages.find((page) => page.id === notionForm.page_id);

    setCreatingNotionCards(true);
    setErr(null);
    setMsg(null);
    try {
      const source = await createNotionIngestionSource({
        page_id: notionForm.page_id,
        name: selectedPage?.title,
        target_deck_id: targetDeckId,
      });
      const result = await syncIngestionSource(source.id, false);
      setNotionForm(INITIAL_NOTION_FORM);
      setMsg(`Đã tạo ${result.created_count} flashcard từ Notion. Bạn có thể mở bộ thẻ để bắt đầu học ngay.`);
      await loadIngestion();
      await loadNotion();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không thể tạo flashcard từ Notion.");
    } finally {
      setCreatingNotionCards(false);
    }
  };

  const removeSource = async (sourceId: number) => {
    if (!window.confirm("Xoá kết nối nội dung này?")) return;
    setErr(null);
    try {
      await deleteIngestionSource(sourceId);
      await loadIngestion();
      setMsg("Đã xoá kết nối Notion.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không xoá được kết nối Notion.");
    }
  };

  const runCreateCardsAgain = async (sourceId: number) => {
    setSyncing(sourceId);
    setErr(null);
    setMsg(null);
    try {
      const result = await syncIngestionSource(sourceId, false);
      setMsg(`Đã tạo ${result.created_count} flashcard từ nội dung Notion mới nhất.`);
      await loadIngestion();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không thể lấy nội dung từ Notion.");
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
          Tích hợp
        </h1>
        <p className="text-muted-foreground text-[0.95rem] max-w-2xl leading-relaxed">
          Telegram giúp nhắc học. Notion giúp đưa nội dung bạn đang học thành flashcard để ôn tập và ghi nhớ lâu hơn.
        </p>
      </div>

      {msg ? (
        <p className="mb-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-2xl px-4 py-3">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="mb-4 text-sm font-semibold text-destructive border border-destructive/30 bg-destructive/10 rounded-2xl px-4 py-3">
          {err}
        </p>
      ) : null}

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
            Notion
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="telegram" className="space-y-6">
          <section className="rounded-2xl border border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Mở bot nhanh</p>
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
                    <img src={qrDataUrl} alt="QR code mở bot Telegram" className="w-full h-auto rounded-xl" />
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
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Bước 1</p>
                <h2 className="text-lg font-semibold tracking-tight">Nhập mã liên kết</h2>
              </div>
              <p className="text-xs text-muted-foreground">Dùng bot Telegram để liên kết tài khoản và bật nhắc học.</p>
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
                Liên kết
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Bước 2</p>
                <h2 className="text-lg font-semibold tracking-tight">Đã liên kết</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void onTestWeekly()}>
                  Test weekly report
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => void onTestDue()}>
                  Test gửi thẻ
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="border border-dashed border-border/80 rounded-2xl p-8 bg-[hsl(var(--acrylic))] backdrop-blur-md">
                <p className="text-foreground font-semibold text-lg tracking-tight mb-1">Chưa có liên kết nào</p>
              </div>
            ) : (
              <ul className="space-y-5">
                {rows.map((row) => {
                  const form = forms[row.provider] ?? {
                    timezone: row.timezone,
                    send_window: row.send_window,
                    daily_goal: String(row.daily_goal),
                  };
                  return (
                    <li
                      key={row.provider}
                      className="border border-border rounded-2xl bg-[hsl(var(--acrylic-strong))] backdrop-blur-md overflow-hidden shadow-sm"
                    >
                      <div className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="font-semibold text-lg tracking-tight">{providerLabel(row.provider)}</p>
                            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border/70 bg-[hsl(var(--acrylic))] text-muted-foreground">
                              Đang hoạt động
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[0.85rem] font-medium mb-1.5 text-muted-foreground">
                              <span>Tiến độ hôm nay</span>
                              <span className="font-mono font-bold text-foreground">
                                {row.sent_today ?? 0}/{row.daily_goal}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-[width] duration-400 ease-in-out bg-[linear-gradient(90deg,hsl(var(--primary))_0%,hsl(var(--success))_100%)]"
                                style={{ width: `${Math.round(sentRatio(row) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          <Button type="button" size="sm" variant="danger" onClick={() => void onUnlink(row.provider)}>
                            <Trash2 className="w-4 h-4" />
                            Hủy liên kết
                          </Button>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <div className="grid md:grid-cols-4 gap-3">
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Múi giờ
                            <Input
                              value={form.timezone}
                              onChange={(e) => updateForm(row.provider, { timezone: e.target.value })}
                              className="font-medium"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Khung giờ
                            <Input
                              value={form.send_window}
                              onChange={(e) => updateForm(row.provider, { send_window: e.target.value })}
                              className={cn("font-mono", SEND_WINDOW_RE.test(form.send_window.trim()) ? "" : "border-amber-500")}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Mục tiêu mỗi ngày
                            <Input
                              type="number"
                              min={1}
                              max={500}
                              value={form.daily_goal}
                              onChange={(e) => updateForm(row.provider, { daily_goal: e.target.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Group chat id
                            <Input
                              defaultValue={row.group_target_id ?? ""}
                              onBlur={(e) => {
                                const value = e.currentTarget.value.trim();
                                void updateIntegration(row.provider, { group_target_id: value || undefined })
                                  .then(() => loadTelegram())
                                  .catch((apiError) => setErr(apiError instanceof Error ? apiError.message : "Không lưu được."));
                              }}
                              className="font-mono"
                              placeholder="-100xxxxxxxxxx"
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving === row.provider}
                            onClick={() => void onSave(row.provider)}
                          >
                            {saving === row.provider ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Lưu cấu hình
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
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Notion</p>
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-primary" />
                  Biến nội dung Notion thành flashcard
                </h2>
              </div>
              <div className="text-xs text-muted-foreground max-w-md">
                Memio sẽ đọc nội dung từ Notion và tự động tạo flashcard để bạn học và ghi nhớ lâu hơn.
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-border bg-background p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Bước 1</p>
                  <h3 className="text-base font-semibold tracking-tight">Kết nối Notion và chọn trang bạn muốn học</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                    Chọn một trang trong Notion, Memio sẽ đọc nội dung của trang đó và tạo flashcard để bạn học ngay trong ứng dụng.
                  </p>
                  {notionStatus.connected ? (
                    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                      Đã kết nối: {notionStatus.workspace_name || notionStatus.workspace_id || "Notion workspace"}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Chưa kết nối Notion.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!notionStatus.connected ? (
                    <Button type="button" variant="primary" disabled={connectingNotion} onClick={() => void connectNotion()}>
                      {connectingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                      Connect Notion
                    </Button>
                  ) : (
                    <Button type="button" variant="danger" disabled={disconnectingNotion} onClick={() => void unlinkNotion()}>
                      {disconnectingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>

              {notionStatus.connected ? (
                <>
                  <div className="mt-5 grid lg:grid-cols-5 gap-3">
                    <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide lg:col-span-2">
                      Trang Notion
                      <select
                        value={notionForm.page_id}
                        onChange={(e) => setNotionForm((prev) => ({ ...prev, page_id: e.target.value }))}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">{loadingNotionPages ? "Đang tải trang..." : "Chọn trang"}</option>
                        {notionPages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Bộ thẻ sẽ nhận nội dung này
                      <select
                        value={notionForm.target_deck_id}
                        onChange={(e) => setNotionForm((prev) => ({ ...prev, target_deck_id: e.target.value }))}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">Chọn bộ thẻ</option>
                        {decks.map((deck) => (
                          <option key={deck.id} value={String(deck.id)}>
                            {deck.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/70 bg-[hsl(var(--acrylic))] p-4 text-sm text-muted-foreground">
                    Sau khi tạo flashcard, nội dung từ Notion sẽ được chuyển vào bộ thẻ bạn chọn.
                    Bạn có thể mở bộ thẻ đó để học, ôn lại và theo dõi tiến độ ghi nhớ như các bộ thẻ khác trong Memio.
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={creatingNotionCards || !notionForm.page_id}
                      onClick={() => void createNotionCardsFromPage()}
                    >
                      {creatingNotionCards ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                      Tạo flashcard từ Notion
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Đã kết nối</p>
                <h2 className="text-lg font-semibold tracking-tight">Các trang Notion bạn đã dùng để tạo flashcard</h2>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : sources.filter((source) => source.provider === "notion").length === 0 ? (
              <div className="border border-dashed border-border/80 rounded-2xl p-8 bg-[hsl(var(--acrylic))] backdrop-blur-md">
                <p className="text-foreground font-semibold text-lg tracking-tight mb-1">Chưa có trang Notion nào được dùng</p>
                <p className="text-muted-foreground text-sm">Kết nối Notion, chọn một trang và tạo flashcard để bắt đầu học.</p>
              </div>
            ) : (
              <ul className="space-y-5">
                {sources.filter((source) => source.provider === "notion").map((source) => {
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
                            <p>Bộ thẻ đang nhận flashcard: {decks.find((d) => d.id === source.target_deck_id)?.name ?? "Chưa chọn"}</p>
                            <p>Lần lấy nội dung gần nhất: {source.last_synced_at ? new Date(source.last_synced_at).toLocaleString("vi-VN") : "Chưa có"}</p>
                            {source.source_url ? <p className="font-mono break-all">{source.source_url}</p> : null}
                            {source.last_error ? <p className="text-destructive">{source.last_error}</p> : null}
                            <p>Memio sẽ dùng nội dung này để tạo flashcard mới mỗi khi bạn muốn cập nhật lại bộ thẻ.</p>
                          </div>
                          {latestRun ? (
                            <div className="mt-3 text-xs text-muted-foreground font-mono">
                              Lần tạo gần nhất: {latestRun.created_count} flashcard
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-start">
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={syncing === source.id || !source.target_deck_id}
                            onClick={() => void runCreateCardsAgain(source.id)}
                          >
                            {syncing === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                            Tạo lại flashcard
                          </Button>
                          <Button type="button" size="sm" variant="danger" onClick={() => void removeSource(source.id)}>
                            <Trash2 className="w-4 h-4" />
                            Xoá
                          </Button>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <div className="grid md:grid-cols-2 gap-3">
                          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Bộ thẻ đích
                            <select
                              defaultValue={String(source.target_deck_id ?? "")}
                              onChange={(e) =>
                                void updateIngestionSource(source.id, {
                                  target_deck_id: e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : undefined,
                                })
                                  .then(() => loadIngestion())
                                  .catch((apiError) =>
                                    setErr(apiError instanceof Error ? apiError.message : "Không cập nhật được bộ thẻ.")
                                  )
                              }
                              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                            >
                              <option value="">Chọn bộ thẻ</option>
                              {decks.map((deck) => (
                                <option key={deck.id} value={String(deck.id)}>
                                  {deck.name}
                                </option>
                              ))}
                            </select>
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
