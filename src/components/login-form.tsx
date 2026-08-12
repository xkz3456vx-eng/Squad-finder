"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, TextInput } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber }),
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(payload.error ?? "Connexion impossible");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label="Numéro de compte"
          htmlFor="accountNumber"
          required
          hint="Le code reçu à la création du compte. Les tirets et la casse n'ont pas d'importance."
          error={error}
        >
          <TextInput
            id="accountNumber"
            name="accountNumber"
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="RBX-7K3M-9QW2-XT4A"
            className="text-center font-mono tracking-[0.15em] uppercase"
            value={accountNumber}
            onChange={(event) => {
              setAccountNumber(event.target.value);
              setError(null);
            }}
          />
        </Field>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          Se connecter
        </Button>

        <p className="text-center text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link href="/onboarding" className="focus-ring rounded text-accent">
            En créer un
          </Link>
        </p>
      </form>
    </Card>
  );
}
