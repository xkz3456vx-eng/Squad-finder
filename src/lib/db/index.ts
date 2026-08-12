import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DDL = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  account_number TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  roblox_user_id INTEGER,
  roblox_profile_url TEXT,
  avatar_url TEXT,
  age_range TEXT,
  has_voice_chat INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_account_number_unique ON accounts (account_number);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions (account_id);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  game_name TEXT NOT NULL,
  game_place_id INTEGER,
  game_universe_id INTEGER,
  game_url TEXT,
  game_thumbnail_url TEXT,
  private_server_link TEXT,
  slots INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings (created_at);
CREATE INDEX IF NOT EXISTS listings_host_idx ON listings (host_id);

CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  decided_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS join_requests_listing_requester_unique ON join_requests (listing_id, requester_id);
CREATE INDEX IF NOT EXISTS join_requests_listing_idx ON join_requests (listing_id);
CREATE INDEX IF NOT EXISTS join_requests_requester_idx ON join_requests (requester_id);

CREATE TABLE IF NOT EXISTS crew_messages (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  seq INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS crew_messages_listing_seq_idx ON crew_messages (listing_id, seq);
CREATE UNIQUE INDEX IF NOT EXISTS crew_messages_seq_unique ON crew_messages (seq);
`;

function open() {
  const file =
    process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "app.db");
  mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  // busy_timeout first: `next build` collects page data in several worker
  // processes at once, and without it the very first pragma races and throws
  // SQLITE_BUSY instead of waiting its turn.
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

/**
 * Next.js re-evaluates modules on every hot reload in dev, which would open a
 * new SQLite handle each time. Keep the connection on globalThis.
 */
const globalForDb = globalThis as unknown as {
  __squadFinderDb?: ReturnType<typeof open>;
};

function connection() {
  return (globalForDb.__squadFinderDb ??= open());
}

/**
 * The handle is opened on first *use*, never at module evaluation: build-time
 * page-data collection imports these modules without ever running a query, and
 * opening a file there would serialise (and sometimes deadlock) the workers.
 */
function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const actual = resolve();
      const value = Reflect.get(actual, property) as unknown;
      return typeof value === "function" ? value.bind(actual) : value;
    },
  });
}

export const db = lazy(() => connection().db);
export const sqlite = lazy(() => connection().sqlite);
export { schema };
