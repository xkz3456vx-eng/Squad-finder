import { NextResponse } from "next/server";
import { ApiError, handler } from "@/lib/api";
import { fetchRobloxProfile, RobloxApiError } from "@/lib/roblox/client";
import { parseRobloxProfileUrl } from "@/lib/roblox/parse";

export const runtime = "nodejs";

/**
 * Resolves a pasted Roblox profile URL (or username, or user id) into a
 * username / display name / headshot. Proxied server-side so the browser never
 * hits Roblox directly and CORS is a non-issue.
 *
 * Open to signed-out visitors: the sign-up form needs it before an account
 * exists.
 */
async function resolve(rawUrl: string | null) {
  const input = rawUrl?.trim();
  if (!input) throw new ApiError("Paramètre `url` manquant", 400);

  // Distinguish "you typed something that isn't a Roblox link" (the user's
  // problem, 400) from "Roblox did not answer" (ours, 502).
  const ref = parseRobloxProfileUrl(input);
  if (!ref) {
    throw new ApiError(
      "Ce lien ne ressemble pas à un profil Roblox. Colle une URL roblox.com/users/… ou un pseudo.",
      400,
    );
  }

  try {
    return await fetchRobloxProfile(ref);
  } catch (error) {
    if (error instanceof RobloxApiError) {
      throw new ApiError(
        "Profil Roblox introuvable ou service injoignable. Remplis les champs à la main.",
        502,
      );
    }
    throw error;
  }
}

export const GET = handler(async (request) => {
  const profile = await resolve(new URL(request.url).searchParams.get("url"));
  return NextResponse.json({ profile });
});

export const POST = handler(async (request) => {
  const { url } = (await request.json()) as { url?: string };
  const profile = await resolve(url ?? null);
  return NextResponse.json({ profile });
});
