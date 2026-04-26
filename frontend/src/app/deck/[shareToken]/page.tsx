"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Card, Deck, fetchSharedDeck } from "../../../lib/app-client";
import { Search, Lock, BookOpen, Layers, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function SharedDeckPage() {
  const params = useParams<{ shareToken: string }>();
  const router = useRouter();
  const [deck,    setDeck]    = useState<Deck | null>(null);
  const [cards,   setCards]   = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    fetchSharedDeck(params.shareToken)
      .then(({ deck: d, cards: c }) => { setDeck(d); setCards(c); })
      .catch(() => setError("Deck không tồn tại hoặc chưa được chia sẻ."))
      .finally(() => setLoading(false));
  }, [params.shareToken]);

  const filtered = cards.filter(
    (c) =>
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase())
  );

  const diffCount = cards.reduce(
    (acc, c) => { const d = c.difficulty ?? "medium"; acc[d] = (acc[d] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-5 bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải bộ thẻ…</p>
        </div>
      </main>
    );
  }

  if (error || !deck) {
    return (
      <main className="min-h-screen grid place-items-center p-5 bg-background">
        <div className="w-full max-w-[440px] p-10 bg-surface border border-border rounded-[28px] shadow-sm text-center">
          <div className="text-5xl mb-4 text-primary">
            <Lock className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Không tìm thấy bộ thẻ</h2>
          <p className="text-muted-foreground mb-6">
            {error ?? "Link không hợp lệ hoặc bộ thẻ đã tắt chia sẻ."}
          </p>
          <button 
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-primary shadow-lg hover:shadow-xl hover:-translate-y-px transition-all"
            onClick={() => router.push("/")}
          >
            Về trang chủ
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border p-4 md:px-8 flex justify-between items-center gap-4">
        <div className="brand-lockup">
          <Link href="/" className="flex items-center gap-3 outline-none">
            <div className="relative h-8 w-8">
              <Image 
                src="/icon.svg" 
                alt="Memio Logo" 
                fill
                className="object-contain mix-blend-multiply flex-shrink-0" 
              />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-primary">Mem</span><span className="text-foreground">io</span>
            </span>
          </Link>
        </div>
        <button 
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-primary shadow-md hover:-translate-y-px transition-all"
          onClick={() => router.push("/")}
        >
          Tạo deck của bạn <ArrowRight className="inline-block w-4 h-4 ml-1" />
        </button>
      </header>

      <div className="w-full max-w-[1100px] mx-auto p-4 md:p-8 pb-14">
        {/* ── Deck info ── */}
        <section className="p-8 bg-surface-raised border border-border rounded-3xl shadow-sm backdrop-blur-xl relative overflow-hidden mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-border text-muted-foreground text-[0.82rem] font-semibold mb-3.5">
            <BookOpen className="w-4 h-4 text-secondary" /> Bộ thẻ được chia sẻ
          </div>
          <h1 className="text-[clamp(1.6rem,4vw,3rem)] font-bold tracking-tight mb-2">
            {deck.name}
          </h1>
          {deck.description && (
            <p className="text-muted-foreground mb-4 max-w-[70ch] leading-relaxed">{deck.description}</p>
          )}
          <div className="flex gap-3 flex-wrap items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-[#f0fdf9] dark:bg-secondary/10 text-secondary text-[0.82rem] font-semibold">
              <Layers className="w-3.5 h-3.5" /> {cards.length} flashcards
            </span>
            {Object.entries(diffCount).map(([d, n]) => (
              <span key={d} className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold capitalize",
                d === "easy" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" : 
                d === "medium" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" : 
                "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
              )}>
                {d === "easy" ? "Dễ" : d === "medium" ? "Trung bình" : "Khó"}: {n}
              </span>
            ))}
          </div>
        </section>

        {/* ── Search ── */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border-strong bg-surface text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm flashcard…"
          />
        </div>

        {/* ── Cards grid (flip on click) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((card, i) => {
            const isFlip = flipped[i] ?? false;
            return (
              <div
                key={card.id ?? i}
                className="group [perspective:1000px] h-48 cursor-pointer"
                onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
              >
                <div className={cn(
                  "relative h-full w-full transition-all duration-500 [transform-style:preserve-3d]",
                  isFlip ? "[transform:rotateY(180deg)]" : ""
                )}>
                  {/* Front */}
                  <article className="absolute inset-0 h-full w-full rounded-2xl p-6 border border-border bg-surface-muted flex flex-col justify-between [backface-visibility:hidden]">
                    {card.difficulty && (
                      <span className={cn(
                        "self-start px-2.5 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider",
                        card.difficulty === "easy" ? "bg-green-100 text-green-700 dark:text-green-400" : 
                        card.difficulty === "medium" ? "bg-amber-100 text-amber-700 dark:text-amber-400" : 
                        "bg-red-100 text-red-700"
                      )}>
                        {card.difficulty === "easy" ? "Dễ" : card.difficulty === "medium" ? "Trung bình" : "Khó"}
                      </span>
                    )}
                    <div className="flex-1 flex items-center text-sm font-bold leading-relaxed line-clamp-4">
                      {card.front}
                    </div>
                    <div className="text-[10px] font-bold text-subtle/60 uppercase tracking-widest text-center mt-2 group-hover:text-primary transition-colors">
                      Nhấn để xem đáp án
                    </div>
                  </article>

                  {/* Back */}
                  <article className="absolute inset-0 h-full w-full rounded-2xl p-6 border border-primary/30 bg-blue-50 dark:bg-blue-900/20 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] text-foreground">
                    <div className="self-start text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đáp án
                    </div>
                    <div className="flex-1 flex items-center text-sm font-medium leading-relaxed overflow-y-auto mt-2">
                      {card.back}
                    </div>
                    <div className="text-[10px] font-bold text-secondary/60 uppercase tracking-widest text-center mt-2">
                      Nhấn để lật lại
                    </div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center animate-in fade-in slide-in-from-top-4">
            <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">Không tìm thấy thẻ phù hợp.</p>
          </div>
        )}

        {/* ── CTA to sign up ── */}
        <div className="mt-12 p-10 bg-surface border border-border rounded-[32px] shadow-sm text-center">
          <h3 className="text-2xl font-bold tracking-tight mb-3">
            Muốn học với Spaced Repetition?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-[56ch] mx-auto">
            Đăng nhập để lưu deck này, ôn tập với thuật toán <strong className="text-foreground">SM-2</strong> và theo dõi tiến độ của bạn.
          </p>
          <button 
            className="py-3.5 px-8 rounded-xl font-bold text-white bg-primary shadow-lg hover:shadow-xl hover:-translate-y-px transition-all"
            onClick={() => router.push("/")}
          >
            Bắt đầu miễn phí
          </button>
        </div>
      </div>
    </main>
  );
}
