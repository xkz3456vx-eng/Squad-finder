import test from "node:test";
import assert from "node:assert/strict";

import {
  parseRobloxGameUrl,
  parseRobloxProfileUrl,
  robloxGameUrl,
  robloxProfileUrl,
} from "./parse";

const id = (userId: number) => ({ kind: "id" as const, userId });
const user = (username: string) => ({ kind: "username" as const, username });

test("profile: canonical and partial URL forms resolve to an id", () => {
  assert.deepEqual(parseRobloxProfileUrl("https://www.roblox.com/users/12345/profile"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("https://roblox.com/users/12345"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("http://www.roblox.com/users/12345/profile"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("www.roblox.com/users/12345/profile"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("roblox.com/users/12345"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("//www.roblox.com/users/12345"), id(12345));
});

test("profile: alternate roblox hosts are accepted", () => {
  assert.deepEqual(parseRobloxProfileUrl("https://web.roblox.com/users/1/profile"), id(1));
  assert.deepEqual(parseRobloxProfileUrl("https://m.roblox.com/users/1/profile"), id(1));
  assert.deepEqual(parseRobloxProfileUrl("HTTPS://WWW.ROBLOX.COM/users/261/profile"), id(261));
});

test("profile: query strings, fragments and trailing slashes are tolerated", () => {
  assert.deepEqual(
    parseRobloxProfileUrl("https://www.roblox.com/users/12345/profile?tab=friends"),
    id(12345),
  );
  assert.deepEqual(parseRobloxProfileUrl("https://www.roblox.com/users/12345/"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("  roblox.com/users/12345/profile#about  "), id(12345));
});

test("profile: username query forms", () => {
  assert.deepEqual(
    parseRobloxProfileUrl("https://www.roblox.com/user.aspx?username=Builderman"),
    user("Builderman"),
  );
  assert.deepEqual(
    parseRobloxProfileUrl("roblox.com/users/profile?username=Builderman"),
    user("Builderman"),
  );
  assert.deepEqual(
    parseRobloxProfileUrl("https://www.roblox.com/users/profile?userId=156"),
    id(156),
  );
  assert.equal(parseRobloxProfileUrl("roblox.com/users/profile?username=no"), null);
});

test("profile: bare tokens", () => {
  assert.deepEqual(parseRobloxProfileUrl("12345"), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("  12345 "), id(12345));
  assert.deepEqual(parseRobloxProfileUrl("Builderman"), user("Builderman"));
  assert.deepEqual(parseRobloxProfileUrl("cool_gamer"), user("cool_gamer"));
  assert.deepEqual(parseRobloxProfileUrl("abc"), user("abc"));
});

test("profile: invalid usernames are rejected", () => {
  assert.equal(parseRobloxProfileUrl("_leading"), null);
  assert.equal(parseRobloxProfileUrl("trailing_"), null);
  assert.equal(parseRobloxProfileUrl("two_under_scores"), null);
  assert.equal(parseRobloxProfileUrl("ab"), null);
  assert.equal(parseRobloxProfileUrl("waaaaaaaaaaaaaaaaaaaaay_too_long"), null);
  assert.equal(parseRobloxProfileUrl("has spaces"), null);
  assert.equal(parseRobloxProfileUrl("bad!chars"), null);
  assert.equal(parseRobloxProfileUrl(""), null);
  assert.equal(parseRobloxProfileUrl("   "), null);
});

test("profile: non-roblox and lookalike hosts are rejected", () => {
  assert.equal(parseRobloxProfileUrl("https://evil.com/users/1/profile"), null);
  assert.equal(parseRobloxProfileUrl("https://notroblox.com/users/1/profile"), null);
  assert.equal(parseRobloxProfileUrl("https://roblox.com.evil.net/users/1/profile"), null);
  assert.equal(parseRobloxProfileUrl("roblox.com.evil.net/users/1"), null);
  assert.equal(parseRobloxProfileUrl("https://roblox.com@evil.com/users/1/profile"), null);
  assert.equal(parseRobloxProfileUrl("javascript:alert(1)"), null);
});

test("profile: roblox URLs that carry no user reference", () => {
  assert.equal(parseRobloxProfileUrl("https://www.roblox.com/"), null);
  assert.equal(parseRobloxProfileUrl("https://www.roblox.com/games/1818"), null);
  assert.equal(parseRobloxProfileUrl("https://www.roblox.com/users/notanumber"), null);
  assert.equal(parseRobloxProfileUrl("https://www.roblox.com/users/0/profile"), null);
});

test("game: canonical and partial URL forms resolve to a placeId", () => {
  assert.equal(parseRobloxGameUrl("https://www.roblox.com/games/1818/Classic-Crossroads"), 1818);
  assert.equal(parseRobloxGameUrl("https://www.roblox.com/games/1818"), 1818);
  assert.equal(parseRobloxGameUrl("roblox.com/games/1818"), 1818);
  assert.equal(parseRobloxGameUrl("m.roblox.com/games/1818/Classic-Crossroads"), 1818);
  assert.equal(
    parseRobloxGameUrl("https://web.roblox.com/games/1818/Crossroads?privateServerLinkCode=abc"),
    1818,
  );
  assert.equal(parseRobloxGameUrl(" https://www.roblox.com/games/1818/Crossroads#play "), 1818);
});

test("game: share-link and bare forms", () => {
  assert.equal(parseRobloxGameUrl("https://www.roblox.com/games/start?placeId=1818"), 1818);
  assert.equal(parseRobloxGameUrl("roblox.com/games/start?placeId=1818&launchData=x"), 1818);
  assert.equal(parseRobloxGameUrl("roblox.com/games/start?PlaceID=1818"), 1818);
  assert.equal(parseRobloxGameUrl("1818"), 1818);
  assert.equal(parseRobloxGameUrl("  1818  "), 1818);
});

test("game: rejections", () => {
  assert.equal(parseRobloxGameUrl("https://evil.com/games/1818"), null);
  assert.equal(parseRobloxGameUrl("https://notroblox.com/games/1818"), null);
  assert.equal(parseRobloxGameUrl("https://roblox.com.evil.net/games/1818"), null);
  assert.equal(parseRobloxGameUrl("https://www.roblox.com/users/1818/profile"), null);
  assert.equal(parseRobloxGameUrl("https://www.roblox.com/games/start"), null);
  assert.equal(parseRobloxGameUrl("Crossroads"), null);
  assert.equal(parseRobloxGameUrl("not a url at all"), null);
  assert.equal(parseRobloxGameUrl(""), null);
});

test("url builders round-trip through the parsers", () => {
  assert.equal(robloxProfileUrl(261), "https://www.roblox.com/users/261/profile");
  assert.equal(robloxGameUrl(1818), "https://www.roblox.com/games/1818");
  assert.deepEqual(parseRobloxProfileUrl(robloxProfileUrl(261)), id(261));
  assert.equal(parseRobloxGameUrl(robloxGameUrl(1818)), 1818);
});
