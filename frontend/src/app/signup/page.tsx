"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  decodeGoogleJwt,
  getStoredUser,
  loginWithGoogle,
  loginWithUsername,
  registerUser,
} from "../../lib/app-client";
import ThemeToggle from "../../components/ThemeToggle";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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

export default function SignupPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gisInitialized = useRef(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");

  useEffect(() => {
    if (getStoredUser()) router.replace("/workspace");
  }, [router]);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    setStatus(null);
    try {
      const payload = decodeGoogleJwt(response.credential);
      await loginWithGoogle(
        payload.sub,
        payload.name,
        payload.email,
        payload.picture
      );
      router.push("/workspace");
    } catch {
      setStatus("Đăng nhập bằng Google thất bại. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const init = () => {
      if (!window.google || !googleBtnRef.current) return;
      
      if (!gisInitialized.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        gisInitialized.current = true;
      }

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        shape: "pill",
        theme: resolvedTheme === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "signup_with",
        locale: "vi",
        width: 320,
      });
    };

    if (window.google) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          init();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [handleGoogleCredential, resolvedTheme]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await registerUser({
        username: regUsername.trim(),
        password: regPassword,
        email: regEmail.trim() ? regEmail.trim() : undefined,
        name: regName.trim() ? regName.trim() : undefined,
      });
      await loginWithUsername(regUsername.trim(), regPassword);
      router.push("/workspace");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-5 relative font-sans">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      <Link href="/" className="absolute top-6 left-6 z-50 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="relative h-10 w-10">
          <Image src="/icon.svg" alt="Memio Logo" fill className="object-contain" priority />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-foreground">Memio</span>
      </Link>

      <div className="w-full max-w-md bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border shadow-sm rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Tạo tài khoản</h1>
          <p className="text-muted-foreground text-sm">
            Thiết lập bộ thẻ đầu tiên và bắt đầu ôn theo nhịp.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mb-6">
          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} className="min-h-[44px] flex justify-center w-full" />
          ) : (
            <p className="text-sm text-rose-700 dark:text-rose-300 font-semibold">
              Thiếu cấu hình Google Client ID.
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Hoặc đăng ký bằng tài khoản
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Input
            value={regUsername}
            onChange={(e) => setRegUsername(e.target.value)}
            disabled={loading}
            placeholder="Tên đăng nhập *" required
          />
          <Input
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            disabled={loading}
            type="password"
            placeholder="Mật khẩu (tối thiểu 6 ký tự) *" required minLength={6}
          />
          <Input
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            disabled={loading}
            type="email"
            placeholder="Email (không bắt buộc)"
          />
          <Input
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            disabled={loading}
            placeholder="Tên hiển thị (không bắt buộc)"
          />
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full mt-2"
          >
            {loading ? "Đang xử lý..." : "Tạo tài khoản miễn phí"}
          </Button>
        </form>

        {status && (
          <p className="text-rose-700 dark:text-rose-300 text-sm font-semibold text-center mt-4">
            {status}
          </p>
        )}

        <div className="mt-8 text-center text-sm font-medium">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
