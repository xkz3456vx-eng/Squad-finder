import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch())`;

/**
 * Anonymous accounts. There is no e-mail and no password: the account number is
 * the identity, and a hashed session token is the bearer credential.
 * `username` is deliberately NOT unique — several people may play under the
 * same Roblox display name.
 */
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountNumber: text("account_number").notNull(),

    username: text("username").notNull(),
    displayName: text("display_name"),

    robloxUserId: integer("roblox_user_id"),
    robloxProfileUrl: text("roblox_profile_url"),
    avatarUrl: text("avatar_url"),

    ageRange: text("age_range"),
    hasVoiceChat: integer("has_voice_chat", { mode: "boolean" }),

    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("accounts_account_number_unique").on(t.accountNumber)],
);

/**
 * One row per signed-in device. Keeping sessions separate from the account is
 * what lets someone sign in on a phone without dropping their desktop session,
 * and lets "Quitter" end only the device it was pressed on.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: integer("created_at").notNull().default(now),
    lastSeenAt: integer("last_seen_at").notNull().default(now),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_account_idx").on(t.accountId),
  ],
);

/** LFG adverts posted by a host. */
export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    hostId: text("host_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description").notNull(),
    requirements: text("requirements"),

    gameName: text("game_name").notNull(),
    gamePlaceId: integer("game_place_id"),
    gameUniverseId: integer("game_universe_id"),
    gameUrl: text("game_url"),
    gameThumbnailUrl: text("game_thumbnail_url"),

    privateServerLink: text("private_server_link"),
    slots: integer("slots"),

    /** "open" | "closed" */
    status: text("status").notNull().default("open"),

    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [
    index("listings_created_at_idx").on(t.createdAt),
    index("listings_host_idx").on(t.hostId),
  ],
);

/** A player asking to join a listing; the host accepts or declines. */
export const joinRequests = sqliteTable(
  "join_requests",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    message: text("message"),
    /** "pending" | "accepted" | "declined" */
    status: text("status").notNull().default("pending"),

    createdAt: integer("created_at").notNull().default(now),
    decidedAt: integer("decided_at"),
  },
  (t) => [
    uniqueIndex("join_requests_listing_requester_unique").on(
      t.listingId,
      t.requesterId,
    ),
    index("join_requests_listing_idx").on(t.listingId),
    index("join_requests_requester_idx").on(t.requesterId),
  ],
);

/** Realtime chat inside a Crew (host + accepted members). */
export const crewMessages = sqliteTable(
  "crew_messages",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Monotonic per-database cursor used by the SSE stream. */
    seq: integer("seq").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [
    index("crew_messages_listing_seq_idx").on(t.listingId, t.seq),
    uniqueIndex("crew_messages_seq_unique").on(t.seq),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type CrewMessage = typeof crewMessages.$inferSelect;
