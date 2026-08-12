import { NextResponse } from "next/server";
import { ApiError, handler } from "@/lib/api";
import { fetchRobloxGame, RobloxApiError } from "@/lib/roblox/client";
import { parseRobloxGameUrl } from "@/lib/roblox/parse";

export const runtime = "nodejs";

/**
 * Resolves a Roblox game URL into { placeId, name, thumbnail }. When Roblox is
 * unreachable the lookup degrades to `Place <id>` with no artwork rather than
 * failing, and the listing form still lets the host type the game name by
 * hand — publishing never depends on Roblox being up.
 */
export const GET = handler(async (request) => {
  const input = new URL(request.url).searchParams.get("url")?.trim();
  if (!input) throw new ApiError("Paramètre `url` manquant", 400);

  const placeId = parseRobloxGameUrl(input);
  if (placeId === null) {
    throw new ApiError(
      "Ce lien ne ressemble pas à un jeu Roblox. Colle une URL roblox.com/games/… ou saisis le nom du jeu.",
      400,
    );
  }

  try {
    return NextResponse.json({ game: await fetchRobloxGame(placeId) });
  } catch (error) {
    if (error instanceof RobloxApiError) {
      throw new ApiError(
        "Jeu Roblox introuvable ou service injoignable. Saisis le nom du jeu à la main.",
        502,
      );
    }
    throw error;
  }
});
