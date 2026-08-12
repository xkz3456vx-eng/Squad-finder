"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, TextArea } from "@/components/ui";

type Props = {
  listingId: string;
  status: "pending" | "accepted" | "declined" | null;
  signedIn: boolean;
  closed: boolean;
  full: boolean;
};

export function JoinButton({ listingId, status, signedIn, closed, full }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "accepted") {
    return (
      <Link href={`/crew/${listingId}`} className="focus-ring block rounded-lg">
        <Button size="lg" className="w-full">
          Ouvrir le crew →
        </Button>
      </Link>
    );
  }

  if (status === "pending") {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-4 text-center text-sm">
        <Badge tone="warn">En attente</Badge>
        <p className="mt-2 text-muted">
          Ta demande a été envoyée. Tu accéderas au crew dès que l&apos;hôte
          l&apos;aura acceptée.
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-4 text-center text-sm text-muted">
        L&apos;hôte a refusé ta demande pour cette annonce.
      </div>
    );
  }

  if (!signedIn) {
    return (
      <Link href="/onboarding" className="focus-ring block rounded-lg">
        <Button size="lg" className="w-full">
          Créer un compte pour rejoindre
        </Button>
      </Link>
    );
  }

  if (closed || full) {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-4 text-center text-sm text-muted">
        {closed ? "Cette annonce est fermée." : "Le crew est complet."}
      </div>
    );
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || null }),
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(payload.error ?? "Demande impossible");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        Demander à rejoindre
      </Button>
    );
  }

  return (
    <div className="animate-fade-in space-y-3">
      <TextArea
        rows={3}
        maxLength={500}
        autoFocus
        placeholder="Un mot pour l'hôte (facultatif) : ton niveau, tes dispos…"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          loading={pending}
          onClick={() => void send()}
        >
          Envoyer la demande
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
