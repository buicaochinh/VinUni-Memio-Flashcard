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

export default function LoginPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gisInitialized = useRef(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
      setStatus("Đăng nhập thất bại. Hãy kiểm tra kết nối và thử lại.");
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
        text: "signin_with",
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

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await loginWithUsername(username.trim(), password);
      router.push("/workspace");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
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
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Mem<span className="text-primary">io</span>
        </span>
      </Link>

      <div className="w-full max-w-md bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border shadow-sm rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Đăng nhập</h1>
          <p className="text-muted-foreground text-sm">
            Tiếp tục nhịp học của bạn trong vài giây.
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
            Hoặc đăng nhập bằng tài khoản
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleUsernameLogin} className="flex flex-col gap-4">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Tên đăng nhập"
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            type="password"
            placeholder="Mật khẩu"
          />
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full mt-2"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>

        {status && (
          <p className="text-rose-700 dark:text-rose-300 text-sm font-semibold text-center mt-4">
            {status}
          </p>
        )}

        <div className="mt-8 text-center text-sm font-medium">
          Chưa có tài khoản?{" "}
          <Link href="/signup" className="text-primary hover:underline font-semibold">
            Đăng ký ngay
          </Link>
        </div>
        
      </div>
    </main>
  );
}
