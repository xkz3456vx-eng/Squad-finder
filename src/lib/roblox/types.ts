/**
 * Shared shapes for the Roblox integration.
 *
 * These are the only structures the rest of the app should depend on — the raw
 * Roblox API payloads are untrusted external data and never leak past
 * `src/lib/roblox/client.ts`.
 */

export type RobloxProfile = {
  robloxUserId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string;
};

export type RobloxGame = {
  placeId: number;
  universeId: number | null;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  gameUrl: string;
  creatorName: string | null;
  playing: number | null;
};
