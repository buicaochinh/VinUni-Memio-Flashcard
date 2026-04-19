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
  fetchDeckCards,
  fetchDecks,
  getStoredUser,
  User,
} from "../../lib/app-client";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, FolderKanban, Link2, Plus, Sparkles, Trash, X, Lock, Globe2, Repeat } from "lucide-react";
import { cn } from "../../lib/utils";

function shareUrl(token: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/deck/${token}`;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<number, number>>({});
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [shareModal, setShareModal] = useState<Deck | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { router.replace("/"); return; }
    setUser(storedUser);
    void hydrate(storedUser.id);
  }, [router]);

  const hydrate = async (userId: number) => {
    try {
      const d = await fetchDecks(userId);
      setDecks(d);
      const counts = await Promise.all(
        d.map(async (deck) => {
          try {
            const cards = await fetchDeckCards(deck.id, userId);
            return [deck.id, cards.length] as const;
          } catch {
            return [deck.id, 0] as const;
          }
        })
      );
      setCardCounts(Object.fromEntries(counts));
    } catch {
      setMsg("Không tải được workspace. Hãy kiểm tra backend.");
    }
  };

  const totalCards = useMemo(() => Object.values(cardCounts).reduce((s, n) => s + n, 0), [cardCounts]);
  const readyDecks = useMemo(() => decks.filter((d) => (cardCounts[d.id] ?? 0) > 0).length, [decks, cardCounts]);

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
      {/* ── Summary hero ── */}
      <section className="grid grid-cols-1 md:grid-cols-[1.4fr_0.75fr] gap-5 mb-5 items-start">
        <div className="p-8 relative overflow-hidden bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-border text-muted text-[0.82rem] font-semibold mb-3.5">
            <FolderKanban className="w-4 h-4 text-primary" /> Deck Management
          </div>
          <h1 className="text-[clamp(1.8rem,4vw,3.2rem)] font-bold tracking-[-0.05em] mb-2.5">
            Xin chào, {user.name.split(" ").pop()} 👋
          </h1>
          <p className="max-w-[54ch] text-muted text-base leading-[1.7] mb-0">
            Mỗi deck là một chủ đề học độc lập. Tạo deck, upload tài liệu rồi học với Smart Review.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
            <div className="py-3 px-4 bg-white/60 border border-border rounded-2xl">
              <div className="text-muted text-[0.82rem] mb-1 font-medium">Tổng deck</div>
              <div className="text-[1.7rem] font-extrabold tracking-[-0.04em]">{decks.length}</div>
            </div>
            <div className="py-3 px-4 bg-white/60 border border-border rounded-2xl">
              <div className="text-muted text-[0.82rem] mb-1 font-medium">Tổng flashcards</div>
              <div className="text-[1.7rem] font-extrabold tracking-[-0.04em]">{totalCards}</div>
            </div>
            <div className="py-3 px-4 bg-white/60 border border-border rounded-2xl">
              <div className="text-muted text-[0.82rem] mb-1 font-medium">Deck sẵn sàng</div>
              <div className="text-[1.7rem] font-extrabold tracking-[-0.04em]">{readyDecks}</div>
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <section className="p-6 bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl">
            <h3 className="mb-3.5 font-bold text-lg">Tạo deck mới</h3>
            <input
              className="w-full rounded-xl border border-border-strong bg-surface text-text px-4 py-3 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[0.95rem] mb-2.5"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Tên deck (VD: IELTS Writing…)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
            />
            <input
              className="w-full rounded-xl border border-border-strong bg-surface text-text px-4 py-3 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[0.95rem] mb-3.5"
              value={newDeckDesc}
              onChange={(e) => setNewDeckDesc(e.target.value)}
              placeholder="Mô tả ngắn (tuỳ chọn)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
            />
            <button
              className="flex items-center justify-center gap-2 w-full appearance-none border-0 rounded-xl px-5 py-3.5 cursor-pointer font-bold text-[0.92rem] transition-all text-white bg-gradient-to-br from-primary to-amber-500 shadow-[0_6px_20px_var(--primary-glow)] hover:shadow-[0_10px_28px_var(--primary-glow)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateDeck}
              disabled={creating || !newDeckName.trim()}
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo…
                </>
              ) : (
                <><Plus className="w-5 h-5" /> Tạo deck</>
              )}
            </button>
            {msg && <p className="text-danger text-[0.88rem] leading-[1.5] mt-2.5">{msg}</p>}
          </section>

          <section className="p-6 bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl">
            <h3 className="mb-3 font-bold text-lg">Quy trình học</h3>
            <div className="grid gap-3">
              {[
                { n: "1", t: "Tạo deck tại Workspace" },
                { n: "2", t: "Upload tài liệu ở Generator" },
                { n: "3", t: "Ôn tập tại Study" },
                { n: "4", t: "Theo dõi tiến độ ở Analytics" },
              ].map((s) => (
                <div key={s.n} className="flex gap-3 items-start">
                  <div className="flex-none w-8 h-8 rounded-lg grid place-items-center font-extrabold text-[0.88rem] bg-surface-muted text-secondary">
                    {s.n}
                  </div>
                  <div className="pt-1.5"><strong className="text-sm font-semibold">{s.t}</strong></div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {/* ── Deck list ── */}
      <section className="p-6 bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl">
        <div className="flex justify-between items-end gap-3 mb-4">
          <div>
            <h2 className="mb-1 font-bold text-xl">Danh sách Deck</h2>
            <p className="text-muted text-[0.9rem] mb-0">
              {decks.length === 0 ? "Chưa có deck nào — hãy tạo deck đầu tiên ở trên." : `${decks.length} deck`}
            </p>
          </div>
        </div>

        {decks.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {decks.map((deck) => {
              const count = cardCounts[deck.id] ?? 0;
              const isReady = count > 0;
              const barW = isReady ? Math.min(100, 15 + count * 4) : 5;
              return (
                <article key={deck.id} className="p-[22px] grid gap-3.5 bg-surface-raised border border-border rounded-2xl shadow-sm">
                  {/* Meta */}
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold",
                      deck.is_public ? "bg-[#f0fdf9] text-secondary" : "bg-[#fef9ec] text-primary-strong"
                    )}>
                      {deck.is_public ? <Globe2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {deck.is_public ? "Public" : "Private"}
                    </span>
                  </div>

                  {/* Title + desc */}
                  <div>
                    <h3 className="text-[1.2rem] font-bold tracking-[-0.03em] mb-1">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-muted text-[0.88rem] leading-[1.5] m-0">{deck.description}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between items-center gap-2 text-[0.85rem] font-medium mb-1.5 text-muted">
                      <span>{count} flashcards</span>
                      <span className={isReady ? "text-success" : "text-muted"}>
                        {isReady ? "Ready" : "Empty"}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-400 ease-in-out bg-gradient-to-r from-secondary to-[#34d399]"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-strong bg-surface text-text font-bold text-[0.92rem] hover:-translate-y-px active:translate-y-0 transition-transform shadow-xs"
                      onClick={() => router.push(`/generate?deckId=${deck.id}`)}
                    >
                      <Sparkles className="w-4 h-4 text-primary" /> Generate
                    </button>
                    <button
                      className="flex items-center justify-center gap-2 px-4 py-3 border-0 rounded-xl font-bold text-[0.92rem] transition-all text-white bg-gradient-to-br from-primary to-amber-500 shadow-[0_6px_20px_var(--primary-glow)] hover:shadow-[0_10px_28px_var(--primary-glow)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                      onClick={() => router.push(`/study/${deck.id}`)}
                      disabled={!isReady}
                    >
                      <Repeat className="w-4 h-4" /> Học ngay
                    </button>
                  </div>

                  {/* Share + Delete */}
                  <div className="flex gap-2 -mt-1">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border-strong bg-transparent text-muted font-bold text-[0.82rem] hover:bg-surface-muted hover:-translate-y-px active:translate-y-0 transition-all"
                      onClick={() => handleShare(deck)}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {deck.share_token ? "Chia sẻ" : "Bật chia sẻ"}
                    </button>
                    <button
                      className="flex items-center justify-center px-3 py-2 rounded-xl text-danger bg-[#fff1f2] border border-danger/15 font-bold hover:-translate-y-px active:translate-y-0 transition-all"
                      onClick={() => handleDeleteDeck(deck.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Radix UI Share Modal ── */}
      <Dialog.Root open={!!shareModal} onOpenChange={(open) => !open && setShareModal(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-surface-raised p-6 shadow-xl sm:rounded-[24px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] outline-none">
            <div className="flex justify-between items-center mb-1">
              <Dialog.Title className="text-xl font-bold">Chia sẻ deck</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-surface-muted transition-colors outline-none cursor-pointer">
                  <X className="w-5 h-5 text-muted" />
                </button>
              </Dialog.Close>
            </div>
            
            <Dialog.Description className="text-muted text-[0.95rem]">
              {shareModal?.share_token
                ? "Bất kỳ ai có link này đều có thể xem bộ thẻ (chỉ đọc)."
                : "Kích hoạt chia sẻ để tạo link công khai."}
            </Dialog.Description>

            {shareModal?.share_token ? (
              <div className="flex flex-col gap-5 mt-2">
                <div className="flex items-center gap-2 border border-border bg-surface-muted rounded-xl p-1 shadow-inner">
                  <input
                    className="flex-1 bg-transparent border-none outline-none px-3 text-text text-sm font-mono"
                    readOnly
                    value={shareUrl(shareModal.share_token)}
                  />
                  <button
                    className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-bold text-sm transition-all text-white bg-primary shadow-sm hover:-translate-y-px active:translate-y-0 cursor-pointer"
                    onClick={() => copyLink(shareModal.share_token!)}
                  >
                    <Copy className="w-4 h-4" /> {copied ? "Đã chép" : "Chép"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-4 py-2.5 rounded-xl text-danger bg-[#fff1f2] border border-danger/15 font-bold hover:opacity-90 transition-all cursor-pointer text-sm"
                    onClick={() => handleUnshare(shareModal.id)}
                  >
                    Tắt chia sẻ
                  </button>
                  <Dialog.Close asChild>
                    <button className="flex-1 px-4 py-2.5 rounded-xl border border-border-strong bg-surface text-text font-bold text-sm cursor-pointer hover:bg-surface-muted transition-all">
                      Đóng
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <button 
                  className="flex items-center justify-center gap-2 w-full appearance-none border-0 rounded-xl px-5 py-3.5 cursor-pointer font-bold text-[0.92rem] transition-all text-white bg-gradient-to-br from-primary to-amber-500 shadow-[0_6px_20px_var(--primary-glow)] hover:-translate-y-px"
                  onClick={() => handleShare(shareModal!)}
                >
                  <Globe2 className="w-5 h-5" /> Kích hoạt chia sẻ
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AppShell>
  );
}
