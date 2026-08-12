"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ListingStatusToggle({
  listingId,
  status,
}: {
  listingId: string;
  status: "open" | "closed";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const next = status === "open" ? "closed" : "open";

  async function toggle() {
    setPending(true);
    try {
      await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size="lg"
      variant="secondary"
      loading={pending}
      onClick={() => void toggle()}
    >
      {status === "open" ? "Fermer l'annonce" : "Rouvrir l'annonce"}
    </Button>
  );
}
