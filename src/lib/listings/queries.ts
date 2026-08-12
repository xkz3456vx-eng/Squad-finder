import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, joinRequests, listings } from "@/lib/db/schema";
import { toPublicAccount, type PublicAccount } from "@/lib/auth/session";
import type { Listing } from "@/lib/db/schema";

export type ListingCardData = {
  listing: Listing;
  host: PublicAccount;
  /** Host included. */
  crewSize: number;
  pendingCount: number;
  /** The viewer's own request on this listing, if any. */
  viewerRequestStatus: "pending" | "accepted" | "declined" | null;
  viewerIsHost: boolean;
};

const crewSizeExpr = sql<number>`(
  SELECT COUNT(*) FROM ${joinRequests}
  WHERE ${joinRequests.listingId} = ${listings.id}
    AND ${joinRequests.status} = 'accepted'
) + 1`;

const pendingCountExpr = sql<number>`(
  SELECT COUNT(*) FROM ${joinRequests}
  WHERE ${joinRequests.listingId} = ${listings.id}
    AND ${joinRequests.status} = 'pending'
)`;

function rowToCard(
  row: {
    listing: Listing;
    host: typeof accounts.$inferSelect;
    crewSize: number;
    pendingCount: number;
    viewerRequestStatus: string | null;
  },
  viewerId: string | null,
): ListingCardData {
  const status = row.viewerRequestStatus;
  return {
    listing: row.listing,
    host: toPublicAccount(row.host),
    crewSize: Number(row.crewSize),
    pendingCount: Number(row.pendingCount),
    viewerRequestStatus:
      status === "pending" || status === "accepted" || status === "declined"
        ? status
        : null,
    viewerIsHost: viewerId !== null && row.listing.hostId === viewerId,
  };
}

function viewerStatusExpr(viewerId: string | null) {
  if (!viewerId) return sql<string | null>`NULL`;
  return sql<string | null>`(
    SELECT ${joinRequests.status} FROM ${joinRequests}
    WHERE ${joinRequests.listingId} = ${listings.id}
      AND ${joinRequests.requesterId} = ${viewerId}
    LIMIT 1
  )`;
}

export type FeedOptions = {
  viewerId: string | null;
  search?: string | null;
  includeClosed?: boolean;
  limit?: number;
};

export function getListingFeed({
  viewerId,
  search,
  includeClosed = false,
  limit = 60,
}: FeedOptions): ListingCardData[] {
  const filters = [];
  if (!includeClosed) filters.push(eq(listings.status, "open"));

  const needle = search?.trim();
  if (needle) {
    const like = `%${needle.toLowerCase()}%`;
    filters.push(
      sql`(lower(${listings.title}) LIKE ${like}
        OR lower(${listings.gameName}) LIKE ${like}
        OR lower(${listings.description}) LIKE ${like})`,
    );
  }

  const rows = db
    .select({
      listing: listings,
      host: accounts,
      crewSize: crewSizeExpr,
      pendingCount: pendingCountExpr,
      viewerRequestStatus: viewerStatusExpr(viewerId),
    })
    .from(listings)
    .innerJoin(accounts, eq(accounts.id, listings.hostId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(listings.createdAt))
    .limit(limit)
    .all();

  return rows.map((row) => rowToCard(row, viewerId));
}

export function getListingCard(
  listingId: string,
  viewerId: string | null,
): ListingCardData | null {
  const row = db
    .select({
      listing: listings,
      host: accounts,
      crewSize: crewSizeExpr,
      pendingCount: pendingCountExpr,
      viewerRequestStatus: viewerStatusExpr(viewerId),
    })
    .from(listings)
    .innerJoin(accounts, eq(accounts.id, listings.hostId))
    .where(eq(listings.id, listingId))
    .get();

  return row ? rowToCard(row, viewerId) : null;
}

export type PendingRequest = {
  id: string;
  message: string | null;
  createdAt: number;
  status: string;
  requester: PublicAccount;
  listing: Listing;
};

/** Requests waiting on a decision from this host, across all their listings. */
export function getIncomingRequests(hostId: string): PendingRequest[] {
  return db
    .select({
      request: joinRequests,
      requester: accounts,
      listing: listings,
    })
    .from(joinRequests)
    .innerJoin(listings, eq(listings.id, joinRequests.listingId))
    .innerJoin(accounts, eq(accounts.id, joinRequests.requesterId))
    .where(
      and(eq(listings.hostId, hostId), eq(joinRequests.status, "pending")),
    )
    .orderBy(desc(joinRequests.createdAt))
    .all()
    .map((row) => ({
      id: row.request.id,
      message: row.request.message,
      createdAt: row.request.createdAt,
      status: row.request.status,
      requester: toPublicAccount(row.requester),
      listing: row.listing,
    }));
}

/** Requests this account has sent, whatever their state. */
export function getOutgoingRequests(requesterId: string): PendingRequest[] {
  return db
    .select({
      request: joinRequests,
      requester: accounts,
      listing: listings,
    })
    .from(joinRequests)
    .innerJoin(listings, eq(listings.id, joinRequests.listingId))
    .innerJoin(accounts, eq(accounts.id, joinRequests.requesterId))
    .where(eq(joinRequests.requesterId, requesterId))
    .orderBy(desc(joinRequests.createdAt))
    .all()
    .map((row) => ({
      id: row.request.id,
      message: row.request.message,
      createdAt: row.request.createdAt,
      status: row.request.status,
      requester: toPublicAccount(row.requester),
      listing: row.listing,
    }));
}

export function getListingsHostedBy(hostId: string): ListingCardData[] {
  const rows = db
    .select({
      listing: listings,
      host: accounts,
      crewSize: crewSizeExpr,
      pendingCount: pendingCountExpr,
      viewerRequestStatus: sql<string | null>`NULL`,
    })
    .from(listings)
    .innerJoin(accounts, eq(accounts.id, listings.hostId))
    .where(eq(listings.hostId, hostId))
    .orderBy(desc(listings.createdAt))
    .all();

  return rows.map((row) => rowToCard(row, hostId));
}
