"use client";

import { useState } from "react";
import { Avatar, Button, Field, TextInput } from "@/components/ui";
import type { RobloxProfile } from "@/lib/roblox/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Fired when a lookup succeeds so the parent can pre-fill its own fields. */
  onResolved: (profile: RobloxProfile) => void;
  resolved: RobloxProfile | null;
};

/**
 * Paste a Roblox profile URL (or just a username) and pull the username,
 * display name and headshot from Roblox. Entirely optional: failing to resolve
 * never blocks the form, it just leaves the fields as typed.
 */
export function RobloxProfileField({
  value,
  onChange,
  onResolved,
  resolved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    const url = value.trim();
    if (!url) {
      setError("Colle une URL de profil ou un pseudo Roblox");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/roblox/profile?url=${encodeURIComponent(url)}`);
      const payload = (await res.json()) as
        | { profile: RobloxProfile }
        | { error: string };

      if (!res.ok || !("profile" in payload)) {
        setError(
          "error" in payload
            ? payload.error
            : "Profil introuvable — tu peux remplir les champs à la main.",
        );
        return;
      }
      onResolved(payload.profile);
    } catch {
      setError("Roblox est injoignable — remplis les champs à la main.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Field
      label="Profil Roblox"
      htmlFor="robloxProfileUrl"
      hint="Colle l'URL de ton profil (roblox.com/users/…) pour remplir automatiquement ton pseudo et ta photo."
      error={error}
    >
      <div className="flex gap-2">
        <TextInput
          id="robloxProfileUrl"
          name="robloxProfileUrl"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.roblox.com/users/1/profile"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void lookup();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={() => void lookup()}
        >
          Récupérer
        </Button>
      </div>

      {resolved && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <Avatar
            src={resolved.avatarUrl}
            name={resolved.displayName ?? resolved.username}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {resolved.displayName ?? resolved.username}
            </p>
            <p className="truncate text-xs text-muted">@{resolved.username}</p>
          </div>
        </div>
      )}
    </Field>
  );
}
