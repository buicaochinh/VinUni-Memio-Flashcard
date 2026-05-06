"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  createDeck,
  Deck,
  deleteDeck,
  disableDeckSharing,
  enableDeckSharing,
  fetchStudySummary,
  fetchDecks,
  getStoredUser,
  useClientReady,
  User,
} from "../../lib/app-client";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, FolderKanban, Link2, Plus, SlidersHorizontal, Sparkles, Trash, X, Lock, Globe2, Repeat } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import UserSettingsModal from "../../components/UserSettingsModal";

function shareUrl(token: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/deck/${token}`;
}

type StudySummary = Awaited<ReturnType<typeof fetchStudySummary>>;

export default function WorkspacePage() {
  const router = useRouter();
  const clientReady = useClientReady();
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<number, StudySummary | null>>({});
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [showReadyOnly, setShowReadyOnly] = useState(false);
  const [sort, setSort] = useState<"activity" | "name">("activity");
  const [shareModal, setShareModal] = useState<Deck | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const setRevealVars = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  useEffect(() => {
    if (!clientReady) return;
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void hydrate(storedUser.id);
  }, [clientReady, router]);

  const hydrate = async (userId: number) => {
    try {
      const d = await fetchDecks(userId);
      setDecks(d);
      const counts = await Promise.all(
        d.map(async (deck) => {
          try {
            const summary = await fetchStudySummary(deck.id, userId);
            return [deck.id, summary] as const;
          } catch {
            return [deck.id, null] as const;
          }
        })
      );
      setCardCounts(Object.fromEntries(counts));
    } catch {
      setMsg("Không tải được workspace. Hãy kiểm tra backend.");
    }
  };

  const totalCards = useMemo(() => Object.values(cardCounts).reduce((s, n) => s + (n?.total_cards ?? 0), 0), [cardCounts]);
  const readyDecks = useMemo(() => decks.filter((d) => {
    const sum = cardCounts[d.id];
    return sum && (sum.due_cards + sum.new_cards) > 0;
  }).length, [decks, cardCounts]);
  const maxCardsInAnyDeck = useMemo(() => {
    const vals = Object.values(cardCounts).map((s) => s?.total_cards ?? 0);
    return vals.length ? Math.max(...vals) : 0;
  }, [cardCounts]);
  const decksByActivity = useMemo(() => {
    return [...decks].sort((a, b) => {
      const suma = cardCounts[a.id];
      const sumb = cardCounts[b.id];
      const aDue = suma ? suma.due_cards + suma.new_cards : 0;
      const bDue = sumb ? sumb.due_cards + sumb.new_cards : 0;
      return bDue - aDue;
    });
  }, [decks, cardCounts]);
  const firstReadyDeckId = useMemo(() => {
    const d = decksByActivity.find((x) => {
      const sum = cardCounts[x.id];
      return sum && (sum.due_cards + sum.new_cards) > 0;
    });
    return d?.id ?? null;
  }, [decksByActivity, cardCounts]);
  const filteredDecks = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = sort === "activity"
      ? decksByActivity
      : [...decks].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "vi"));

    return base.filter((d) => {
      const sum = cardCounts[d.id];
      const due = sum ? sum.due_cards + sum.new_cards : 0;
      if (showReadyOnly && due <= 0) return false;
      if (!query) return true;
      const hay = `${d.name ?? ""} ${d.description ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q, sort, decks, decksByActivity, showReadyOnly, cardCounts]);

  const handleCreateDeck = async () => {
    if (!user || !newDeckName.trim()) return;
    setCreating(true);
    try {
      await createDeck(user.id, newDeckName.trim(), newDeckDesc.trim());
      setNewDeckName(""); setNewDeckDesc(""); setMsg(null);
      await hydrate(user.id);
    } catch {
      setMsg("Không tạo được deck.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeck = async (deckId: number) => {
    if (!confirm("Xóa deck này? Tất cả flashcards sẽ bị xóa.")) return;
    try {
      await deleteDeck(deckId);
      if (user) await hydrate(user.id);
    } catch {
      setMsg("Không xóa được deck.");
    }
  };

  const handleShare = async (deck: Deck) => {
    if (deck.share_token) {
      setShareModal(deck);
      return;
    }
    try {
      const token = await enableDeckSharing(deck.id);
      const updated = decks.map((d) => d.id === deck.id ? { ...d, share_token: token, is_public: 1 } : d);
      setDecks(updated);
      setShareModal({ ...deck, share_token: token, is_public: 1 });
    } catch {
      setMsg("Không kích hoạt được chia sẻ.");
    }
  };

  const handleUnshare = async (deckId: number) => {
    await disableDeckSharing(deckId).catch(() => {});
    const updated = decks.map((d) => d.id === deckId ? { ...d, share_token: undefined, is_public: 0 } : d);
    setDecks(updated);
    setShareModal(null);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(shareUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <AppShell user={user}>
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-background/55 backdrop-blur-xl",
          "shadow-[0_14px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_14px_50px_rgba(0,0,0,0.35)]",
          "before:pointer-events-none before:absolute before:inset-0 before:opacity-100",
          "before:bg-[radial-gradient(900px_circle_at_20%_-10%,hsl(var(--primary)/0.10),transparent_45%),radial-gradient(700px_circle_at_85%_0%,hsl(var(--primary)/0.06),transparent_40%)]"
        )}
      >
        <header className="px-6 sm:px-8 pt-7 pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-4xl">
              <p className="text-[0.8rem] font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-border/70">
                  <FolderKanban className="w-4 h-4 text-primary shrink-0" aria-hidden />
                </span>
                Bộ thẻ
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance mb-4">
                Xin chào, {user.name}
              </h1>
              <p className="text-muted-foreground text-[0.98rem] leading-relaxed">
                Tạo deck theo chủ đề, thêm tài liệu để sinh thẻ, rồi ôn đều mỗi ngày.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
              aria-label="Mở cài đặt học"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden />
              Cài đặt học
            </button>
          </div>
        </header>

        {/* Summary + Create */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] items-start gap-6 px-6 sm:px-8 pb-8">
        <section
          aria-label="Tóm tắt"
          className="self-start rounded-2xl ring-1 ring-border/80 bg-background/70 overflow-hidden shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { label: "Deck", value: decks.length, hint: "tổng số" },
              { label: "Flashcards", value: totalCards, hint: "đã tạo" },
              { label: "Sẵn sàng", value: readyDecks, hint: "deck có thẻ" },
            ].map((m) => (
              <div
                key={m.label}
                className="px-6 py-6 flex flex-col gap-2 hover:bg-muted/40 transition-colors duration-200"
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </p>
                <p className="text-2xl sm:text-[1.65rem] font-bold tabular-nums tracking-tight">
                  {m.value}
                </p>
                <p className="text-[0.8rem] text-muted-foreground leading-snug">{m.hint}</p>
              </div>
            ))}
          </div>
          <div className="px-6 py-5 border-t border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.82rem] font-semibold text-foreground">
                  Bước tiếp theo
                </p>
                <p className="text-[0.85rem] text-muted-foreground leading-relaxed">
                  {readyDecks > 0
                    ? "Bạn có deck đã sẵn sàng. Ôn một phiên ngắn để giữ nhịp."
                    : decks.length > 0
                      ? "Deck đang trống. Thêm tài liệu để sinh flashcards trước khi ôn."
                      : "Tạo deck đầu tiên, sau đó thêm tài liệu để sinh flashcards."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 border border-border bg-background/70 text-foreground font-semibold text-[0.9rem] hover:bg-muted/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-colors"
                  onClick={() => router.push("/generate")}
                >
                  <Sparkles className="w-4 h-4 text-primary" aria-hidden />
                  Tạo thẻ
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 font-semibold text-[0.9rem] text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => firstReadyDeckId ? router.push(`/study/${firstReadyDeckId}`) : (decks.length > 0 && router.push(`/study/${decks[0].id}`))}
                  disabled={decks.length === 0 || totalCards === 0}
                >
                  <Repeat className="w-4 h-4" aria-hidden />
                  Ôn nhanh
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Tạo deck mới"
          className="rounded-2xl border border-border/80 bg-background/70 px-6 py-6 shadow-sm"
        >
          <h2 className="text-base font-semibold tracking-tight mb-4">Tạo deck mới</h2>

          <div className="space-y-3">
            <label className="sr-only" htmlFor="new-deck-name">
              Tên deck
            </label>
            <Input
              id="new-deck-name"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Tên deck (ví dụ: IELTS Writing)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
            />
            <label className="sr-only" htmlFor="new-deck-desc">
              Mô tả deck
            </label>
            <Input
              id="new-deck-desc"
              value={newDeckDesc}
              onChange={(e) => setNewDeckDesc(e.target.value)}
              placeholder="Mô tả ngắn (tùy chọn)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
            />

            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={handleCreateDeck}
              onPointerMove={setRevealVars}
              disabled={creating || !newDeckName.trim()}
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" aria-hidden /> Tạo deck
                </>
              )}
            </Button>

            {msg && (
              <p className="text-danger text-[0.88rem] leading-[1.5]">{msg}</p>
            )}
          </div>
        </section>
        </section>
      </section>

      {/* Deck list */}
      <section className="rounded-2xl border border-border bg-background/70 backdrop-blur-md mt-6 shadow-[0_10px_36px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_36px_rgba(0,0,0,0.30)]">
        <div className="px-6 sm:px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg tracking-tight">Deck của bạn</h2>
            <p className="text-muted-foreground text-[0.9rem]">
              {decks.length === 0 ? "Chưa có deck nào. Tạo một deck để bắt đầu." : `${decks.length} deck`}
            </p>
          </div>
          <div className="text-[0.85rem] text-muted-foreground">
            {readyDecks} sẵn sàng
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="px-6 sm:px-8 py-10">
            <div className="rounded-2xl bg-muted/40 ring-1 ring-border/60 px-6 py-7 max-w-2xl">
              <p className="font-medium text-foreground mb-2">Bắt đầu từ một deck</p>
              <p className="text-muted-foreground text-[0.9rem] leading-relaxed">
                Đặt tên theo chủ đề bạn đang học. Sau đó sang “Tạo thẻ” để tải tài liệu và sinh flashcards.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="sr-only" htmlFor="deck-search">
                    Tìm deck
                  </label>
                  <Input
                    id="deck-search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm deck"
                    className="bg-background/70"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[0.9rem] font-semibold",
                      "ring-1 ring-border/80 bg-background/70 hover:bg-muted/35 transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
                      showReadyOnly ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => setShowReadyOnly((v) => !v)}
                    aria-pressed={showReadyOnly}
                  >
                    <SlidersHorizontal className="w-4 h-4" aria-hidden />
                    Sẵn sàng
                    {showReadyOnly && <Check className="w-4 h-4" aria-hidden />}
                  </button>

                  <label className="sr-only" htmlFor="deck-sort">
                    Sắp xếp deck
                  </label>
                  <Select value={sort} onValueChange={(v) => setSort(v as "activity" | "name")}>
                    <SelectTrigger id="deck-sort" aria-label="Sắp xếp deck" className="bg-background/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Hoạt động</SelectItem>
                      <SelectItem value="name">Tên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-[0.85rem] text-muted-foreground">
                {filteredDecks.length}/{decks.length}
              </div>
            </div>

            {filteredDecks.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 ring-1 ring-border/60 px-6 py-7 max-w-2xl">
                <p className="font-medium text-foreground mb-2">Không có kết quả</p>
                <p className="text-muted-foreground text-[0.9rem] leading-relaxed">
                  Thử đổi từ khóa, tắt lọc “Sẵn sàng”, hoặc tạo thêm deck mới.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDecks.map((deck, idx) => {
                const summary = cardCounts[deck.id];
                const count = summary?.total_cards ?? 0;
                const due = summary ? summary.due_cards + summary.new_cards : 0;
                const isReady = due > 0;
                const progressW =
                  maxCardsInAnyDeck > 0 ? Math.max(6, Math.round((count / maxCardsInAnyDeck) * 100)) : 6;
                const isFeatured = sort === "activity" && idx === 0 && filteredDecks.length >= 3;

                return (
                  <article
                    key={deck.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-border/70 bg-background/55 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow",
                      "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover:before:opacity-100",
                      "motion-reduce:before:transition-none motion-reduce:transition-none",
                      "before:bg-[radial-gradient(600px_circle_at_var(--x,50%)_var(--y,30%),hsl(var(--primary)/0.10),transparent_40%)]",
                      isFeatured ? "md:col-span-2" : ""
                    )}
                    onPointerMove={setRevealVars}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[1.05rem] font-semibold tracking-tight truncate">
                          {deck.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ring-1 ring-border/80",
                              deck.is_public ? "bg-muted text-foreground" : "bg-primary/10 text-primary"
                            )}
                          >
                            {deck.is_public ? (
                              <Globe2 className="w-3.5 h-3.5" aria-hidden />
                            ) : (
                              <Lock className="w-3.5 h-3.5" aria-hidden />
                            )}
                            {deck.is_public ? "Công khai" : "Riêng tư"}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ring-1 ring-border/70",
                              isReady
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isReady ? `Cần ôn: ${due}` : count > 0 ? "Đã xong hôm nay" : "Chưa có thẻ"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300 font-semibold hover:opacity-90 transition-opacity"
                        onClick={() => handleDeleteDeck(deck.id)}
                        aria-label="Xóa deck"
                        title="Xóa deck"
                      >
                        <Trash className="w-4 h-4" aria-hidden />
                      </button>
                    </div>

                    <div className="mt-4">
                      {deck.description ? (
                        <p className="text-muted-foreground text-[0.9rem] leading-relaxed line-clamp-3">
                          {deck.description}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-[0.9rem] leading-relaxed italic">
                          Thêm mô tả ngắn để dễ nhận diện deck khi có nhiều chủ đề.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-baseline gap-2 text-[0.85rem] text-muted-foreground">
                          <span className="tabular-nums font-medium text-foreground/90">
                            {count}
                          </span>
                          <span>flashcards</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 h-1.5 rounded-full bg-muted ring-1 ring-border/60 overflow-hidden">
                            <span
                              className={cn(
                                "block h-full rounded-full transition-[width] duration-500 ease-out",
                                isReady ? "bg-primary" : "bg-muted-foreground/35"
                              )}
                              style={{ width: `${progressW}%` }}
                            />
                          </span>
                          <span className="text-[0.78rem] tabular-nums text-muted-foreground w-[3ch] text-right">
                            {Math.min(100, progressW)}%
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={cn(
                          "group/reveal relative overflow-hidden inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
                          "ring-1 ring-border/70 hover:bg-muted/50 transition-colors text-[0.85rem] text-muted-foreground",
                          "active:translate-y-px",
                          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover/reveal:before:opacity-100",
                          "motion-reduce:before:transition-none motion-reduce:transition-none",
                          "before:bg-[radial-gradient(460px_circle_at_var(--x,50%)_var(--y,50%),hsl(var(--primary)/0.10),transparent_45%)]"
                        )}
                        onClick={() => handleShare(deck)}
                        onPointerMove={setRevealVars}
                      >
                        <Link2 className="w-4 h-4" aria-hidden />
                        {deck.share_token ? "Link" : "Chia sẻ"}
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={cn(
                          "group/reveal relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3",
                          "border border-border/80 bg-background/70 text-foreground font-semibold text-[0.92rem] shadow-sm",
                          "hover:bg-muted/35 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-[color,background-color,transform] duration-150",
                          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover/reveal:before:opacity-100",
                          "motion-reduce:before:transition-none motion-reduce:transition-none",
                          "before:bg-[radial-gradient(520px_circle_at_var(--x,50%)_var(--y,50%),hsl(var(--primary)/0.08),transparent_55%)]"
                        )}
                        onClick={() => router.push(`/generate?deckId=${deck.id}`)}
                        onPointerMove={setRevealVars}
                      >
                        <Sparkles className="w-4 h-4 text-primary" aria-hidden /> Tạo thẻ
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "group/reveal relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3",
                          "font-semibold text-[0.92rem] text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm",
                          "hover:opacity-95 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-[opacity,transform] duration-150",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "disabled:active:translate-y-0",
                          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover/reveal:before:opacity-100",
                          "motion-reduce:before:transition-none motion-reduce:transition-none",
                          "before:bg-[radial-gradient(560px_circle_at_var(--x,50%)_var(--y,50%),rgba(255,255,255,0.20),transparent_45%)]"
                        )}
                        onClick={() => router.push(`/study/${deck.id}`)}
                        onPointerMove={setRevealVars}
                        disabled={count === 0}
                      >
                        <Repeat className="w-4 h-4" aria-hidden /> Ôn
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            )}
          </div>
        )}
      </section>

      {/* ── Radix UI Share Modal ── */}
      <Dialog.Root open={!!shareModal} onOpenChange={(open) => !open && setShareModal(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-xl sm:rounded-[24px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] outline-none">
            <div className="flex justify-between items-center mb-1">
              <Dialog.Title className="text-xl font-bold">Chia sẻ deck</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-surface-muted transition-colors outline-none cursor-pointer">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-muted-foreground text-[0.95rem]">
              {shareModal?.share_token
                ? "Bất kỳ ai có link này đều có thể xem bộ thẻ (chỉ đọc)."
                : "Kích hoạt chia sẻ để tạo link công khai."}
            </Dialog.Description>

            {shareModal?.share_token ? (
              <div className="flex flex-col gap-5 mt-2">
                <div className="flex items-center gap-2 border border-border bg-surface-muted rounded-xl p-1 shadow-inner">
                  <input
                    className="flex-1 bg-transparent border-none outline-none px-3 text-foreground text-sm font-mono"
                    readOnly
                    value={shareUrl(shareModal.share_token)}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-semibold text-sm text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-opacity cursor-pointer"
                    onClick={() => copyLink(shareModal.share_token!)}
                  >
                    <Copy className="w-4 h-4" /> {copied ? "Đã chép" : "Chép"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2.5 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm"
                    onClick={() => handleUnshare(shareModal.id)}
                  >
                    Tắt chia sẻ
                  </button>
                  <Dialog.Close asChild>
                    <button className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm cursor-pointer hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-colors">
                      Đóng
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[0.92rem] font-semibold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] transition-opacity"
                  onClick={() => handleShare(shareModal!)}
                >
                  <Globe2 className="w-5 h-5" /> Kích hoạt chia sẻ
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <UserSettingsModal
        userId={user.id}
        open={settingsModalOpen}
        onOpenChange={(open) => {
          setSettingsModalOpen(open);
          if (!open) hydrate(user.id);
        }}
      />
    </AppShell>
  );
}
