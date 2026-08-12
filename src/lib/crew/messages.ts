import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db, sqlite } from "@/lib/db";
import { accounts, crewMessages } from "@/lib/db/schema";
import { publishCrewMessage } from "./bus";

export type CrewChatMessage = {
  id: string;
  seq: number;
  body: string;
  createdAt: number;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export function listCrewMessages(
  listingId: string,
  afterSeq = 0,
  limit = 200,
): CrewChatMessage[] {
  return db
    .select({
      id: crewMessages.id,
      seq: crewMessages.seq,
      body: crewMessages.body,
      createdAt: crewMessages.createdAt,
      authorId: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      avatarUrl: accounts.avatarUrl,
    })
    .from(crewMessages)
    .innerJoin(accounts, eq(accounts.id, crewMessages.authorId))
    .where(
      and(eq(crewMessages.listingId, listingId), gt(crewMessages.seq, afterSeq)),
    )
    .orderBy(asc(crewMessages.seq))
    .limit(limit)
    .all()
    .map((row) => ({
      id: row.id,
      seq: row.seq,
      body: row.body,
      createdAt: row.createdAt,
      author: {
        id: row.authorId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
    }));
}

/**
 * `seq` is a database-wide monotonic cursor. Allocating it inside a write
 * transaction keeps it gap-free and collision-free under concurrent posts,
 * which is what lets the SSE stream resume from "everything after N".
 */
type InsertMessage = (
  listingId: string,
  authorId: string,
  body: string,
  id: string,
) => number;

let insertMessage: InsertMessage | undefined;

/** Built on first use so importing this module never opens the database. */
function getInsertMessage(): InsertMessage {
  return (insertMessage ??= sqlite.transaction(
    (listingId: string, authorId: string, body: string, id: string) => {
      const next = sqlite
        .prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM crew_messages")
        .get() as { seq: number };

      sqlite
        .prepare(
          `INSERT INTO crew_messages (id, listing_id, author_id, body, seq)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(id, listingId, authorId, body, next.seq);

      return next.seq;
    },
  ) as InsertMessage);
}

export function postCrewMessage(
  listingId: string,
  authorId: string,
  body: string,
): CrewChatMessage {
  const id = randomUUID();
  const seq = getInsertMessage()(listingId, authorId, body, id);

  publishCrewMessage(listingId);

  const [message] = listCrewMessages(listingId, seq - 1, 1);
  if (!message) throw new Error("Message disparu juste après insertion");
  return message;
}

export function latestSeq(listingId: string): number {
  const row = db
    .select({ seq: sql<number>`COALESCE(MAX(${crewMessages.seq}), 0)` })
    .from(crewMessages)
    .where(eq(crewMessages.listingId, listingId))
    .get();
  return Number(row?.seq ?? 0);
}
