"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredUser, User } from "../lib/app-client";
import { LibraryBig, Sparkles, BarChart3, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";
import ThemeToggle from "./ThemeToggle";

type AppShellProps = {
  children: React.ReactNode;
  user: User;
};

const NAV_ITEMS = [
  { href: "/workspace",  label: "Decks",     icon: LibraryBig },
  { href: "/generate",   label: "Generate",  icon: Sparkles },
  { href: "/analytics",  label: "Analytics", icon: BarChart3 },
];

export default function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const handleLogout = () => {
    clearStoredUser();
    router.push("/");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-transparent">
      {/* ── Sidebar (Desktop) ── */}
      <aside className="hidden md:flex flex-col w-[260px] sticky top-0 h-screen border-r border-border bg-white dark:bg-zinc-950 shadow-[4px_0_24px_rgba(0,0,0,0.03)] p-6 gap-8 z-50">
        <div className="px-2 flex items-center justify-between gap-3">
          <Link href="/workspace" className="flex items-center gap-3 overflow-hidden outline-none">
            <div className="relative h-[42px] w-[42px]">
              <Image 
                src="/icon.png" 
                alt="Memio Logo" 
                fill
                className="object-contain mix-blend-multiply flex-shrink-0" 
                priority
              />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-primary">Mem</span><span className="text-foreground">io</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-200 outline-none",
                  isActive
                    ? "bg-surface text-primary shadow-sm border border-border"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground hover:translate-x-1"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-5 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-surface-muted truncate">
            {user.photo_url && !imgError ? (
              <Image
                src={user.photo_url}
                alt={user.name}
                width={32}
                height={32}
                className="rounded-full flex-shrink-0"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-[14px] font-semibold text-foreground truncate">
              {user.name.split(" ").pop()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-border-strong bg-surface text-foreground font-bold text-sm hover:-translate-y-[1px] active:translate-y-0 transition-transform shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-5 pt-8 pb-24 md:pt-10 md:pb-20">
        {children}
      </main>

      {/* ── Mobile bottom navigation ── */}
      <div className="md:hidden fixed top-4 right-4 z-[101]">
        <ThemeToggle />
      </div>

      <nav className="md:hidden flex fixed bottom-0 left-0 right-0 h-[68px] bg-surface/95 border-t border-border backdrop-blur-xl z-[100] pb-[env(safe-area-inset-bottom)] items-stretch shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors outline-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
