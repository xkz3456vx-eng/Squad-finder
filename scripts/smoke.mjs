/**
 * Bout-en-bout du parcours complet contre un serveur qui tourne :
 * inscription anonyme, reconnexion par numéro de compte, publication
 * d'annonce, demande de rejoindre, validation par l'hôte, chat de crew en SSE,
 * et le contrôle d'accès à chaque étape.
 *
 *   npm run build && npm run start &
 *   SMOKE_BASE=http://127.0.0.1:3000 node scripts/smoke.mjs
 *
 * À lancer sur une base jetable : le script crée des comptes et des annonces.
 */
const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";

function jar() {
  const cookies = new Map();
  return {
    header: () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb(res) {
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const idx = pair.indexOf("=");
        cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    },
  };
}

async function call(j, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(j.header() ? { Cookie: j.header() } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  j.absorb(res);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + JSON.stringify(detail)}`);
}

const host = jar();
const player = jar();
const stranger = jar();

// --- auth ---
let r = await call(host, "POST", "/api/auth/register", { username: "HostGuy", displayName: "Le Boss" });
check("register host", r.status === 200 && /^RBX-/.test(r.json.accountNumber ?? ""), r.json);
const hostNumber = r.json.accountNumber;

r = await call(player, "POST", "/api/auth/register", { username: "PlayerOne", ageRange: "16-17", hasVoiceChat: true });
check("register player", r.status === 200, r.json);
const playerNumber = r.json.accountNumber;

r = await call(stranger, "POST", "/api/auth/register", { username: "Nosy" });
check("register stranger", r.status === 200, r.json);

r = await call(host, "GET", "/api/auth/me");
check("me returns account", r.json.account?.username === "HostGuy", r.json);
check("me never leaks account number to public view", r.json.account.accountNumber === undefined, r.json.account);

// duplicate username allowed
const twin = jar();
r = await call(twin, "POST", "/api/auth/register", { username: "PlayerOne" });
check("usernames are not unique", r.status === 200, r.json);

// login by account number (lowercase, no dashes)
const relog = jar();
r = await call(relog, "POST", "/api/auth/login", { accountNumber: hostNumber.replace(/-/g, "").toLowerCase() });
check("login normalises the account number", r.status === 200 && r.json.account.username === "HostGuy", r.json);

r = await call(jar(), "POST", "/api/auth/login", { accountNumber: "RBX-0000-0000-0000" });
check("unknown account number rejected", r.status === 404, r.json);

// --- listings ---
r = await call(player, "POST", "/api/listings", {
  title: "x", description: "y", gameName: "z",
});
check("listing title min length enforced", r.status === 422, r.json);

r = await call(host, "POST", "/api/listings", {
  title: "Cherche 3 joueurs pour raid",
  description: "Grind niveau 1500+, 21h-23h.",
  requirements: "Micro conseillé",
  gameName: "Blox Fruits",
  gamePlaceId: 2753915549,
  gameUrl: "https://www.roblox.com/games/2753915549/Blox-Fruits",
  slots: 3,
});
check("host creates listing", r.status === 201, r.json);
const listingId = r.json.listing?.id;

r = await call(jar(), "POST", "/api/listings", { title: "Anonymous", description: "d", gameName: "g" });
check("anonymous cannot create a listing", r.status === 401, r.json);

r = await call(player, "GET", "/api/listings");
check("feed lists the listing", r.json.listings?.some((l) => l.listing.id === listingId), r.json);
check("feed hides host account number", r.json.listings[0].host.accountNumber === undefined, r.json.listings[0].host);

r = await call(player, "GET", "/api/listings?q=blox");
check("feed search matches game name", r.json.listings?.length === 1, r.json);
r = await call(player, "GET", "/api/listings?q=zzzznope");
check("feed search filters out non-matches", r.json.listings?.length === 0, r.json);

// --- crew gating before acceptance ---
r = await call(player, "GET", `/api/crew/${listingId}/messages`);
check("non-member blocked from crew chat", r.status === 403, r.json);

r = await call(host, "GET", `/api/crew/${listingId}/messages`);
check("host is a crew member by default", r.status === 200, r.json);

// --- join requests ---
r = await call(host, "POST", `/api/listings/${listingId}/requests`, { message: "moi" });
check("host cannot request to join own listing", r.status === 409, r.json);

r = await call(player, "POST", `/api/listings/${listingId}/requests`, { message: "Niveau 1700, micro ok" });
check("player requests to join", r.status === 201, r.json);
const requestId = r.json.request?.id;

r = await call(player, "POST", `/api/listings/${listingId}/requests`, { message: "encore" });
check("duplicate request is idempotent", r.status === 200 && r.json.request.id === requestId, r.json);

r = await call(player, "GET", `/api/listings/${listingId}/requests`);
check("non-host cannot read the request list", r.status === 403, r.json);

r = await call(host, "GET", `/api/listings/${listingId}/requests`);
check("host reads pending requests", r.json.requests?.length === 1, r.json);

r = await call(stranger, "PATCH", `/api/requests/${requestId}`, { action: "accept" });
check("stranger cannot decide a request", r.status === 403, r.json);

r = await call(host, "PATCH", `/api/requests/${requestId}`, { action: "accept" });
check("host accepts the request", r.status === 200 && r.json.request.status === "accepted", r.json);

r = await call(host, "PATCH", `/api/requests/${requestId}`, { action: "decline" });
check("a decided request cannot be re-decided", r.status === 409, r.json);

// --- crew chat ---
r = await call(player, "GET", `/api/crew/${listingId}/messages`);
check("accepted player reaches the crew chat", r.status === 200, r.json);

r = await call(stranger, "GET", `/api/crew/${listingId}/messages`);
check("stranger still blocked from the crew", r.status === 403, r.json);

// SSE: open the stream, then post and expect delivery
const controller = new AbortController();
const sse = await fetch(`${BASE}/api/crew/${listingId}/messages/stream?after=0`, {
  headers: { Cookie: player.header(), Accept: "text/event-stream" },
  signal: controller.signal,
});
check("SSE stream opens for a crew member", sse.status === 200 && (sse.headers.get("content-type") ?? "").includes("text/event-stream"), sse.status);

const sseStranger = await fetch(`${BASE}/api/crew/${listingId}/messages/stream`, {
  headers: { Cookie: stranger.header() },
});
check("SSE stream refuses non-members", sseStranger.status === 403, sseStranger.status);
await sseStranger.text();

const received = [];
const readerDone = (async () => {
  const reader = sse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (received.length < 2) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (const frame of buffer.split("\n\n")) {
        const line = frame.split("\n").find((l) => l.startsWith("data: "));
        if (line) {
          const payload = JSON.parse(line.slice(6));
          if (!received.some((m) => m.seq === payload.seq)) received.push(payload);
        }
      }
    }
  } catch { /* aborted */ }
})();

await new Promise((r) => setTimeout(r, 300));
r = await call(host, "POST", `/api/crew/${listingId}/messages`, { body: "Salut, on lance dans 5 min" });
check("host posts a chat message", r.status === 201, r.json);
r = await call(player, "POST", `/api/crew/${listingId}/messages`, { body: "ok je suis là" });
check("member posts a chat message", r.status === 201, r.json);

r = await call(stranger, "POST", `/api/crew/${listingId}/messages`, { body: "hello" });
check("stranger cannot post in the crew", r.status === 403, r.json);

await Promise.race([readerDone, new Promise((r) => setTimeout(r, 6000))]);
controller.abort();
check("SSE delivered both messages live", received.length === 2, received);
check("SSE payload carries the author profile", received[0]?.author?.username === "HostGuy", received[0]);

r = await call(player, "GET", `/api/crew/${listingId}/messages?after=${received[0]?.seq ?? 0}`);
check("message cursor skips already-seen messages", r.json.messages?.length === 1, r.json);

// --- slots ---
r = await call(stranger, "POST", `/api/listings/${listingId}/requests`, { message: "moi aussi" });
check("third player may request (slots=3, crew=2)", r.status === 201, r.json);
const strangerRequest = r.json.request?.id;
r = await call(host, "PATCH", `/api/requests/${strangerRequest}`, { action: "accept" });
check("third player accepted fills the crew", r.status === 200, r.json);

const fourth = jar();
await call(fourth, "POST", "/api/auth/register", { username: "TooLate" });
r = await call(fourth, "POST", `/api/listings/${listingId}/requests`, {});
check("a full crew refuses further requests", r.status === 409, r.json);

// --- listing status ---
r = await call(player, "PATCH", `/api/listings/${listingId}`, { status: "closed" });
check("non-host cannot close the listing", r.status === 403, r.json);
r = await call(host, "PATCH", `/api/listings/${listingId}`, { status: "closed" });
check("host closes the listing", r.status === 200 && r.json.listing.status === "closed", r.json);
r = await call(player, "GET", "/api/listings");
check("closed listings drop out of the feed", r.json.listings.length === 0, r.json);

// --- logout ---
r = await call(player, "POST", "/api/auth/logout");
check("logout succeeds", r.status === 200, r.json);
r = await call(player, "GET", "/api/auth/me");
check("session is gone after logout", r.json.account === null, r.json);
r = await call(player, "POST", "/api/auth/login", { accountNumber: playerNumber });
check("account number signs back in", r.status === 200 && r.json.account.username === "PlayerOne", r.json);

// --- pages render ---
for (const path of ["/", "/onboarding", "/login", `/listings/${listingId}`, "/me", `/crew/${listingId}`, "/listings/new"]) {
  const res = await fetch(BASE + path, { headers: { Cookie: host.header() } });
  const html = await res.text();
  check(`page ${path} renders`, res.status === 200 && html.includes("<body"), res.status);
}
const guestCrew = await fetch(`${BASE}/crew/${listingId}`, { headers: { Cookie: stranger.header() }, redirect: "manual" });
check("crew page reachable for accepted member (stranger)", guestCrew.status === 200, guestCrew.status);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
