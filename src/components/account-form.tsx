"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { RobloxProfileField } from "./roblox-profile-field";
import { AccountNumberPanel } from "./account-number-panel";
import { AGE_RANGES } from "@/lib/validation";
import type { RobloxProfile } from "@/lib/roblox/types";
import type { PublicAccount } from "@/lib/auth/session";

type Props =
  | { mode: "register"; account?: undefined }
  | { mode: "edit"; account: PublicAccount };

export function AccountForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.account : null;

  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [profileUrl, setProfileUrl] = useState(initial?.robloxProfileUrl ?? "");
  const [ageRange, setAgeRange] = useState(initial?.ageRange ?? "");
  const [voice, setVoice] = useState(
    initial?.hasVoiceChat === null || initial?.hasVoiceChat === undefined
      ? ""
      : initial.hasVoiceChat
        ? "yes"
        : "no",
  );

  const [resolved, setResolved] = useState<RobloxProfile | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function applyProfile(profile: RobloxProfile) {
    setResolved(profile);
    setUsername(profile.username);
    if (profile.displayName) setDisplayName(profile.displayName);
    setProfileUrl(profile.profileUrl);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim()) {
      setError("Le nom d'utilisateur est requis");
      return;
    }

    setPending(true);
    setError(null);
    setSaved(false);

    const body = {
      username: username.trim(),
      displayName: displayName.trim() || null,
      robloxProfileUrl: profileUrl.trim() || null,
      robloxUserId: resolved?.robloxUserId ?? initial?.robloxUserId ?? null,
      avatarUrl: resolved?.avatarUrl ?? initial?.avatarUrl ?? null,
      ageRange: ageRange || null,
      hasVoiceChat: voice === "" ? null : voice === "yes",
    };

    try {
      const res = await fetch(
        props.mode === "register" ? "/api/auth/register" : "/api/auth/me",
        {
          method: props.mode === "register" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await res.json()) as {
        error?: string;
        accountNumber?: string;
      };

      if (!res.ok) {
        setError(payload.error ?? "Une erreur est survenue");
        return;
      }

      if (props.mode === "register" && payload.accountNumber) {
        setAccountNumber(payload.accountNumber);
      } else {
        setSaved(true);
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur");
    } finally {
      setPending(false);
    }
  }

  if (accountNumber) {
    return <AccountNumberPanel accountNumber={accountNumber} />;
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <RobloxProfileField
          value={profileUrl}
          onChange={setProfileUrl}
          onResolved={applyProfile}
          resolved={resolved}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nom d'utilisateur"
            htmlFor="username"
            required
            hint="Il n'a pas besoin d'être unique."
          >
            <TextInput
              id="username"
              name="username"
              required
              maxLength={50}
              autoComplete="off"
              placeholder="Builderman"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>

          <Field label="Pseudo affiché" htmlFor="displayName" hint="Facultatif.">
            <TextInput
              id="displayName"
              name="displayName"
              maxLength={50}
              autoComplete="off"
              placeholder="Le Boss"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Field>

          <Field label="Tranche d'âge" htmlFor="ageRange" hint="Facultatif.">
            <Select
              id="ageRange"
              name="ageRange"
              value={ageRange}
              onChange={(event) => setAgeRange(event.target.value)}
            >
              <option value="">Ne pas préciser</option>
              {AGE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range} ans
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Voice Chat" htmlFor="voice" hint="Facultatif.">
            <Select
              id="voice"
              name="voice"
              value={voice}
              onChange={(event) => setVoice(event.target.value)}
            >
              <option value="">Ne pas préciser</option>
              <option value="yes">Oui, je l&apos;ai</option>
              <option value="no">Non</option>
            </Select>
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-success">
            Profil enregistré.
          </p>
        )}

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {props.mode === "register"
            ? "Créer mon compte"
            : "Enregistrer les modifications"}
        </Button>
      </form>
    </Card>
  );
}
