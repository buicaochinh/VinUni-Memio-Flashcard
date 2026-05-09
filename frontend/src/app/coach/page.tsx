"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "../../components/AppShell";
import CoachChat from "../../components/CoachChat";
import { useClientReady, useStoredUser } from "../../lib/app-client";

function CoachPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientReady = useClientReady();
  const user = useStoredUser();
  const rawThreadId = searchParams.get("threadId");
  const rawDeckId = searchParams.get("quizDeckId");
  const rawContextDeckId = searchParams.get("deckId");
  const rawCardIds = searchParams.get("cardIds");
  const initialPrompt = searchParams.get("prompt");
  const initialThreadId = rawThreadId && /^\d+$/.test(rawThreadId) ? Number(rawThreadId) : null;
  const initialQuizDeckId = rawDeckId && /^\d+$/.test(rawDeckId) ? Number(rawDeckId) : null;
  const contextDeckId = rawContextDeckId && /^\d+$/.test(rawContextDeckId) ? Number(rawContextDeckId) : null;
  const initialQuizCardIds = rawCardIds
    ? rawCardIds.split(",").map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : null;
  const shouldStartQuiz = searchParams.get("quiz") === "1";

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
        <CoachChat
          user={user}
          initialThreadId={initialThreadId}
          initialPrompt={initialPrompt ?? undefined}
          initialContextDeckId={contextDeckId}
          initialQuiz={shouldStartQuiz}
          initialQuizDeckId={initialQuizDeckId}
          initialQuizCardIds={initialQuizCardIds}
        />
      </section>
    </AppShell>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <CoachPageContent />
    </Suspense>
  );
}
