"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import {
  fetchDecks,
  generateImageCards,
  useClientReady,
  useStoredUser,
  Deck,
} from "../../lib/app-client";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  ImagePlus,
  Upload,
  FileText,
  X,
  Sparkles,
  Check,
  Lock,
  Repeat,
} from "lucide-react";
import { cn } from "../../lib/utils";

type Stage = "setup" | "generating" | "done" | "error";

export default function ImagesPage() {
  const router = useRouter();
  const user = useStoredUser();
  const clientReady = useClientReady();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [count, setCount] = useState(15);
  const [stage, setStage] = useState<Stage>("setup");
  const [result, setResult] = useState<{ saved: number; real_image: number; diagram: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!clientReady) return;
    if (!user) { router.replace("/"); return; }
    fetchDecks(user.id).then((d) => {
      setDecks(d);
      if (d[0]?.id) setSelectedDeckId(d[0].id);
    }).catch(() => {});
  }, [clientReady, router, user]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".pdf") || f.name.endsWith(".docx") || f.name.endsWith(".txt"),
    );
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) setFiles((prev) => [...prev, ...selected]);
  };

  const handleGenerate = async () => {
    if (!selectedDeckId || files.length === 0) return;
    setStage("generating");
    setErrorMsg(null);
    try {
      const r = await generateImageCards(selectedDeckId, files, count);
      setResult(r);
      setStage("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi không xác định.");
      setStage("error");
    }
  };

  const estimatedCost = (count * 0.04).toFixed(2);

  if (!clientReady || !user) return null;

  return (
    <AppShell user={user}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--acrylic))] backdrop-blur-md border border-border/70 text-muted-foreground text-[0.82rem] font-semibold mb-3.5">
            <ImagePlus className="w-4 h-4 text-primary" />
            Tính năng trả phí
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[0.72rem] font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3" /> Pro
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Đuổi Hình Bắt Chữ</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-[56ch]">
            AI đọc tài liệu, tự chọn những khái niệm trực quan nhất, tạo ảnh DALL-E 3 rồi lưu thẻ vào deck.
            Ưu tiên chất lượng — chỉ tạo thẻ khi ảnh thực sự giúp học.
          </p>
        </div>

        {stage === "setup" || stage === "error" ? (
          <section className="p-8 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[32px] shadow-sm space-y-6">
            {/* Deck selector */}
            <div>
              <label className="block text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Lưu vào deck
              </label>
              <Select
                value={selectedDeckId ? String(selectedDeckId) : ""}
                onValueChange={(v) => setSelectedDeckId(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={decks.length ? "Chọn deck" : "Chưa có deck"} />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Count slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[0.82rem] font-bold text-muted-foreground uppercase tracking-wider">
                  Số thẻ tối đa
                </label>
                <span className="text-primary font-bold text-lg tabular-nums">{count}</span>
              </div>
              <input
                type="range" min={5} max={20} step={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full h-2 bg-surface-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-1.5 text-[0.75rem] font-semibold text-muted-foreground">
                <span>5</span>
                <span className="text-primary">Chi phí ước tính: ~${estimatedCost}</span>
                <span>20</span>
              </div>
            </div>

            {/* File upload */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-[28px] p-10 flex flex-col items-center justify-center gap-4 transition-all duration-200 cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-border/80 hover:border-primary/40 hover:bg-muted/30",
                files.length > 0 ? "border-primary/25 bg-primary/5" : "",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <input
                ref={fileInputRef} type="file" multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              {files.length > 0 ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-1">{files.length} file đã chọn</p>
                    <div className="space-y-0.5">
                      {files.map((f) => (
                        <div key={f.name} className="flex items-center gap-1.5 justify-center text-[0.82rem] text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 opacity-50" />
                          <span className="truncate max-w-[200px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((x) => x.name !== f.name)); }}
                            className="text-muted-foreground hover:text-rose-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[0.82rem] font-semibold text-muted-foreground uppercase tracking-wider">Nhấn để thêm file</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold">Kéo thả hoặc nhấn để chọn file</p>
                    <p className="text-muted-foreground text-[0.88rem] mt-1">PDF, DOCX, TXT</p>
                  </div>
                </>
              )}
            </div>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-[0.88rem] font-medium flex gap-2">
                <X className="w-4 h-4 flex-shrink-0 mt-0.5" /> {errorMsg}
              </div>
            )}

            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={files.length === 0 || !selectedDeckId}
            >
              <Sparkles className="w-4 h-4" />
              Tạo tối đa {count} thẻ có ảnh (~${estimatedCost})
            </Button>
          </section>
        ) : stage === "generating" ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImagePlus className="w-9 h-9 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Đang tạo thẻ ảnh…</h2>
              <p className="text-muted-foreground max-w-[44ch] leading-relaxed">
                AI đang đọc tài liệu, chọn khái niệm trực quan và gọi DALL-E 3.<br />
                Quá trình này mất 30–90 giây.
              </p>
            </div>
          </div>
        ) : (
          /* done */
          <div className="p-10 bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-[40px] shadow-sm text-center">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Hoàn tất!</h2>
            {result && (
              <p className="text-muted-foreground mb-2">
                Đã lưu <strong className="text-foreground">{result.saved} thẻ</strong> vào deck —{" "}
                <span className="text-primary font-semibold">{result.real_image} ảnh DALL-E</span>
                {result.diagram > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold"> + {result.diagram} sơ đồ</span>
                )}.
              </p>
            )}
            <p className="text-muted-foreground text-[0.88rem] mb-8">Thẻ đã sẵn sàng để học.</p>
            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => selectedDeckId && router.push(`/study/${selectedDeckId}`)}
                disabled={!selectedDeckId}
              >
                <Repeat className="w-4 h-4" /> Học ngay
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setStage("setup"); setFiles([]); setResult(null); }}
              >
                Tạo thêm
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
