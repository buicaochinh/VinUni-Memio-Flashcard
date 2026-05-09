"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ImagesRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const deckId = searchParams.get("deckId");
    router.replace(`/generate?mode=image${deckId ? `&deckId=${deckId}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function ImagesRedirect() {
  return (
    <Suspense>
      <ImagesRedirectInner />
    </Suspense>
  );
}
