"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Host-side accept / decline on a pending join request. */
export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "accept" | "decline") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(payload.error ?? "Action impossible");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={busy === "accept"}
          disabled={busy !== null}
          onClick={() => void decide("accept")}
        >
          Accepter
        </Button>
        <Button
          size="sm"
          variant="danger"
          loading={busy === "decline"}
          disabled={busy !== null}
          onClick={() => void decide("decline")}
        >
          Refuser
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
