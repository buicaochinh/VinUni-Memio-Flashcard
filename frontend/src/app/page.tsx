"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredUser } from "../lib/app-client";
import ThemeToggle from "../components/ThemeToggle";
import Image from "next/image";
import { Sparkles, Check, Star, FileText, Brain, Activity, Clock, Layers, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getStoredUser()) router.replace("/workspace");
  }, [router]);

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
            <Link href="/login" className="hover:text-foreground transition-colors text-foreground">Đăng nhập</Link>
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
            href="/signup" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2"
          >
            Bắt đầu miễn phí <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface border border-border text-foreground font-bold text-lg hover:bg-surface-muted transition-colors flex items-center justify-center"
          >
            Đăng nhập
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
          "MEMIO GIÚP TÔI TIẾT KIỆM HÀNG CHỤC GIỜ SOẠN THẺ MỖI TUẦN. THUẬT TOÁN SM-2 RẤT HIỆU QUẢ."
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
            <button className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity">
              Trải nghiệm ngay <ArrowRight className="w-4 h-4" />
            </button>
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
        <div className="w-full aspect-[21/9] bg-surface-muted rounded-[2rem] border border-border overflow-hidden relative shadow-xl">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center p-12">
              {/* Abstract document visual */}
              <div className="w-64 h-80 bg-white dark:bg-surface border border-border rounded-xl shadow-2xl flex flex-col p-6 gap-4 transform -rotate-6">
                <div className="h-4 bg-border rounded w-1/2"></div>
                <div className="h-2 bg-border rounded w-full"></div>
                <div className="h-2 bg-border rounded w-5/6"></div>
                <div className="h-2 bg-border rounded w-4/5"></div>
              </div>
              <Sparkles className="w-12 h-12 text-primary mx-8 animate-pulse" />
              <div className="w-64 h-80 bg-white dark:bg-surface border border-border rounded-xl shadow-2xl flex flex-col p-6 gap-4 transform rotate-6">
                <div className="h-32 bg-primary/10 rounded border border-primary/20 flex items-center justify-center"><Brain className="text-primary w-8 h-8" /></div>
                <div className="h-20 bg-secondary/30 rounded border border-secondary/50"></div>
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
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-foreground">Sẵn sàng để học tốt hơn?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
              Gia nhập cùng hàng ngàn học sinh, sinh viên đang sử dụng Memio để đạt điểm cao hơn mỗi ngày.
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
            >
              Tạo tài khoản miễn phí
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-border text-center text-sm font-bold text-muted-foreground">
        <p>© 2026 Memio. Đã đăng ký bản quyền.</p>
      </footer>
    </main>
  );
}
