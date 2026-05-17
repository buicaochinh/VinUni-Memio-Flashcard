"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../../components/AppShell";
import {
  Card,
  fetchDeckCards,
  fetchDecks,
  updateDeck,
  deleteDeck,
  updateCard,
  deleteCard,
  bulkCreateCards,
  useClientReady,
  useStoredUser,
  Deck,
} from "../../../../lib/app-client";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Skeleton } from "../../../../components/ui/skeleton";
import {
  ArrowLeft,
  Check,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../../../../lib/utils";

type CardEdit = { front: string; back: string; difficulty: "easy" | "medium" | "hard" };

export default function DeckEditPage() {
  const params = useParams<{ shareToken: string }>();
  const deckId = Number(params.shareToken);
  const router = useRouter();
  const user = useStoredUser();
  const clientReady = useClientReady();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deck edit state
  const [deckName, setDeckName] = useState("");
  const [deckDesc, setDeckDesc] = useState("");
  const [savingDeck, setSavingDeck] = useState(false);
  const [deckMsg, setDeckMsg] = useState<string | null>(null);

  // Card inline edit
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editState, setEditState] = useState<CardEdit | null>(null);
  const [savingCardId, setSavingCardId] = useState<number | null>(null);

  // New card form
  const [addingCard, setAddingCard] = useState(false);
  const [newCard, setNewCard] = useState<CardEdit>({ front: "", back: "", difficulty: "medium" });
  const [savingNew, setSavingNew] = useState(false);

  // Delete deck dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  const frontRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!clientReady) return;
    if (!user) { router.replace("/"); return; }
    if (!Number.isFinite(deckId) || deckId <= 0) { router.replace("/workspace"); return; }

    Promise.all([fetchDecks(), fetchDeckCards(deckId)])
      .then(([decks, fetchedCards]) => {
        const found = decks.find((d) => d.id === deckId) ?? null;
        if (!found) { router.replace("/workspace"); return; }
        setDeck(found);
        setDeckName(found.name ?? "");
        setDeckDesc(found.description ?? "");
        setCards(fetchedCards);
      })
      .catch(() => setError("Không tải được dữ liệu. Hãy thử lại."))
      .finally(() => setLoading(false));
  }, [clientReady, deckId, router, user]);

  const handleSaveDeck = async () => {
    if (!deckName.trim()) return;
    setSavingDeck(true);
    setDeckMsg(null);
    try {
      await updateDeck(deckId, deckName.trim(), deckDesc.trim());
      setDeck((prev) => prev ? { ...prev, name: deckName.trim(), description: deckDesc.trim() } : prev);
      setDeckMsg("Đã lưu.");
    } catch {
      setDeckMsg("Lỗi khi lưu. Hãy thử lại.");
    } finally {
      setSavingDeck(false);
    }
  };

  const startEdit = (card: Card) => {
    setEditingCardId(card.id);
    setEditState({ front: card.front, back: card.back, difficulty: card.difficulty ?? "medium" });
  };

  const cancelEdit = () => { setEditingCardId(null); setEditState(null); };

  const saveEdit = async (cardId: number) => {
    if (!editState) return;
    setSavingCardId(cardId);
    try {
      await updateCard(cardId, editState.front, editState.back, editState.difficulty);
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, ...editState } : c));
      setEditingCardId(null);
      setEditState(null);
    } catch {
      // keep editing open so user can retry
    } finally {
      setSavingCardId(null);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (editingCardId === cardId) cancelEdit();
    } catch {
      // silent — card stays
    }
  };

  const handleAddCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return;
    setSavingNew(true);
    try {
      await bulkCreateCards(deckId, [newCard]);
      const fresh = await fetchDeckCards(deckId);
      setCards(fresh);
      setNewCard({ front: "", back: "", difficulty: "medium" });
      setAddingCard(false);
    } catch {
      // keep form open
    } finally {
      setSavingNew(false);
    }
  };

  const handleDeleteDeck = async () => {
    setDeletingDeck(true);
    try {
      await deleteDeck(deckId);
      router.replace("/workspace");
    } catch {
      setDeletingDeck(false);
    }
  };

  if (!clientReady || loading) return (
    <AppShell user={null}>
      <div className="pb-20 space-y-8">
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="p-6 border border-border rounded-2xl space-y-4">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    </AppShell>
  );
  if (error) return (
    <AppShell user={user!}>
      <div className="p-8 text-rose-600">{error}</div>
    </AppShell>
  );
  if (!deck) return null;

  return (
    <AppShell user={user!}>
      <div className="pb-20">

        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push("/workspace")}
          className="inline-flex items-center gap-2 mb-6 text-[0.88rem] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Workspace
        </button>

        {/* ── Deck info ── */}
        <section className="p-6 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-2xl shadow-sm mb-8">
          <h2 className="text-[0.78rem] font-bold text-muted-foreground uppercase tracking-wider mb-4">Thông tin deck</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-[0.78rem] font-semibold text-muted-foreground mb-1.5 block" htmlFor="deck-name">Tên deck</label>
              <Input
                id="deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Tên deck…"
                className="text-base font-semibold"
              />
            </div>
            <div>
              <label className="text-[0.78rem] font-semibold text-muted-foreground mb-1.5 block" htmlFor="deck-desc">Mô tả</label>
              <Input
                id="deck-desc"
                value={deckDesc}
                onChange={(e) => setDeckDesc(e.target.value)}
                placeholder="Mô tả ngắn (tùy chọn)…"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleSaveDeck} disabled={savingDeck || !deckName.trim()}>
                <Save className="w-4 h-4" /> {savingDeck ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
              {deckMsg && (
                <span className={cn("text-[0.85rem] font-medium", deckMsg.startsWith("Lỗi") ? "text-rose-600" : "text-green-600")}>
                  {deckMsg}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Cards ── */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-bold text-xl">
            Flashcards <span className="text-muted-foreground font-normal text-base ml-1">({cards.length})</span>
          </h2>
          <Button variant="secondary" onClick={() => { setAddingCard(true); setNewCard({ front: "", back: "", difficulty: "medium" }); }}>
            <Plus className="w-4 h-4" /> Thêm thẻ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Add card form */}
          {addingCard && (
            <div className="p-[22px] flex flex-col gap-4 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border-2 border-primary/40 rounded-2xl shadow-sm">
              <p className="text-[0.78rem] font-bold text-muted-foreground uppercase tracking-wider">Thẻ mới</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu hỏi (Front)</label>
                  <textarea
                    ref={frontRef}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                    value={newCard.front}
                    onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu trả lời (Back)</label>
                  <textarea
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                    value={newCard.back}
                    onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Độ khó</label>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-tighter transition-all",
                          newCard.difficulty === d
                            ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                            : "bg-surface text-muted-foreground border border-border hover:bg-surface-muted"
                        )}
                        onClick={() => setNewCard({ ...newCard, difficulty: d })}
                      >
                        {d === "easy" ? "Dễ" : d === "medium" ? "TB" : "Khó"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setAddingCard(false)}>Hủy</Button>
                <Button
                  variant="primary"
                  className="flex-[1.5]"
                  disabled={savingNew || !newCard.front.trim() || !newCard.back.trim()}
                  onClick={handleAddCard}
                >
                  <Check className="w-4 h-4" /> {savingNew ? "Đang lưu…" : "Thêm thẻ"}
                </Button>
              </div>
            </div>
          )}

          {cards.map((card) => (
            <div
              key={card.id}
              className={cn(
                "p-[22px] flex flex-col gap-4 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-2xl shadow-sm transition-colors",
                editingCardId === card.id ? "ring-2 ring-primary/40 border-primary/40" : "hover:border-primary/30"
              )}
            >
              {editingCardId === card.id && editState ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu hỏi (Front)</label>
                      <textarea
                        autoFocus
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                        value={editState.front}
                        onChange={(e) => setEditState({ ...editState, front: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Câu trả lời (Back)</label>
                      <textarea
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] text-[0.9rem] leading-relaxed resize-none min-h-[90px]"
                        value={editState.back}
                        onChange={(e) => setEditState({ ...editState, back: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Độ khó</label>
                      <div className="flex gap-2">
                        {(["easy", "medium", "hard"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={cn(
                              "flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-tighter transition-all",
                              editState.difficulty === d
                                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                                : "bg-surface text-muted-foreground border border-border hover:bg-surface-muted"
                            )}
                            onClick={() => setEditState({ ...editState, difficulty: d })}
                          >
                            {d === "easy" ? "Dễ" : d === "medium" ? "TB" : "Khó"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" className="flex-1" onClick={cancelEdit}>Hủy</Button>
                    <Button
                      variant="primary"
                      className="flex-[1.5]"
                      disabled={savingCardId === card.id}
                      onClick={() => saveEdit(card.id)}
                    >
                      <Check className="w-4 h-4" /> {savingCardId === card.id ? "Đang lưu…" : "Hoàn tất"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-bold tracking-tight mb-3",
                      card.difficulty === "easy" ? "bg-green-100 text-green-700 dark:text-green-400" :
                      card.difficulty === "medium" ? "bg-amber-100 text-amber-700 dark:text-amber-400" :
                      "bg-red-100 text-red-700"
                    )}>
                      {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "Trung bình" : "Khó"}
                    </span>
                    {card.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image_url} alt={card.back} className="w-full aspect-video object-cover rounded-xl mb-3" />
                    )}
                    <p className="font-bold text-[0.95rem] leading-snug mb-2 text-foreground line-clamp-3">{card.front}</p>
                    <p className="text-muted-foreground text-[0.88rem] leading-relaxed line-clamp-4">{card.back}</p>
                  </div>
                  <div className="flex justify-end gap-2.5 pt-4 border-t border-border/50">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => handleDeleteCard(card.id)}
                      title="Xóa thẻ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10"
                      onClick={() => startEdit(card)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Sửa
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Empty add card cell */}
          {!addingCard && (
            <button
              type="button"
              onClick={() => { setAddingCard(true); setNewCard({ front: "", back: "", difficulty: "medium" }); }}
              className="p-[22px] min-h-[220px] flex flex-col items-center justify-center gap-3 bg-transparent border-2 border-dashed border-border/80 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm tracking-wide uppercase">Thêm thẻ mới</span>
            </button>
          )}
        </div>

        {/* ── Delete deck ── */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="font-semibold text-[0.88rem] text-muted-foreground mb-3">Vùng nguy hiểm</h3>
          <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Dialog.Trigger asChild>
              <Button variant="danger">
                <Trash2 className="w-4 h-4" /> Xóa deck này
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                <Dialog.Title className="text-lg font-bold mb-2">Xóa deck?</Dialog.Title>
                <Dialog.Description className="text-muted-foreground text-[0.9rem] mb-6 leading-relaxed">
                  Hành động này không thể hoàn tác. Toàn bộ <strong className="text-foreground">{cards.length} flashcards</strong> trong deck <strong className="text-foreground">&ldquo;{deck.name}&rdquo;</strong> sẽ bị xóa vĩnh viễn.
                </Dialog.Description>
                <div className="flex gap-3 justify-end">
                  <Dialog.Close asChild>
                    <Button variant="ghost">Hủy</Button>
                  </Dialog.Close>
                  <Button variant="danger" onClick={handleDeleteDeck} disabled={deletingDeck}>
                    <Trash2 className="w-4 h-4" /> {deletingDeck ? "Đang xóa…" : "Xóa vĩnh viễn"}
                  </Button>
                </div>
                <Dialog.Close asChild>
                  <button className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]">
                    <X className="w-4 h-4" /><span className="sr-only">Đóng</span>
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

      </div>
    </AppShell>
  );
}
