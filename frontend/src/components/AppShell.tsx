"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredUser, fetchNotifications, fetchUserXP, NotificationAlert, syncBrowserTimezone, User, UserXP } from "../lib/app-client";
import { BarChart3, Bell, Bot, ChevronLeft, ChevronRight, LibraryBig, LogOut, Plug, Settings, Sparkles, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import CoachLauncher from "./CoachLauncher";

type AppShellProps = {
  children: React.ReactNode;
  user: User | null;
};

const NAV_ITEMS = [
  { href: "/workspace",    label: "Bộ thẻ",   icon: LibraryBig },
  { href: "/generate",     label: "Tạo thẻ",  icon: Sparkles },
  { href: "/coach",        label: "Coach",    icon: Bot },
  { href: "/analytics",    label: "Thống kê", icon: BarChart3 },
  { href: "/integrations", label: "Liên kết", icon: Plug },
];

const PAGE_LABELS: Record<string, string> = {
  "/workspace":    "Bộ thẻ",
  "/generate":     "Tạo thẻ",
  "/coach":        "Coach",
  "/analytics":    "Thống kê",
  "/integrations": "Liên kết",
  "/settings":     "Cài đặt",
};

const NOTIF_ICONS: Record<string, string> = {
  due_cards:    "📚",
  streak_risk:  "🔥",
  exam_urgency: "⏰",
};

export default function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [xp, setXp] = useState<UserXP | null>(null);
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [transitionReady, setTransitionReady] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Enable transition only after first paint — prevents animation on mount/navigation
  useEffect(() => { setTransitionReady(true); }, []);

  useEffect(() => {
    if (!user) return;
    syncBrowserTimezone().catch(() => {});
    fetchUserXP().then(setXp).catch(() => {});
    fetchNotifications().then(setNotifications).catch(() => {});
  }, [user?.id, pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const handleLogout = () => {
    clearStoredUser();
    router.push("/");
  };

  const dismissNotif = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
    setNotifOpen(false);
  };

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  const pageLabel = PAGE_LABELS[pathname] ?? "";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-transparent">

      {/* ── Sidebar wrapper (Desktop) ── */}
      <div
        className={cn(
          "hidden md:block relative flex-shrink-0 z-50",
          transitionReady && "transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[280px]"
        )}
      >
        {/* Sticky inner: aside + toggle button stick together on scroll */}
        <div className="sticky top-0 h-screen">
        <aside
          className={cn(
            "flex flex-col w-full h-full border-r border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md shadow-[6px_0_32px_rgba(0,0,0,0.05)] dark:shadow-[6px_0_32px_rgba(0,0,0,0.30)] overflow-hidden",
            transitionReady && "transition-[padding,gap] duration-300 ease-in-out",
            collapsed ? "p-3 gap-5 items-center" : "p-6 gap-8"
          )}
        >
          {/* Logo */}
          <div className={cn("flex items-center w-full", collapsed ? "justify-center" : "px-2")}>
            {collapsed ? (
              <Link href="/" className="outline-none" title="Memio">
                <div className="relative h-8 w-8">
                  <Image
                    src="/icon.svg"
                    alt="Memio"
                    fill
                    sizes="32px"
                    className="object-contain mix-blend-multiply dark:mix-blend-normal"
                    priority
                  />
                </div>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-3 overflow-hidden outline-none">
                <div className="relative h-[42px] w-[42px] flex-shrink-0">
                  <Image
                    src="/icon.svg"
                    alt="Memio Logo"
                    fill
                    sizes="42px"
                    className="object-contain mix-blend-multiply dark:mix-blend-normal"
                    priority
                  />
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-foreground whitespace-nowrap">
                  Memio
                </span>
              </Link>
            )}
          </div>

          {/* Nav */}
          <nav className={cn("flex flex-col gap-2 flex-1 w-full", collapsed && "items-center")}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-2xl font-semibold transition-all duration-200 outline-none",
                    collapsed
                      ? "justify-center w-11 h-11 p-0"
                      : "gap-3 px-4 py-3 w-full hover:translate-x-0.5",
                    isActive
                      ? "bg-[hsl(var(--acrylic-strong))] text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:bg-[hsl(var(--acrylic))] hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={cn("border-t border-border w-full pt-4", collapsed ? "flex flex-col items-center gap-3" : "flex flex-col gap-4")}>
            {collapsed ? (
              <>
                <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-border/70 flex-shrink-0">
                  {!user ? (
                    <div className="w-full h-full bg-muted/60 animate-pulse" />
                  ) : user.photo_url && !imgError ? (
                    <Image
                      src={user.photo_url}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="w-11 h-11 flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : !user ? (
              <div className="flex flex-col gap-2 px-3 py-2 rounded-2xl bg-[hsl(var(--acrylic))] border border-border/60 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted/70 flex-shrink-0" />
                  <div className="h-3.5 w-24 rounded-full bg-muted/70" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/50" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 px-3 py-2 rounded-2xl bg-[hsl(var(--acrylic))] border border-border/60">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <span className="text-[14px] font-semibold text-foreground truncate">{user.name}</span>
                  </div>
                  {xp && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[0.72rem]">
                        <span className="font-semibold text-primary">Lv.{xp.level} {xp.level_name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {xp.is_max_level ? `${xp.total_xp} XP` : `${xp.xp_to_next} XP còn`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-700"
                          style={{ width: `${xp.progress_pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-center text-xs py-2">
                  <LogOut className="w-4 h-4" aria-hidden /> Đăng xuất
                </Button>
              </>
            )}
          </div>
        </aside>

        {/* Toggle button on the right border */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={collapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
          className="absolute -right-3 top-14 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border/80 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 hover:shadow-primary/10 transition-all z-[60]"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />
          }
        </button>
        </div>
      </div>

      {/* ── Right column: header + content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* ── Top Header ── */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 h-14 border-b border-border bg-[hsl(var(--acrylic-strong))] backdrop-blur-md">

          {/* Left: logo (mobile) or page title (desktop) */}
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden flex items-center gap-2 outline-none">
              <div className="relative h-7 w-7">
                <Image
                  src="/icon.svg"
                  alt="Memio"
                  fill
                  sizes="28px"
                  className="object-contain mix-blend-multiply dark:mix-blend-normal"
                  priority
                />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">Memio</span>
            </Link>
            {pageLabel && (
              <h1 className="hidden md:block text-base font-bold text-foreground">{pageLabel}</h1>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1">

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Thông báo"
              >
                <Bell className="w-[18px] h-[18px]" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[0.55rem] font-bold flex items-center justify-center leading-none">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[300px] bg-[hsl(var(--acrylic-strong))] backdrop-blur-md border border-border rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                    <p className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">Thông báo</p>
                    {notifications.length > 0 && (
                      <span className="text-[0.72rem] font-bold text-primary">{notifications.length} mới</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[0.85rem] text-muted-foreground">
                      Không có thông báo mới.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/40 max-h-[360px] overflow-y-auto">
                      {notifications.map((n, i) => (
                        <Link
                          key={i}
                          href="/workspace"
                          onClick={() => dismissNotif(i)}
                          className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                        >
                          <span className="text-xl leading-none mt-0.5 flex-shrink-0">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                          <div className="min-w-0">
                            <p className="text-[0.84rem] font-semibold text-foreground leading-snug">{n.title}</p>
                            <p className="text-[0.76rem] text-muted-foreground leading-snug mt-0.5">{n.body}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2.5 border-t border-border/50">
                    <Link
                      href="/settings"
                      onClick={() => setNotifOpen(false)}
                      className="text-[0.75rem] font-semibold text-primary hover:underline"
                    >
                      Cài đặt thông báo →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                pathname === "/settings"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label="Cài đặt"
            >
              <Settings className="w-[18px] h-[18px]" />
            </Link>

            <ThemeToggle />
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-5 pt-8 pb-24 md:pb-20">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
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

      {user && pathname !== "/coach" && <CoachLauncher user={user} />}
    </div>
  );
}
