/**
 * Thin, defensive wrapper over the public Roblox web APIs.
 *
 * Design rules enforced here:
 *  - every outbound request is time-boxed and every failure surfaces as a
 *    `RobloxApiError`, so callers can degrade (e.g. manual game-name entry)
 *    instead of crashing;
 *  - responses are untrusted: every field is narrowed before use;
 *  - secondary data (avatar, thumbnail, universe, creator, player count) never
 *    fails the whole call — it degrades to `null`;
 *  - successful lookups are memoised in-process for 10 minutes.
 */

import type { RobloxGame, RobloxProfile } from "@/lib/roblox/types";
import {
  parseRobloxGameUrl,
  parseRobloxProfileUrl,
  robloxGameUrl,
  robloxProfileUrl,
  type RobloxProfileRef,
} from "@/lib/roblox/parse";

export class RobloxApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RobloxApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 10 * 60 * 1_000;

/* -------------------------------------------------------------------------- */
/* cache                                                                       */
/* -------------------------------------------------------------------------- */

type CacheEntry<T> = { value: T; expiresAt: number };

class TtlCache<K, V> {
  readonly #entries = new Map<K, CacheEntry<V>>();

  constructor(private readonly ttlMs: number) {}

  get(key: K): V | undefined {
    const hit = this.#entries.get(key);
    if (hit === undefined) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: K, value: V): void {
    this.#entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

/** Keys: `id:<userId>` and `name:<lowercased username>`. */
const profileCache = new TtlCache<string, RobloxProfile>(CACHE_TTL_MS);
const gameCache = new TtlCache<number, RobloxGame>(CACHE_TTL_MS);

/* -------------------------------------------------------------------------- */
/* untrusted-JSON helpers                                                      */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asPositiveInt(value: unknown): number | null {
  const num = asNumber(value);
  return num !== null && Number.isSafeInteger(num) && num > 0 ? num : null;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const data = value["data"];
  if (!Array.isArray(data)) return null;
  const head: unknown = data[0];
  return isRecord(head) ? head : null;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return `timed out after ${DEFAULT_TIMEOUT_MS}ms`;
    }
    return error.message === "" ? error.name : error.message;
  }
  return String(error);
}

/* -------------------------------------------------------------------------- */
/* transport                                                                   */
/* -------------------------------------------------------------------------- */

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
};

async function fetchJson(url: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
  } catch (error) {
    throw new RobloxApiError(`Roblox request failed (${url}): ${describeError(error)}`);
  }

  if (!response.ok) {
    throw new RobloxApiError(
      `Roblox API returned ${response.status} ${response.statusText} for ${url}`,
      response.status,
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch (error) {
    throw new RobloxApiError(`Roblox API returned invalid JSON (${url}): ${describeError(error)}`);
  }
}

/** Runs a secondary lookup, swallowing every failure into `null`. */
async function optional<T>(work: () => Promise<T | null>): Promise<T | null> {
  try {
    return await work();
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* profiles                                                                    */
/* -------------------------------------------------------------------------- */

type Identity = { id: number; name: string; displayName: string | null };

function toIdentity(source: Record<string, unknown> | null, context: string): Identity {
  if (source === null) {
    throw new RobloxApiError(`Roblox returned an unexpected payload for ${context}`);
  }
  const id = asPositiveInt(source["id"]);
  const name = asString(source["name"]);
  if (id === null || name === null) {
    throw new RobloxApiError(`Roblox returned an incomplete user record for ${context}`);
  }
  return { id, name, displayName: asString(source["displayName"]) };
}

async function fetchAvatarUrl(userId: number): Promise<string | null> {
  const payload = await fetchJson(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
  );
  const head = firstRecord(payload);
  if (head === null) return null;
  if (asString(head["state"]) !== "Completed") return null;
  return asString(head["imageUrl"]);
}

async function fetchIdentityById(userId: number): Promise<Identity> {
  const payload = await fetchJson(`https://users.roblox.com/v1/users/${userId}`);
  return toIdentity(isRecord(payload) ? payload : null, `user ${userId}`);
}

async function fetchIdentityByUsername(username: string): Promise<Identity> {
  const payload = await fetchJson("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    body: { usernames: [username], excludeBannedUsers: false },
  });
  const head = firstRecord(payload);
  if (head === null) {
    throw new RobloxApiError(`No Roblox user found for username "${username}"`, 404);
  }
  return toIdentity(head, `username "${username}"`);
}

/**
 * Resolves a Roblox profile by id or username.
 *
 * Throws `RobloxApiError` when the identity lookup fails; the avatar is
 * best-effort and degrades to `null`.
 */
export async function fetchRobloxProfile(ref: RobloxProfileRef): Promise<RobloxProfile> {
  const cacheKey =
    ref.kind === "id" ? `id:${ref.userId}` : `name:${ref.username.trim().toLowerCase()}`;

  const cached = profileCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let identity: Identity;
  if (ref.kind === "id") {
    if (!Number.isSafeInteger(ref.userId) || ref.userId <= 0) {
      throw new RobloxApiError(`Invalid Roblox user id: ${String(ref.userId)}`);
    }
    identity = await fetchIdentityById(ref.userId);
  } else {
    const username = ref.username.trim();
    if (username === "") throw new RobloxApiError("Invalid Roblox username: empty string");
    identity = await fetchIdentityByUsername(username);
  }

  const avatarUrl = await optional(() => fetchAvatarUrl(identity.id));

  const profile: RobloxProfile = {
    robloxUserId: identity.id,
    username: identity.name,
    displayName: identity.displayName,
    avatarUrl,
    profileUrl: robloxProfileUrl(identity.id),
  };

  profileCache.set(`id:${profile.robloxUserId}`, profile);
  profileCache.set(`name:${profile.username.toLowerCase()}`, profile);
  return profile;
}

/* -------------------------------------------------------------------------- */
/* games                                                                       */
/* -------------------------------------------------------------------------- */

type GameInfo = {
  name: string;
  description: string | null;
  creatorName: string | null;
  playing: number | null;
};

async function fetchUniverseId(placeId: number): Promise<number | null> {
  const payload = await fetchJson(
    `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
  );
  return isRecord(payload) ? asPositiveInt(payload["universeId"]) : null;
}

async function fetchGameInfo(universeId: number): Promise<GameInfo | null> {
  const payload = await fetchJson(
    `https://games.roblox.com/v1/games?universeIds=${universeId}`,
  );
  const head = firstRecord(payload);
  if (head === null) return null;

  const name = asString(head["name"]);
  if (name === null) return null;

  const creator = head["creator"];
  return {
    name,
    description: asString(head["description"]),
    creatorName: isRecord(creator) ? asString(creator["name"]) : null,
    playing: asNumber(head["playing"]),
  };
}

async function fetchGameThumbnail(universeId: number): Promise<string | null> {
  const payload = await fetchJson(
    `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&size=768x432&format=Png&countPerUniverse=1&defaults=true`,
  );
  const head = firstRecord(payload);
  if (head === null) return null;

  const thumbnails = head["thumbnails"];
  if (!Array.isArray(thumbnails)) return null;
  const first: unknown = thumbnails[0];
  if (!isRecord(first)) return null;
  if (asString(first["state"]) !== "Completed") return null;
  return asString(first["imageUrl"]);
}

/**
 * Resolves an experience by place id.
 *
 * Never throws for upstream failures: when Roblox cannot be reached, or the
 * universe/game lookup does not yield a name, a degraded record is returned
 * (`name: "Place <id>"`, null secondary fields) so the UI can fall back to
 * manual entry. Only a structurally invalid `placeId` throws.
 */
export async function fetchRobloxGame(placeId: number): Promise<RobloxGame> {
  if (!Number.isSafeInteger(placeId) || placeId <= 0) {
    throw new RobloxApiError(`Invalid Roblox place id: ${String(placeId)}`);
  }

  const cached = gameCache.get(placeId);
  if (cached !== undefined) return cached;

  const gameUrl = robloxGameUrl(placeId);
  const universeId = await optional(() => fetchUniverseId(placeId));

  const degraded: RobloxGame = {
    placeId,
    universeId,
    name: `Place ${placeId}`,
    description: null,
    thumbnailUrl: null,
    gameUrl,
    creatorName: null,
    playing: null,
  };

  if (universeId === null) return degraded;

  const info = await optional(() => fetchGameInfo(universeId));
  if (info === null) return degraded;

  const thumbnailUrl = await optional(() => fetchGameThumbnail(universeId));

  const game: RobloxGame = {
    placeId,
    universeId,
    name: info.name,
    description: info.description,
    thumbnailUrl,
    gameUrl,
    creatorName: info.creatorName,
    playing: info.playing,
  };

  gameCache.set(placeId, game);
  return game;
}

/* -------------------------------------------------------------------------- */
/* url entry points                                                            */
/* -------------------------------------------------------------------------- */

/** Parses a pasted profile link/id/username, then fetches it. */
export async function resolveProfileFromUrl(input: string): Promise<RobloxProfile> {
  const ref = parseRobloxProfileUrl(input);
  if (ref === null) {
    throw new RobloxApiError("That does not look like a Roblox profile link or username");
  }
  return fetchRobloxProfile(ref);
}

/** Parses a pasted experience link/id, then fetches it. */
export async function resolveGameFromUrl(input: string): Promise<RobloxGame> {
  const placeId = parseRobloxGameUrl(input);
  if (placeId === null) {
    throw new RobloxApiError("That does not look like a Roblox experience link");
  }
  return fetchRobloxGame(placeId);
}
