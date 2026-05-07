"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredUser, syncBrowserTimezone, User } from "../lib/app-client";
import { BarChart3, Bot, LibraryBig, LogOut, Plug, Sparkles, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import CoachLauncher from "./CoachLauncher";

type AppShellProps = {
  children: React.ReactNode;
  user: User;
};

const NAV_ITEMS = [
  { href: "/workspace",  label: "Bộ thẻ",      icon: LibraryBig },
  { href: "/generate",   label: "Tạo thẻ",     icon: Sparkles },
  { href: "/coach",      label: "Coach",       icon: Bot },
  { href: "/analytics",  label: "Thống kê",    icon: BarChart3 },
  { href: "/integrations", label: "Liên kết", icon: Plug },
];

export default function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    syncBrowserTimezone(user.id).catch(() => {
      /* non-critical */
    });
  }, [user.id]);

  const handleLogout = () => {
    clearStoredUser();
    router.push("/");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-transparent">
      {/* ── Sidebar (Desktop) ── */}
      <aside className="hidden md:flex flex-col w-[280px] sticky top-0 h-screen border-r border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md shadow-[6px_0_32px_rgba(0,0,0,0.05)] dark:shadow-[6px_0_32px_rgba(0,0,0,0.30)] p-6 gap-8 z-50">
        <div className="px-2 flex items-center justify-between gap-3">
          <Link href="/workspace" className="flex items-center gap-3 overflow-hidden outline-none">
            <div className="relative h-[42px] w-[42px]">
              <Image 
                src="/icon.svg" 
                alt="Memio Logo" 
                fill
                sizes="42px"
                className="object-contain mix-blend-multiply dark:mix-blend-normal flex-shrink-0" 
                priority
              />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              Memio
            </span>
          </Link>
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
                    ? "bg-[hsl(var(--acrylic-strong))] text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:bg-[hsl(var(--acrylic))] hover:text-foreground hover:translate-x-0.5"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-5 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-[hsl(var(--acrylic))] border border-border/60 truncate">
            {user.photo_url && !imgError ? (
              <Image
                src={user.photo_url}
                alt={user.name}
                width={32}
                height={32}
                className="rounded-full flex-shrink-0 w-8 h-8 object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted ring-1 ring-border/70 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-[14px] font-semibold text-foreground truncate">
              {user.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-center text-xs py-2"
          >
            <LogOut className="w-4 h-4" aria-hidden /> Đăng xuất
          </Button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-5 pt-8 pb-24 md:pt-10 md:pb-20">
        {children}
      </main>

      {/* ── Mobile bottom navigation ── */}
      <div className="fixed top-6 right-6 z-[101]">
        <ThemeToggle />
      </div>

      <nav className="md:hidden flex fixed bottom-0 left-0 right-0 h-[68px] bg-[hsl(var(--acrylic-strong))] border-t border-border backdrop-blur-md z-[100] pb-[env(safe-area-inset-bottom)] items-stretch shadow-[0_-6px_28px_rgba(0,0,0,0.06)]">
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
        <button
          type="button"
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors outline-none text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
        >
          <LogOut className="w-[22px] h-[22px]" strokeWidth={2} />
          <span className="text-[11px] font-bold">Thoát</span>
        </button>
      </nav>
      <CoachLauncher user={user} />
    </div>
  );
}
