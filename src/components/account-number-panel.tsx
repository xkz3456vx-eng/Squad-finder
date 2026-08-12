"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

/**
 * The account number replaces both e-mail and password, so this screen is the
 * one and only chance the user gets to write it down.
 */
export function AccountNumberPanel({
  accountNumber,
  compact = false,
}: {
  accountNumber: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="animate-fade-in p-5 sm:p-6">
      <h2 className="text-lg font-semibold">
        {compact ? "Ton numéro de compte" : "Compte créé 🎉"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        C&apos;est ta seule clé de connexion : pas d&apos;e-mail, pas de mot de
        passe. Note-la quelque part — sans elle, impossible de retrouver ce
        compte depuis un autre appareil.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 select-all rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-center font-mono text-lg tracking-[0.2em] text-accent">
          {accountNumber}
        </code>
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copié ✓" : "Copier"}
        </Button>
      </div>

      {!compact && (
        <Link href="/" className="focus-ring mt-5 block rounded-lg">
          <Button size="lg" className="w-full">
            J&apos;ai noté — voir les annonces
          </Button>
        </Link>
      )}
    </Card>
  );
}
