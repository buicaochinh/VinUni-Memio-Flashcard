"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  decodeGoogleJwt,
  getStoredUser,
  loginAsGuest,
  loginWithGoogle,
  loginWithUsername,
  registerUser,
  saveStoredUser,
} from "../lib/app-client";

// Extend Window to include google GIS object
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

import Image from "next/image";
import { FileText, Brain, Repeat } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"google" | "login" | "register">("google");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");

  const [guestName, setGuestName] = useState("Guest User");

  // Redirect if already logged in
  useEffect(() => {
    if (getStoredUser()) router.replace("/workspace");
  }, [router]);

  // Initialise Google Identity Services after the GIS script loads
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const init = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        shape: "rectangular",
        theme: "outline",
        size: "large",
        text: "signin_with",
        locale: "vi",
        width: 280,
      });
    };

    if (window.google) {
      init();
    } else {
      // Small interval check as backup for the next/script lazy loading
      const interval = setInterval(() => {
        if (window.google) {
          init();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const handleGoogleCredential = async (response: { credential: string }) => {
    setLoading(true);
    setStatus(null);
    try {
      const payload = decodeGoogleJwt(response.credential);
      const user = await loginWithGoogle(
        payload.sub,
        payload.name,
        payload.email,
        payload.picture
      );
      saveStoredUser(user);
      router.push("/workspace");
    } catch {
      setStatus("Đăng nhập thất bại. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const user = await loginWithUsername(username.trim(), password);
      saveStoredUser(user);
      router.push("/workspace");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const user = await registerUser({
        username: regUsername.trim(),
        password: regPassword,
        email: regEmail.trim() ? regEmail.trim() : undefined,
        name: regName.trim() ? regName.trim() : undefined,
      });
      saveStoredUser(user);
      router.push("/workspace");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const user = await loginAsGuest(guestName.trim() ? guestName.trim() : undefined);
      saveStoredUser(user);
      router.push("/workspace");
    } catch {
      setStatus("Không thể đăng nhập guest. Hãy thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-5 bg-background">
      <div className="w-full max-w-[1040px] grid grid-cols-1 md:grid-cols-[1.2fr_0.7fr] gap-5">
        {/* ── Hero / left column ── */}
        <section className="p-7 md:p-9 bg-surface-raised/90 border border-border rounded-[28px] shadow-sm backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8 outline-none">
            <div className="relative h-16 w-16">
              <Image 
                src="/icon.png" 
                alt="Memio Logo" 
                fill
                className="object-contain mix-blend-multiply flex-shrink-0" 
                priority
              />
            </div>
            <span className="text-[2rem] font-extrabold tracking-tight">
              <span className="text-primary">Mem</span><span className="text-foreground">io</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-border text-muted text-[0.82rem] font-semibold mb-3.5">
            ✦ Memio: AI Learning Companion
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.8rem)] leading-[1.0] tracking-[-0.05em] mb-3 bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
            Học ít hơn.
            <br />
            Nhớ nhiều hơn.
          </h1>
          <p className="max-w-[56ch] text-muted text-base leading-[1.7]">
            Tải lên tài liệu — <strong className="text-foreground">Memio</strong> sẽ tự động tạo flashcards
            chất lượng cao, giúp bạn ghi nhớ nhanh chóng với thuật toán ôn tập tối ưu.
          </p>

          <div className="flex gap-2 flex-wrap mt-3.5">
            <span className="rounded-full px-3 py-1.5 bg-surface/70 border border-border text-muted text-[0.82rem]">AI Generation</span>
            <span className="rounded-full px-3 py-1.5 bg-surface/70 border border-border text-muted text-[0.82rem]">Spaced Repetition</span>
            <span className="rounded-full px-3 py-1.5 bg-surface/70 border border-border text-muted text-[0.82rem]">Focus Design</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-7">
            <div className="p-3.5 px-4 bg-surface/60 border border-border rounded-2xl">
              <div className="text-muted text-[0.82rem] mb-1 font-medium">Tạo flashcards</div>
              <div className="text-[1.5rem] font-extrabold tracking-tight">≤ 100</div>
            </div>
            <div className="p-3.5 px-4 bg-surface/60 border border-border rounded-2xl">
              <div className="text-muted text-[0.82rem] mb-1 font-medium">Thuật toán</div>
              <div className="text-[1.5rem] font-extrabold tracking-tight">SM-2</div>
            </div>
            <div className="p-3.5 px-4 bg-surface/60 border border-border rounded-2xl">
              <div className="text-muted text-[0.82rem] mb-1 font-medium">Offline</div>
              <div className="text-[1.5rem] font-extrabold tracking-tight">✓</div>
            </div>
          </div>
        </section>

        {/* ── Auth panel / right column ── */}
        <section className="p-7 md:p-8 bg-surface-raised/90 border border-border rounded-[28px] shadow-sm backdrop-blur-xl grid content-center gap-5">
          <div>
            <h2 className="text-[1.5rem] tracking-[-0.04em] mb-1.5 font-bold">
              Bắt đầu học ngay
            </h2>
            <p className="text-muted text-[0.92rem] mb-0">
              Đăng nhập bằng tài khoản Google để lưu tiến độ và truy cập mọi lúc.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setTab("google")}
              className={[
                "px-3 py-2 rounded-xl border font-bold text-sm transition-colors outline-none",
                tab === "google"
                  ? "bg-surface text-foreground border-border-strong shadow-xs"
                  : "bg-surface/50 text-muted hover:bg-surface-muted border-border",
              ].join(" ")}
            >
              Google
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setTab("login")}
              className={[
                "px-3 py-2 rounded-xl border font-bold text-sm transition-colors outline-none",
                tab === "login"
                  ? "bg-surface text-foreground border-border-strong shadow-xs"
                  : "bg-surface/50 text-muted hover:bg-surface-muted border-border",
              ].join(" ")}
            >
              Tài khoản
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setTab("register")}
              className={[
                "px-3 py-2 rounded-xl border font-bold text-sm transition-colors outline-none",
                tab === "register"
                  ? "bg-surface text-foreground border-border-strong shadow-xs"
                  : "bg-surface/50 text-muted hover:bg-surface-muted border-border",
              ].join(" ")}
            >
              Đăng ký
            </button>
          </div>

          <div className="grid gap-3">
            {[
              { icon: FileText, title: "Upload tài liệu", desc: "PDF, Text hoặc Markdown — AI trích xuất khái niệm, tạo Q&A." },
              { icon: Brain, title: "Xem lại & chỉnh sửa", desc: "Duyệt và sửa từng thẻ trước khi lưu vào deck." },
              { icon: Repeat, title: "Smart Review", desc: "Swipe trái/phải. SM-2 tự lên lịch ôn tập tối ưu." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-surface-muted text-secondary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm">{f.title}</strong>
                    <p className="text-muted text-[0.88rem] leading-[1.5] mb-0">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {tab === "google" && (
            <>
              {/* Google Sign-In button rendered by GIS */}
          {GOOGLE_CLIENT_ID ? (
            <div>
              <div
                ref={googleBtnRef}
                className="flex justify-center min-h-[44px]"
              />
              {loading && (
                <p className="text-muted text-[0.88rem] leading-[1.5] mt-2.5 text-center">
                  Đang xác thực…
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 px-4 bg-[#fff8e7] dark:bg-primary/10 rounded-2xl border border-[#fde68a] dark:border-primary/20">
              <p className="text-muted text-[0.88rem] leading-[1.5] mb-0">
                <strong>Cần cấu hình Google Client ID.</strong>
                <br />
                Thêm <code className="font-mono text-xs">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> vào file <code className="font-mono text-xs">.env.local</code>.
              </p>
            </div>
          )}
            </>
          )}

          {tab === "login" && (
            <form onSubmit={handleUsernameLogin} className="grid gap-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                placeholder="Username"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl border border-border-strong bg-surface text-foreground font-bold text-sm hover:-translate-y-[1px] active:translate-y-0 transition-transform shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </button>
            </form>
          )}

          {tab === "register" && (
            <form onSubmit={handleRegister} className="grid gap-3">
              <input
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                disabled={loading}
                placeholder="Username"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={loading}
                type="password"
                placeholder="Password (min 6)"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={loading}
                placeholder="Email (optional)"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                disabled={loading}
                placeholder="Name (optional)"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl border border-border-strong bg-surface text-foreground font-bold text-sm hover:-translate-y-[1px] active:translate-y-0 transition-transform shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {loading ? "Đang đăng ký…" : "Tạo tài khoản"}
              </button>
            </form>
          )}

          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-muted text-xs font-semibold">Hoặc</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={loading}
              placeholder="Tên hiển thị (guest)"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/60 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface/70 text-foreground font-bold text-sm hover:bg-surface-muted transition-colors outline-none disabled:opacity-60"
            >
              {loading ? "Đang vào chế độ khách…" : "Tiếp tục với tư cách khách"}
            </button>
          </div>

          {status && (
            <p className="text-danger text-[0.88rem] leading-[1.5] mt-1">
              {status}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
