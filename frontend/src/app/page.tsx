"use client";

import { useStoredUser } from "../lib/app-client";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import Image from "next/image";
import { Sparkles, Check, FileText, Brain, Activity, Clock, Layers, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

export default function Home() {
  const user = useStoredUser();

  const displayName = user?.name || user?.username || "Người học";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <main className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* NAVBAR */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2.5">
          <div className="relative h-10 w-10">
            <Image
              src="/icon.svg"
              alt="Memio Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">Memio</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">Cách hoạt động</a>
            <a href="#why" className="hover:text-foreground transition-colors">Nhớ lâu hơn</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            {user ? (
              <Link
                href="/workspace"
                className="flex items-center gap-2 rounded-full border border-border/80 bg-[hsl(var(--acrylic))] backdrop-blur-md px-3 py-1.5 text-foreground transition-colors hover:bg-muted/35 shadow-sm"
              >
                {user.photo_url ? (
                  <Image
                    src={user.photo_url}
                    alt={displayName}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initial}
                  </span>
                )}
                <span className="max-w-28 truncate">{displayName}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-border/80 bg-[hsl(var(--acrylic))] backdrop-blur-md px-4 py-2 text-foreground font-semibold shadow-sm transition-[background-color,border-color,color] hover:bg-muted/35 hover:border-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
              >
                Đăng nhập
              </Link>
            )}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-16 px-5 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-8 tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5" /> AI tạo thẻ tự động
        </div>

        <h1 className="text-[clamp(2.4rem,5.6vw,4.8rem)] font-extrabold tracking-tight mb-6 max-w-[920px] leading-[1.05] text-foreground">
          Thẻ ghi nhớ thông minh<br />giúp bạn học nhanh hơn
        </h1>

        <p className="text-muted-foreground text-[1.05rem] md:text-xl max-w-[66ch] mb-10 leading-relaxed">
          Tải tài liệu, tạo thẻ trong vài phút, rồi ôn theo nhịp. Memio giúp bạn học sâu hơn bằng spaced repetition và một luồng làm việc không gây nhiễu.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 w-full max-w-md mx-auto relative z-20">
          <Link
            href={user ? "/workspace" : "/signup"}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold text-lg hover:opacity-95 transition-opacity shadow-sm active:translate-y-px flex items-center justify-center gap-2 relative overflow-hidden"
          >
            {user ? "Vào Workspace" : "Bắt đầu miễn phí"} <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href={user ? "/generate" : "/login"}
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-border/80 bg-muted/30 text-foreground font-semibold text-lg hover:bg-muted/50 transition-colors flex items-center justify-center shadow-sm"
          >
            {user ? "Tạo thẻ mới" : "Đăng nhập"}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm font-semibold text-muted-foreground">
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Miễn phí trọn đời</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Không cần thẻ tín dụng</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Hỗ trợ mọi thiết bị</span>
        </div>
      </section>

      {/* MOCKUP GRAPHIC */}
      <section className="px-5 pb-24 flex justify-center">
        <div className="w-full max-w-5xl rounded-[2rem] overflow-hidden border border-border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.10)] bg-[hsl(var(--acrylic-strong))] backdrop-blur-md relative">
          <div className="p-4 sm:p-6 border-b border-border/70 bg-[hsl(var(--acrylic))] backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8">
                <Image src="/icon.svg" alt="Memio" fill className="object-contain" />
              </div>
              <span className="font-semibold text-foreground">Memio</span>
              <span className="hidden sm:inline text-[0.82rem] text-muted-foreground">
                Một vòng lặp học tập, từ tài liệu đến nhịp ôn.
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[0.78rem] font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Tạo thẻ từ tài liệu
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
            <div className="border-b lg:border-b-0 lg:border-r border-border/70 p-5 sm:p-6 bg-[hsl(var(--acrylic))] backdrop-blur-md">
              <div className="grid gap-2">
                {[
                  { icon: Layers, label: "Bộ thẻ", active: true },
                  { icon: Sparkles, label: "Tạo thẻ", active: false },
                  { icon: Activity, label: "Thống kê", active: false },
                ].map((i) => {
                  const Icon = i.icon;
                  return (
                    <div
                      key={i.label}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                        i.active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                          : "text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {i.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-7 bg-background">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="text-[0.75rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Gợi ý hôm nay
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Ôn nhanh 12 thẻ đến hạn
                  </div>
                  <p className="text-muted-foreground text-sm mt-1 max-w-[55ch]">
                    Chọn một deck, bắt đầu phiên ngắn, rồi dừng đúng lúc. Nhớ lâu là nhờ nhịp, không phải marathon.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
                  <span className="text-[0.75rem] font-semibold text-muted-foreground">Tiến độ tuần</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">120</span>
                  <span className="text-[0.75rem] text-muted-foreground">thẻ</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "IELTS Writing Task 2", note: "12 thẻ cần ôn", tone: "text-primary" },
                  { title: "Lịch sử Thế giới", note: "34 thẻ cần ôn", tone: "text-muted-foreground" },
                ].map((d) => (
                  <div key={d.title} className="rounded-2xl border border-border bg-surface/90 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{d.title}</div>
                        <div className={cn("text-sm font-semibold mt-1", d.tone)}>{d.note}</div>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-primary text-[hsl(var(--primary-foreground))] grid place-items-center shadow-sm">
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-muted/70 overflow-hidden ring-1 ring-border/60">
                      <div className="h-full w-[62%] bg-primary/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-5 bg-[hsl(var(--surface))] border-y border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-14 items-start">
          <div className="max-w-[60ch]">
            <div className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Cách hoạt động
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Một vòng lặp để nhớ lâu, không phải một lần đọc cho xong.
            </h2>
            <p className="text-muted-foreground text-[1.05rem] leading-relaxed mt-5">
              Memio gom ba việc bạn vẫn làm hằng ngày vào một luồng. Tài liệu, thẻ, rồi nhịp ôn. Mỗi bước đều có điểm dừng rõ để bạn không bị cuốn quá đà.
            </p>
          </div>

          <ol className="divide-y divide-border">
            {[
              { n: "01", t: "Tải tài liệu", d: "PDF, DOCX, TXT. Chỉ cần kéo thả, không cần chuẩn bị định dạng." },
              { n: "02", t: "AI tạo thẻ", d: "Chọn số lượng, rồi xem lại. Bạn giữ quyền chỉnh sửa trước khi lưu." },
              { n: "03", t: "Ôn theo nhịp", d: "SM-2 lên lịch ôn. Bạn chỉ tập trung vào thẻ đến hạn." },
            ].map((s) => (
              <li key={s.n} className="py-6 first:pt-0 last:pb-0">
                <div className="flex items-start gap-5">
                  <span className="flex-none text-3xl font-extrabold tabular-nums text-primary/30 leading-none mt-0.5 w-10 text-right">
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold tracking-tight text-foreground">
                      {s.t}
                    </div>
                    <p className="text-muted-foreground text-[0.95rem] leading-relaxed mt-1">
                      {s.d}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="why" className="py-24 px-5 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
          <div className="max-w-[68ch]">
            <div className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Nhớ lâu hơn
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Học sâu đến từ nhịp, phản hồi, và sự trung thực khi chấm điểm.
            </h2>
            <div className="mt-7 grid gap-4">
              {[
                { t: "Nhịp ôn phù hợp", d: "Bạn không cố nhồi, bạn lặp lại đúng lúc sắp quên." },
                { t: "Phản hồi ngay tại thẻ", d: "Chấm 0–3 sau khi flip. Dữ liệu đúng thì lịch ôn mới đúng." },
                { t: "Tập trung vào phần yếu", d: "Thống kê không để ngắm. Nó chỉ ra deck và thẻ bạn nên ôn tiếp." },
              ].map((b) => (
                <div key={b.t} className="flex gap-3">
                  <span className="mt-1 h-6 w-6 rounded-full bg-primary/10 ring-1 ring-border/60 flex items-center justify-center text-primary font-semibold">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <div className="font-semibold text-foreground">{b.t}</div>
                    <p className="text-muted-foreground text-[0.95rem] leading-relaxed mt-1">
                      {b.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-muted/30 p-7">
            <div className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Một phiên hợp lý
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground mt-2">
              8–12 phút là đủ.
            </div>
            <p className="text-muted-foreground text-[0.95rem] leading-relaxed mt-3">
              Memio được thiết kế cho phiên ngắn. Bạn dễ bắt đầu, dễ dừng, và dễ quay lại mà không cần "lấy đà".
            </p>
            <div className="mt-6 grid gap-3">
              {[
                { k: "Mục tiêu", v: "12 thẻ" },
                { k: "Nhịp", v: "hằng ngày" },
                { k: "Chấm điểm", v: "0–3 trung thực" },
              ].map((x) => (
                <div key={x.k} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground">{x.k}</span>
                  <span className="text-sm font-bold text-foreground">{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT SECTION */}
      <section className="py-24 px-5 bg-surface-muted border-y border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 items-center">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-6 leading-tight">Các nền tảng học tập khác quá chậm, phức tạp và đắt đỏ.</h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Memio được thiết kế tinh gọn, tập trung hoàn toàn vào việc ghi nhớ hiệu quả. Không quảng cáo, không giao diện thừa, không phí ẩn.
            </p>
            <Link
              href={user ? "/workspace" : "/signup"}
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              Trải nghiệm ngay <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2.5 mb-4">
                <Clock className="w-5 h-5 text-primary flex-none" />
                <h4 className="font-bold text-lg">Tiết kiệm 80% thời gian</h4>
              </div>
              <p className="text-muted-foreground text-sm">Thay vì mất hàng giờ tự viết thẻ, AI của Memio làm điều đó trong 10 giây.</p>
            </div>
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2.5 mb-4">
                <Layers className="w-5 h-5 text-primary flex-none" />
                <h4 className="font-bold text-lg">Tập trung tối đa</h4>
              </div>
              <p className="text-muted-foreground text-sm">Giao diện học toàn màn hình, không bị phân tâm bởi các yếu tố thừa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BIG IMAGE FEATURE 1 */}
      <section className="py-24 px-5 max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold tracking-tight mb-6">Trải nghiệm tạo thẻ mượt mà nhất</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
          Quên đi việc copy-paste từng dòng. Kéo thả file PDF, chọn số lượng thẻ mong muốn, và xem phép màu xảy ra.
        </p>
        <div className="w-full rounded-[2rem] border border-border bg-surface-muted overflow-hidden relative shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_30%)]" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[0.95fr_0.7fr_1fr] gap-5 p-5 md:p-8 text-left">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">Bước 1</p>
                  <h3 className="text-xl font-bold">Tải tài liệu lên</h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-primary" />
                <p className="font-bold text-foreground">Kéo thả PDF, DOCX hoặc TXT</p>
                <p className="mt-2 text-sm text-muted-foreground">Memio tự đọc nội dung, loại bỏ header/footer và chia đoạn thông minh.</p>
              </div>
              <div className="mt-5 space-y-3">
                {["Giáo trình Machine Learning.pdf", "Ghi chú buổi học.docx"].map((file) => (
                  <div key={file} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{file}</p>
                      <p className="text-xs text-muted-foreground">Đã sẵn sàng xử lý</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-border bg-background/70 p-6">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_0_40px_-10px_rgba(37,99,235,0.8)]">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">AI xử lý</p>
                <h3 className="text-xl font-bold">Tạo thẻ trong vài giây</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Chọn số lượng thẻ, độ chi tiết và để AI biến tài liệu thành bộ flashcards có ngữ cảnh.</p>
              </div>
              <div className="w-full space-y-3">
                {["Trích xuất ý chính", "Tạo câu hỏi", "Gắn độ khó"].map((step) => (
                  <div key={step} className="flex items-center gap-3 rounded-full bg-surface px-4 py-3 text-sm font-bold">
                    <Check className="h-4 w-4 text-green-500" />
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">Bước 2</p>
                  <h3 className="text-xl font-bold">Duyệt thẻ trước khi lưu</h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Brain className="h-6 w-6" />
                </div>
              </div>
              <div className="space-y-4">
                {[
                  ["Machine Learning là gì?", "Máy học cho phép hệ thống học từ dữ liệu mà không cần lập trình rõ ràng.", "Dễ"],
                  ["Supervised Learning dùng dữ liệu nào?", "Dữ liệu đã gán nhãn để mô hình học ánh xạ từ input sang output.", "Trung bình"],
                ].map(([front, back, level]) => (
                  <div key={front} className="rounded-2xl border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{front}</p>
                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{level}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{back}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <p className="text-lg font-bold text-primary">24</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">thẻ mới</p>
                </div>
                <div className="rounded-2xl bg-green-500/10 p-3">
                  <p className="text-lg font-bold text-green-600">3</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">độ khó</p>
                </div>
                <div className="rounded-2xl bg-amber-500/10 p-3">
                  <p className="text-lg font-bold text-amber-600">10s</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">xử lý</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 px-5 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground">Câu hỏi thường gặp</h2>
          </div>
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
              <h3 className="font-bold text-lg mb-2 text-foreground">Memio có miễn phí không?</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Hiện tại Memio đang trong giai đoạn Beta và hoàn toàn miễn phí cho mọi người dùng. Bạn không cần nhập thông tin thẻ tín dụng để sử dụng tất cả các tính năng AI.</p>
            </div>
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
              <h3 className="font-bold text-lg mb-2 text-foreground">Hỗ trợ những loại file tài liệu nào?</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Bạn có thể tải lên các file định dạng .PDF, .DOCX, .TXT. Trình xử lý văn bản tích hợp sẵn sẽ đọc và bóc tách dữ liệu sạch trước khi chuyển cho AI phân tích.</p>
            </div>
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
              <h3 className="font-bold text-lg mb-2 text-foreground">AI mất bao lâu để tạo thẻ?</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Trung bình quá trình tạo thẻ diễn ra trong khoảng 5-15 giây tùy thuộc vào độ dài của tài liệu bạn tải lên. AI có thể tạo ra từ 10 đến 50 thẻ chất lượng cao trong mỗi lần xử lý.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-24 px-5">
        <div className="max-w-4xl mx-auto bg-surface-muted border border-border rounded-[3rem] p-12 md:p-20 text-center shadow-sm">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-foreground">
            {user ? `Tiếp tục học nhé, ${displayName}` : "Sẵn sàng để học tốt hơn?"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            {user
              ? "Quay lại workspace để tạo thẻ mới, ôn tập các deck đang học và theo dõi tiến độ của bạn."
              : "Gia nhập cùng hàng ngàn học sinh, sinh viên đang sử dụng Memio để đạt điểm cao hơn mỗi ngày."}
          </p>
          <Link
            href={user ? "/workspace" : "/signup"}
            className="inline-flex bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-[background-color] shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
          >
            {user ? "Mở Workspace" : "Tạo tài khoản miễn phí"}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface/70 px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
            <div>
              <div className="mb-5 flex items-center gap-2.5">
                <div className="relative h-10 w-10">
                  <Image
                    src="/icon.svg"
                    alt="Memio Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-foreground">Memio</span>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Nền tảng tạo flashcards bằng AI giúp bạn biến tài liệu học tập thành lộ trình ôn tập rõ ràng, nhanh và dễ nhớ hơn.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground">
                  AI Flashcards
                </span>
                <span className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground">
                  SM-2 Review
                </span>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Sản phẩm</h4>
              <div className="flex flex-col gap-3 text-sm font-bold text-muted-foreground">
                <a href="#" className="transition-colors hover:text-foreground">Tính năng</a>
                {user ? (
                  <>
                    <Link href="/workspace" className="transition-colors hover:text-foreground">Workspace</Link>
                    <Link href="/generate" className="transition-colors hover:text-foreground">Tạo thẻ mới</Link>
                  </>
                ) : (
                  <>
                    <Link href="/signup" className="transition-colors hover:text-foreground">Đăng ký</Link>
                    <Link href="/login" className="transition-colors hover:text-foreground">Đăng nhập</Link>
                  </>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Học tập</h4>
              <div className="flex flex-col gap-3 text-sm font-bold text-muted-foreground">
                <a href="#" className="transition-colors hover:text-foreground">Tạo bộ thẻ</a>
                <a href="#" className="transition-colors hover:text-foreground">Ôn tập thông minh</a>
                <a href="#" className="transition-colors hover:text-foreground">Theo dõi tiến độ</a>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <h4 className="mb-2 text-lg font-bold text-foreground">Bắt đầu trong vài giây</h4>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {user
                  ? "Bạn đã đăng nhập. Tiếp tục tạo bộ thẻ mới từ tài liệu của mình."
                  : "Tải tài liệu lên và để Memio tạo bộ thẻ đầu tiên cho bạn."}
              </p>
              <Link
                href={user ? "/generate" : "/signup"}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition-[background-color] hover:bg-primary/90"
              >
                {user ? "Tạo thẻ mới" : "Tạo tài khoản"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm font-bold text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>© 2026 Memio. Đã đăng ký bản quyền.</p>
            <div className="flex flex-wrap gap-5">
              <a href="#" className="transition-colors hover:text-foreground">Điều khoản</a>
              <a href="#" className="transition-colors hover:text-foreground">Bảo mật</a>
              <a href="#" className="transition-colors hover:text-foreground">Liên hệ</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
