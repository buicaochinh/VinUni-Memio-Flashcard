"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import Image from "next/image";
import { getStoredUser, User } from "../lib/app-client";
import { Sparkles, Check, Star, FileText, Brain, Activity, Clock, Layers, ArrowRight } from "lucide-react";

export default function Home() {
  const [user] = useState<User | null>(() => getStoredUser());

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
          <span className="text-2xl font-black tracking-tight text-foreground">
            Mem<span className="text-primary">io</span>
          </span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#" className="hover:text-foreground transition-colors">Bảng giá</a>
            <a href="#" className="hover:text-foreground transition-colors">Tài liệu</a>
            {user ? (
              <Link href="/workspace" className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-foreground transition-colors hover:bg-surface-muted">
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                    {initial}
                  </span>
                )}
                <span className="max-w-28 truncate">{displayName}</span>
              </Link>
            ) : (
              <Link href="/login" className="hover:text-foreground transition-colors text-foreground">Đăng nhập</Link>
            )}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-16 px-5 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold mb-8 uppercase tracking-widest shadow-sm">
          <Sparkles className="w-3.5 h-3.5" /> AI Tạo thẻ tự động
        </div>
        
        <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-black tracking-tight mb-6 max-w-[900px] leading-[1.05] text-foreground">
          Thẻ ghi nhớ thông minh<br />giúp bạn học nhanh hơn
        </h1>
        
        <p className="text-muted-foreground text-[1.1rem] md:text-xl max-w-[650px] mb-12 leading-relaxed">
          Tải lên tài liệu. AI tự tạo flashcards. Ôn tập hiệu quả với thuật toán SM-2. Tiết kiệm hàng giờ mỗi tuần.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 w-full max-w-md mx-auto relative z-20">
          <Link 
            href={user ? "/workspace" : "/signup"}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2"
          >
            {user ? "Vào Workspace" : "Bắt đầu miễn phí"} <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href={user ? "/generate" : "/login"}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface border border-border text-foreground font-bold text-lg hover:bg-surface-muted transition-colors flex items-center justify-center"
          >
            {user ? "Tạo thẻ mới" : "Đăng nhập"}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm font-bold text-muted-foreground">
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Miễn phí trọn đời</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Không cần thẻ tín dụng</span>
          <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Hỗ trợ mọi thiết bị</span>
        </div>
      </section>

      {/* MOCKUP GRAPHIC */}
      <section className="px-5 pb-24 flex justify-center">
        <div className="w-full max-w-5xl rounded-[2rem] overflow-hidden border border-border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] bg-surface aspect-[16/9] relative flex items-center justify-center p-8">
           {/* Placeholder for actual app screenshot */}
           <div className="w-full h-full bg-surface-muted rounded-2xl border border-border flex flex-col">
              <div className="h-12 border-b border-border flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-[200px] border-r border-border p-6 flex flex-col gap-4 bg-surface">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-6 h-6 relative">
                        <Image src="/icon.svg" alt="Memio" fill className="object-contain" />
                     </div>
                     <span className="font-black text-base text-foreground">Memio</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg font-bold text-xs">
                    <Layers className="w-4 h-4" /> Bộ thẻ
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground rounded-lg font-bold text-xs">
                    <Sparkles className="w-4 h-4" /> Tạo thẻ AI
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground rounded-lg font-bold text-xs">
                    <Activity className="w-4 h-4" /> Thống kê
                  </div>
                </div>
                {/* Main Content */}
                <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden bg-background">
                  <div>
                    <h2 className="text-2xl font-black mb-1 text-foreground">Xin chào, Khách 👋</h2>
                    <p className="text-muted-foreground text-sm">Bạn đã ôn tập 120 thẻ trong tuần này. Tiếp tục phát huy nhé!</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-surface border border-border rounded-2xl shadow-sm p-5 flex flex-col hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                           <h3 className="font-bold text-base text-foreground line-clamp-1">IELTS Writing Task 2</h3>
                           <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[0.65rem] font-bold rounded-md">80% Mastered</span>
                        </div>
                        <p className="text-muted-foreground text-xs mb-4 line-clamp-2">Từ vựng nâng cao và cấu trúc câu phức tạp cho bài thi IELTS.</p>
                        <div className="mt-auto flex justify-between items-center">
                           <span className="text-xs font-bold text-primary">12 thẻ cần ôn</span>
                           <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm"><ArrowRight className="w-3 h-3" /></div>
                        </div>
                     </div>
                     <div className="bg-surface border border-border rounded-2xl shadow-sm p-5 flex flex-col hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                           <h3 className="font-bold text-base text-foreground line-clamp-1">Lịch sử Thế giới</h3>
                           <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[0.65rem] font-bold rounded-md">45% Mastered</span>
                        </div>
                        <p className="text-muted-foreground text-xs mb-4 line-clamp-2">Các sự kiện quan trọng trong thế chiến thứ 2 và chiến tranh lạnh.</p>
                        <div className="mt-auto flex justify-between items-center">
                           <span className="text-xs font-bold text-primary">34 thẻ cần ôn</span>
                           <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm"><ArrowRight className="w-3 h-3" /></div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-5 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-foreground">3 Bước Để Học Nhanh Hơn</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Chỉ mất 10 giây để biến tài liệu của bạn thành hàng tá thẻ ghi nhớ thông minh.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
           {/* Step 1 */}
           <div className="flex flex-col items-center text-center">
             <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-black mb-6 shadow-sm border border-blue-200 dark:border-blue-800">1</div>
             <h3 className="font-bold text-xl mb-3 text-foreground">Tải lên tài liệu</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">Kéo thả file PDF, Word, TXT hoặc paste nội dung trực tiếp. Memio hỗ trợ xử lý dữ liệu phức tạp chỉ trong chớp mắt.</p>
           </div>
           {/* Step 2 */}
           <div className="flex flex-col items-center text-center">
             <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl font-black mb-6 shadow-sm border border-purple-200 dark:border-purple-800">2</div>
             <h3 className="font-bold text-xl mb-3 text-foreground">AI tự động trích xuất</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">Claude 3.5 Sonnet sẽ đọc hiểu và lọc ra những khái niệm quan trọng nhất, tự động tạo thành bộ flashcards (Mặt trước/Mặt sau) cực chuẩn.</p>
           </div>
           {/* Step 3 */}
           <div className="flex flex-col items-center text-center">
             <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center text-2xl font-black mb-6 shadow-sm border border-green-200 dark:border-green-800">3</div>
             <h3 className="font-bold text-xl mb-3 text-foreground">Ôn tập với Smart Review</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">Thuật toán lặp lại ngắt quãng SM-2 sẽ lên lịch ôn tập cho bạn. Những thẻ khó sẽ lặp lại nhiều hơn, thẻ dễ lặp lại ít hơn.</p>
           </div>
        </div>
      </section>

      {/* RATING BANNER */}
      <section className="py-16 bg-surface border-y border-border text-center">
        <div className="flex justify-center gap-1 text-amber-400 mb-4">
          <Star className="w-6 h-6 fill-current" /><Star className="w-6 h-6 fill-current" /><Star className="w-6 h-6 fill-current" /><Star className="w-6 h-6 fill-current" /><Star className="w-6 h-6 fill-current" />
        </div>
        <p className="font-black text-xl md:text-2xl tracking-tight text-foreground max-w-2xl mx-auto leading-snug">
          &ldquo;MEMIO GIÚP TÔI TIẾT KIỆM HÀNG CHỤC GIỜ SOẠN THẺ MỖI TUẦN. THUẬT TOÁN SM-2 RẤT HIỆU QUẢ.&rdquo;
        </p>
        <p className="text-muted-foreground font-bold mt-4 text-sm uppercase tracking-widest">Hơn 20,000 học sinh đang sử dụng</p>
      </section>

      {/* PASTEL FEATURES GRID */}
      <section className="py-24 px-5 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Mọi công cụ bạn cần. Trong một ứng dụng.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/50">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-blue-950 dark:text-blue-100">Tài liệu</h3>
            <p className="text-blue-800/80 dark:text-blue-200/70 leading-relaxed text-sm font-medium">Tải lên PDF, Word hoặc Text. Memio sẽ đọc hiểu toàn bộ nội dung của bạn.</p>
          </div>
          
          <div className="bg-pink-50 dark:bg-pink-950/30 p-8 rounded-3xl border border-pink-100 dark:border-pink-900/50">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-pink-950 dark:text-pink-100">Tạo thẻ AI</h3>
            <p className="text-pink-800/80 dark:text-pink-200/70 leading-relaxed text-sm font-medium">Tự động trích xuất các khái niệm quan trọng và tạo flashcards trong vài giây.</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-950/30 p-8 rounded-3xl border border-purple-100 dark:border-purple-900/50">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-purple-950 dark:text-purple-100">Thuật toán SM-2</h3>
            <p className="text-purple-800/80 dark:text-purple-200/70 leading-relaxed text-sm font-medium">Lặp lại ngắt quãng thông minh. Chỉ ôn tập những thẻ bạn sắp quên.</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950/30 p-8 rounded-3xl border border-green-100 dark:border-green-900/50">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-6">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-green-950 dark:text-green-100">Thống kê</h3>
            <p className="text-green-800/80 dark:text-green-200/70 leading-relaxed text-sm font-medium">Theo dõi sự tiến bộ hàng ngày qua biểu đồ heatmap và tỷ lệ ghi nhớ.</p>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT SECTION */}
      <section className="py-24 px-5 bg-surface-muted border-y border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-6 leading-tight">Các nền tảng học tập khác quá chậm, phức tạp và đắt đỏ.</h2>
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
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg mb-2">Tiết kiệm 80% thời gian</h4>
              <p className="text-muted-foreground text-sm">Thay vì mất hàng giờ tự viết thẻ, AI của Memio làm điều đó trong 10 giây.</p>
            </div>
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg mb-2">Tập trung tối đa</h4>
              <p className="text-muted-foreground text-sm">Giao diện học toàn màn hình, không bị phân tâm bởi các yếu tố thừa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BIG IMAGE FEATURE 1 */}
      <section className="py-24 px-5 max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-black tracking-tight mb-6">Trải nghiệm tạo thẻ mượt mà nhất</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
          Quên đi việc copy-paste từng dòng. Kéo thả file PDF, chọn số lượng thẻ mong muốn, và xem phép màu xảy ra.
        </p>
        <div className="w-full rounded-[2rem] border border-border bg-surface-muted overflow-hidden relative shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_30%)]" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[0.95fr_0.7fr_1fr] gap-5 p-5 md:p-8 text-left">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">Bước 1</p>
                  <h3 className="text-xl font-black">Tải tài liệu lên</h3>
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
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">AI xử lý</p>
                <h3 className="text-xl font-black">Tạo thẻ trong vài giây</h3>
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
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">Bước 2</p>
                  <h3 className="text-xl font-black">Duyệt thẻ trước khi lưu</h3>
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
                      <p className="text-sm font-black">{front}</p>
                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{level}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{back}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <p className="text-lg font-black text-primary">24</p>
                  <p className="text-[11px] font-bold text-muted-foreground">thẻ mới</p>
                </div>
                <div className="rounded-2xl bg-green-500/10 p-3">
                  <p className="text-lg font-black text-green-600">3</p>
                  <p className="text-[11px] font-bold text-muted-foreground">độ khó</p>
                </div>
                <div className="rounded-2xl bg-amber-500/10 p-3">
                  <p className="text-lg font-black text-amber-600">10s</p>
                  <p className="text-[11px] font-bold text-muted-foreground">xử lý</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 px-5 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-foreground">Câu hỏi thường gặp</h2>
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
        <div className="max-w-4xl mx-auto bg-surface-muted border border-border rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-sm">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-foreground">
              {user ? `Tiếp tục học nhé, ${displayName}` : "Sẵn sàng để học tốt hơn?"}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
              {user
                ? "Quay lại workspace để tạo thẻ mới, ôn tập các deck đang học và theo dõi tiến độ của bạn."
                : "Gia nhập cùng hàng ngàn học sinh, sinh viên đang sử dụng Memio để đạt điểm cao hơn mỗi ngày."}
            </p>
            <Link
              href={user ? "/workspace" : "/signup"}
              className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
            >
              {user ? "Mở Workspace" : "Tạo tài khoản miễn phí"}
            </Link>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
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
                <span className="text-2xl font-black tracking-tight text-foreground">
                  Mem<span className="text-primary">io</span>
                </span>
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
              <h4 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-foreground">Sản phẩm</h4>
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
              <h4 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-foreground">Học tập</h4>
              <div className="flex flex-col gap-3 text-sm font-bold text-muted-foreground">
                <a href="#" className="transition-colors hover:text-foreground">Tạo bộ thẻ</a>
                <a href="#" className="transition-colors hover:text-foreground">Ôn tập thông minh</a>
                <a href="#" className="transition-colors hover:text-foreground">Theo dõi tiến độ</a>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="mb-2 text-lg font-black text-foreground">Bắt đầu trong vài giây</h4>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {user
                  ? "Bạn đã đăng nhập. Tiếp tục tạo bộ thẻ mới từ tài liệu của mình."
                  : "Tải tài liệu lên và để Memio tạo bộ thẻ đầu tiên cho bạn."}
              </p>
              <Link
                href={user ? "/generate" : "/signup"}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition-all hover:bg-primary/90"
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
