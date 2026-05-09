"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ImagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const deckId = searchParams.get("deckId");
    router.replace(`/generate?mode=image${deckId ? `&deckId=${deckId}` : ""}`);
  }, [router, searchParams]);

  return null;
}
