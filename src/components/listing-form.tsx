"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, TextArea, TextInput } from "@/components/ui";
import type { RobloxGame } from "@/lib/roblox/types";

type ResolvedGame = Pick<
  RobloxGame,
  "placeId" | "universeId" | "name" | "thumbnailUrl" | "gameUrl"
>;

export function ListingForm() {
  const router = useRouter();

  const [gameUrl, setGameUrl] = useState("");
  const [game, setGame] = useState<ResolvedGame | null>(null);
  const [gameName, setGameName] = useState("");
  const [manualGame, setManualGame] = useState(false);
  const [gameLookupError, setGameLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [privateServerLink, setPrivateServerLink] = useState("");
  const [slots, setSlots] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookupGame() {
    const url = gameUrl.trim();
    if (!url) {
      setGameLookupError("Colle l'URL du jeu Roblox");
      return;
    }

    setLookingUp(true);
    setGameLookupError(null);
    try {
      const res = await fetch(`/api/roblox/game?url=${encodeURIComponent(url)}`);
      const payload = (await res.json()) as
        | { game: RobloxGame }
        | { error: string };

      if (!res.ok || !("game" in payload)) {
        setManualGame(true);
        setGameLookupError(
          "Jeu non récupéré — saisis son nom à la main juste en dessous.",
        );
        return;
      }

      setGame(payload.game);
      setGameName(payload.game.name);
      setManualGame(false);
    } catch {
      setManualGame(true);
      setGameLookupError(
        "Roblox est injoignable — saisis le nom du jeu à la main.",
      );
    } finally {
      setLookingUp(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const name = gameName.trim();
    if (!name) {
      setError("Indique le jeu concerné (URL ou nom).");
      return;
    }

    setPending(true);
    setError(null);

    const parsedSlots = slots.trim() ? Number(slots) : null;

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim() || null,
          gameName: name,
          gameUrl: game?.gameUrl ?? (gameUrl.trim() || null),
          gamePlaceId: game?.placeId ?? null,
          gameUniverseId: game?.universeId ?? null,
          gameThumbnailUrl: game?.thumbnailUrl ?? null,
          privateServerLink: privateServerLink.trim() || null,
          slots:
            parsedSlots !== null && Number.isFinite(parsedSlots)
              ? parsedSlots
              : null,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        listing?: { id: string };
      };

      if (!res.ok || !payload.listing) {
        setError(payload.error ?? "Publication impossible");
        return;
      }

      router.push(`/listings/${payload.listing.id}`);
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
          label="URL du jeu Roblox"
          htmlFor="gameUrl"
          hint="Le titre et l'image du jeu sont récupérés automatiquement depuis le placeId."
          error={gameLookupError}
        >
          <div className="flex gap-2">
            <TextInput
              id="gameUrl"
              name="gameUrl"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.roblox.com/games/1818/Classic-Crossroads"
              value={gameUrl}
              onChange={(event) => {
                setGameUrl(event.target.value);
                setGameLookupError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void lookupGame();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              loading={lookingUp}
              onClick={() => void lookupGame()}
            >
              Récupérer
            </Button>
          </div>

          {game && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
              {game.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={game.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-12 w-20 shrink-0 rounded object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="grid h-12 w-20 shrink-0 place-items-center rounded bg-surface text-xl"
                >
                  🎮
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{game.name}</p>
                <p className="truncate text-xs text-muted">
                  placeId {game.placeId}
                </p>
              </div>
            </div>
          )}
        </Field>

        {(manualGame || !game) && (
          <Field
            label="Nom du jeu"
            htmlFor="gameName"
            required
            hint="Saisie manuelle, utilisée si la récupération automatique échoue."
          >
            <TextInput
              id="gameName"
              name="gameName"
              required
              maxLength={120}
              placeholder="Ex. Blox Fruits"
              value={gameName}
              onChange={(event) => setGameName(event.target.value)}
            />
          </Field>
        )}

        <Field label="Titre de l'annonce" htmlFor="title" required>
          <TextInput
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="Cherche 3 joueurs pour raid ce soir"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          required
          hint="Ce que tu cherches, le créneau, l'objectif…"
        >
          <TextArea
            id="description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            placeholder="On part sur du grind niveau 1500+, ambiance chill, 21h-23h."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Field
          label="Critères / préférences"
          htmlFor="requirements"
          hint="Facultatif : niveau minimum, micro obligatoire, tranche d'âge…"
        >
          <TextArea
            id="requirements"
            name="requirements"
            rows={2}
            maxLength={1000}
            placeholder="Micro conseillé, 16 ans et +"
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Lien de serveur privé"
            htmlFor="privateServerLink"
            hint="Facultatif. Sans lien, les joueurs acceptés sont invités à t'ajouter en ami."
          >
            <TextInput
              id="privateServerLink"
              name="privateServerLink"
              inputMode="url"
              maxLength={500}
              placeholder="https://www.roblox.com/share?code=…"
              value={privateServerLink}
              onChange={(event) => setPrivateServerLink(event.target.value)}
            />
          </Field>

          <Field
            label="Taille du crew"
            htmlFor="slots"
            hint="Facultatif. Hôte inclus."
          >
            <TextInput
              id="slots"
              name="slots"
              type="number"
              min={2}
              max={100}
              placeholder="4"
              value={slots}
              onChange={(event) => setSlots(event.target.value)}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={pending} className="w-full">
          Publier l&apos;annonce
        </Button>
      </form>
    </Card>
  );
}
