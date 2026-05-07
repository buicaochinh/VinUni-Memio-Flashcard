"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Maximize2, X } from "lucide-react";
import { User } from "../lib/app-client";
import CoachChat from "./CoachChat";

export default function CoachLauncher({ user }: { user: User }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[160] h-[min(680px,calc(100vh-140px))] w-[min(420px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            <Link
              href="/coach"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background/90 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Mở trang Memio Coach"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background/90 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Đóng Memio Coach"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <CoachChat user={user} compact />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-5 z-[159] inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-[hsl(var(--primary-foreground))] shadow-xl transition-[opacity,transform] hover:opacity-95 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
        aria-label="Mở Memio Coach"
      >
        <Bot className="h-6 w-6" aria-hidden />
      </button>
    </>
  );
}
