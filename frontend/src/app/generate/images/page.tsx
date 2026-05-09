"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import {
  fetchDeckCards,
  generateDeckImages,
  useClientReady,
  useStoredUser,
  Card,
} from "../../../lib/app-client";
import { Button } from "../../../components/ui/button";
import { ArrowLeft, ImagePlus, Image as ImageIcon, Shapes, Sparkles, Check } from "lucide-react";
import { cn } from "../../../lib/utils";

type Stage = "loading" | "idle" | "generating" | "done" | "error";

function GenerateImagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useStoredUser();
  const clientReady = useClientReady();
  const deckIdParam = searchParams.get("deckId");
  const parsedDeckId = deckIdParam && /^\d+$/.test(deckIdParam) ? Number(deckIdParam) : null;

  const [cards, setCards] = useState<Card[]>([]);
  const [stage, setStage] = useState<Stage>("loading");
  const [result, setResult] = useState<{ generated: number; total_candidates: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCards = useCallback(async (did: number) => {
    try {
      const c = await fetchDeckCards(did);
      setCards(c);
      setStage("idle");
    } catch {
      setStage("error");
      setErrorMsg("Không tải được danh sách thẻ.");
    }
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    if (!user) { router.replace("/"); return; }
    if (!parsedDeckId) { router.replace("/workspace"); return; }
    const timer = window.setTimeout(() => {
      void loadCards(parsedDeckId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [clientReady, loadCards, parsedDeckId, router, user]);

  const handleGenerate = async () => {
    if (!parsedDeckId) return;
    setStage("generating");
    setErrorMsg(null);
    try {
      const r = await generateDeckImages(parsedDeckId);
      setResult(r);
      setStage("done");
    } catch {
      setStage("error");
      setErrorMsg("Lỗi khi tạo ảnh. Kiểm tra OPENAI_API_KEY và thử lại.");
    }
  };

  const pendingCards = cards.filter((c) => c.image_type === "real_image" && !c.image_url);
  const diagramCards = cards.filter((c) => c.image_type === "diagram");
  const doneCards = cards.filter((c) => c.image_type === "real_image" && c.image_url);

  if (!clientReady || !user) return null;

  return (
    <AppShell user={user}>
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] backdrop-blur-md border border-border/70 text-muted-foreground text-[0.82rem] font-semibold mb-3.5">
            <ImagePlus className="w-4 h-4 text-primary" /> Ảnh minh hoạ
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Thêm ảnh minh hoạ</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            DALL-E 3 sẽ tạo ảnh cho các thẻ có chủ đề trực quan (nhân vật, địa danh, sinh vật…).
            Mỗi ảnh tốn ~$0.04. Sơ đồ được render trực tiếp từ spec — miễn phí.
          </p>
        </div>

        {stage === "loading" && (
          <div className="py-20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        )}

        {(stage === "idle" || stage === "generating" || stage === "done" || stage === "error") && (
          <div className="p-8 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[32px] shadow-sm space-y-6">

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{pendingCards.length}</p>
                <p className="text-[0.78rem] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                  Cần tạo ảnh
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <Shapes className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{diagramCards.length}</p>
                <p className="text-[0.78rem] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                  Diagram (free)
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{doneCards.length}</p>
                <p className="text-[0.78rem] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                  Đã có ảnh
                </p>
              </div>
            </div>

            {pendingCards.length > 0 && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-[0.88rem] text-foreground">
                Chi phí ước tính:{" "}
                <strong className="text-primary">
                  ~${(pendingCards.length * 0.04).toFixed(2)}
                </strong>{" "}
                cho {pendingCards.length} ảnh DALL-E 3.
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-[0.88rem] font-medium">
                {errorMsg}
              </div>
            )}

            {stage === "done" && result && (
              <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-300 text-[0.88rem] font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                Đã tạo {result.generated}/{result.total_candidates} ảnh thành công.
              </div>
            )}

            <div className="flex gap-3">
              {stage !== "done" && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleGenerate}
                  disabled={stage === "generating" || pendingCards.length === 0}
                >
                  {stage === "generating" ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Đang tạo ảnh…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Tạo {pendingCards.length} ảnh DALL-E 3
                    </>
                  )}
                </Button>
              )}
              <Button
                variant={stage === "done" ? "primary" : "secondary"}
                className={cn(stage === "done" && "flex-1")}
                onClick={() => parsedDeckId && router.push(`/study/${parsedDeckId}`)}
                disabled={!parsedDeckId}
              >
                {stage === "done" ? (
                  <><Check className="w-4 h-4" /> Học ngay</>
                ) : (
                  "Bỏ qua"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function GenerateImagesPage() {
  return (
    <Suspense fallback={null}>
      <GenerateImagesPageContent />
    </Suspense>
  );
}
