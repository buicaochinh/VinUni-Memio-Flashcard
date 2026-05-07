"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import CoachChat from "../../components/CoachChat";
import { useClientReady, useStoredUser } from "../../lib/app-client";

export default function CoachPage() {
  const router = useRouter();
  const clientReady = useClientReady();
  const user = useStoredUser();

  useEffect(() => {
    if (!clientReady) return;
    if (!user) {
      router.replace("/");
    }
  }, [clientReady, router, user]);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <section className="h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-border bg-background/70 shadow-sm">
        <CoachChat user={user} />
      </section>
    </AppShell>
  );
}
