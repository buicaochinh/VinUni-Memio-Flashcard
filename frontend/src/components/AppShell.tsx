"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredUser, User } from "../lib/app-client";

type AppShellProps = {
  children: React.ReactNode;
  user: User;
};

const NAV_ITEMS = [
  { href: "/workspace",  label: "Decks",     icon: "🗂️" },
  { href: "/generate",   label: "Generate",  icon: "⚡" },
  { href: "/analytics",  label: "Analytics", icon: "📊" },
];

export default function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearStoredUser();
    router.push("/");
  };

  return (
    <>
      <main className="page-shell">
        {/* ── Top bar ── */}
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark">AI</div>
            <div>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.04em" }}>
                FlashAI
              </span>
            </div>
          </div>

          <div className="nav-actions">
            {/* Desktop horizontal nav */}
            <nav className="app-nav">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${pathname === item.href ? "active" : ""}`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </nav>

            {/* User greeting + logout */}
            <span className="pill" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.name}
                  width={20} height={20}
                  style={{ borderRadius: "50%", flexShrink: 0 }}
                />
              ) : null}
              {user.name.split(" ").pop()}
            </span>

            <button
              className="btn btn-secondary"
              style={{ width: "auto", padding: "8px 14px", fontSize: "0.85rem" }}
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {children}
      </main>

      {/* ── Mobile bottom navigation ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
