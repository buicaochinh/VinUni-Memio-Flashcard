"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  decodeGoogleJwt,
  getStoredUser,
  loginWithGoogle,
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

export default function Home() {
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // GIS script may already be loaded or still loading
    if (window.google) {
      init();
    } else {
      const el = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (el) el.addEventListener("load", init);
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

  return (
    <main className="login-shell">
      <div className="login-card">
        {/* ── Hero / left column ── */}
        <section className="hero-card login-hero">
          <div className="eyebrow">✦ AI Flashcard + Spaced Repetition</div>
          <h1 className="gradient-text">
            Học sâu hơn.
            <br />
            Nhớ lâu hơn.
          </h1>
          <p>
            Tải lên tài liệu — AI sẽ tự động tạo ra đến <strong>100 flashcards</strong> chất
            lượng cao, rồi lên lịch ôn tập thông minh bằng thuật toán SM-2 để bạn ghi nhớ bền
            vững hơn bao giờ hết.
          </p>

          <div className="tag-row">
            <span className="tag">PDF · Text · Markdown</span>
            <span className="tag">SM-2 Spaced Repetition</span>
            <span className="tag">Swipe Review</span>
            <span className="tag">Share Decks</span>
          </div>

          <div className="hero-grid" style={{ marginTop: 28 }}>
            <div className="metric-card">
              <div className="metric-label">Tạo flashcards</div>
              <div className="metric-value" style={{ fontSize: "1.5rem" }}>≤ 100</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Thuật toán</div>
              <div className="metric-value" style={{ fontSize: "1.5rem" }}>SM-2</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Offline</div>
              <div className="metric-value" style={{ fontSize: "1.5rem" }}>✓</div>
            </div>
          </div>
        </section>

        {/* ── Auth panel / right column ── */}
        <section className="panel auth-panel">
          <div>
            <h2 style={{ fontSize: "1.5rem", letterSpacing: "-0.04em", marginBottom: 6 }}>
              Bắt đầu học ngay
            </h2>
            <p className="muted" style={{ fontSize: "0.92rem", marginBottom: 0 }}>
              Đăng nhập bằng tài khoản Google để lưu tiến độ và truy cập mọi lúc.
            </p>
          </div>

          <div className="feature-list">
            {[
              { icon: "📄", title: "Upload tài liệu", desc: "PDF, Text hoặc Markdown — AI trích xuất khái niệm, tạo Q&A." },
              { icon: "🧠", title: "Xem lại & chỉnh sửa", desc: "Duyệt và sửa từng thẻ trước khi lưu vào deck." },
              { icon: "🔁", title: "Smart Review", desc: "Swipe trái/phải. SM-2 tự lên lịch ôn tập tối ưu." },
            ].map((f) => (
              <div key={f.title} className="feature-item">
                <div className="feature-icon" style={{ fontSize: "1.1rem" }}>{f.icon}</div>
                <div>
                  <strong>{f.title}</strong>
                  <p className="helper-text" style={{ marginBottom: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Google Sign-In button rendered by GIS */}
          {GOOGLE_CLIENT_ID ? (
            <div>
              <div
                ref={googleBtnRef}
                className="google-btn-wrap"
                style={{ minHeight: 44 }}
              />
              {loading && (
                <p className="helper-text" style={{ marginTop: 10, textAlign: "center" }}>
                  Đang xác thực…
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "14px 16px",
                background: "#fff8e7",
                borderRadius: "var(--radius)",
                border: "1px solid #fde68a",
              }}
            >
              <p className="helper-text" style={{ marginBottom: 0 }}>
                <strong>Cần cấu hình Google Client ID.</strong>
                <br />
                Thêm <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> vào file <code>.env.local</code>.
              </p>
            </div>
          )}

          {status && (
            <p className="helper-text" style={{ color: "var(--danger)", marginTop: 4 }}>
              {status}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
