/**
 * Tolerant parsing of the Roblox URLs / identifiers users paste into the app.
 *
 * Everything here is pure and synchronous — no network, no side effects — so it
 * is safe to run on the client, during form validation, or in tests.
 */

export type RobloxProfileRef =
  | { kind: "id"; userId: number }
  | { kind: "username"; username: string };

const ROBLOX_APEX = "roblox.com";

/**
 * Roblox username rules we enforce for bare tokens:
 * 3-20 characters, alphanumeric, with at most one underscore that may not sit
 * at either end.
 */
const USERNAME_RE = /^(?=.{3,20}$)[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)?$/;

/** A token that plausibly starts with `host.tld` so it can be given a scheme. */
const SCHEMELESS_HOST_RE = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?=[/?#]|$)/;

function isPositiveInt(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** Strictly parses a decimal id string; returns null for anything else. */
function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return isPositiveInt(value) ? value : null;
}

/**
 * Only `roblox.com` and its subdomains (www., web., m., ...) are accepted.
 * Lookalikes such as `notroblox.com` or `roblox.com.evil.net` are rejected.
 */
function isRobloxHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === ROBLOX_APEX || host.endsWith(`.${ROBLOX_APEX}`);
}

/**
 * Turns user input into a URL when — and only when — it really looks like one.
 * Bare tokens ("Builderman", "12345") return null so callers can fall through
 * to the id/username interpretation.
 */
function toUrl(input: string): URL | null {
  let candidate = input.trim();
  if (candidate === "") return null;

  // Protocol-relative links ("//www.roblox.com/users/1").
  if (candidate.startsWith("//")) candidate = candidate.slice(2);

  let parsed: URL | null = null;
  try {
    parsed = new URL(candidate);
  } catch {
    parsed = null;
  }

  if (parsed !== null) {
    // A non-web scheme is never a Roblox link we can trust.
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  }

  if (!SCHEMELESS_HOST_RE.test(candidate)) return null;
  try {
    return new URL(`https://${candidate}`);
  } catch {
    return null;
  }
}

/** Non-empty, decoded path segments, e.g. "/users/1/profile" -> ["users","1","profile"]. */
function segments(url: URL): string[] {
  return url.pathname.split("/").filter((part) => part.length > 0);
}

/** Case-insensitive query-param lookup (Roblox mixes `placeId` and `PlaceId`). */
function param(url: URL, name: string): string | null {
  const exact = url.searchParams.get(name);
  if (exact !== null) return exact;

  const wanted = name.toLowerCase();
  let found: string | null = null;
  url.searchParams.forEach((value, key) => {
    if (found === null && key.toLowerCase() === wanted) found = value;
  });
  return found;
}

/** True when `token` is a syntactically valid Roblox username. */
export function isValidRobloxUsername(token: string): boolean {
  return USERNAME_RE.test(token);
}

/**
 * Parses a pasted profile reference.
 *
 * Accepts full/partial URLs (`https://www.roblox.com/users/1/profile`,
 * `m.roblox.com/users/1`, `roblox.com/user.aspx?username=Foo`,
 * `roblox.com/users/profile?username=Foo`), a bare numeric id, or a bare
 * username. Returns null when nothing usable can be extracted.
 */
export function parseRobloxProfileUrl(input: string): RobloxProfileRef | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const url = toUrl(trimmed);

  if (url === null) {
    const byId = parseId(trimmed);
    if (byId !== null) return { kind: "id", userId: byId };
    if (isValidRobloxUsername(trimmed)) return { kind: "username", username: trimmed };
    return null;
  }

  if (!isRobloxHost(url.hostname)) return null;

  const parts = segments(url);
  const first = parts[0]?.toLowerCase();

  // roblox.com/user.aspx?username=Foo  (legacy) and /profile?username=Foo
  if (first === "user.aspx" || first === "profile") {
    return refFromQuery(url);
  }

  if (first === "users") {
    const second = parts[1];
    if (second === undefined) return refFromQuery(url);

    const byId = parseId(second);
    if (byId !== null) return { kind: "id", userId: byId };

    // roblox.com/users/profile?username=Foo | ?userId=123
    if (second.toLowerCase() === "profile") return refFromQuery(url);
    return null;
  }

  return null;
}

function refFromQuery(url: URL): RobloxProfileRef | null {
  const byId = parseId(param(url, "userId") ?? undefined);
  if (byId !== null) return { kind: "id", userId: byId };

  const username = (param(url, "username") ?? "").trim();
  if (username !== "" && isValidRobloxUsername(username)) {
    return { kind: "username", username };
  }
  return null;
}

/**
 * Parses a pasted game reference and returns the placeId.
 *
 * Accepts `roblox.com/games/1818/Classic-Crossroads`, `roblox.com/games/1818`,
 * query strings, the `games/start?placeId=1818` share form, and a bare numeric
 * id. Returns null for anything else.
 */
export function parseRobloxGameUrl(input: string): number | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const url = toUrl(trimmed);
  if (url === null) return parseId(trimmed);

  if (!isRobloxHost(url.hostname)) return null;

  const parts = segments(url);
  if (parts[0]?.toLowerCase() !== "games") return null;

  const second = parts[1];
  if (second === undefined) return parseId(param(url, "placeId") ?? undefined);

  const byId = parseId(second);
  if (byId !== null) return byId;

  // games/start?placeId=1818, games/refer?PlaceId=1818, ...
  return parseId(param(url, "placeId") ?? undefined);
}

/** Canonical profile URL for a Roblox user id. */
export function robloxProfileUrl(userId: number): string {
  return `https://www.roblox.com/users/${userId}/profile`;
}

/** Canonical experience URL for a Roblox place id. */
export function robloxGameUrl(placeId: number): string {
  return `https://www.roblox.com/games/${placeId}`;
}
