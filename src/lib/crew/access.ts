import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, joinRequests, listings } from "@/lib/db/schema";
import {
  toPublicAccount,
  type PublicAccount,
} from "@/lib/auth/session";
import type { Listing } from "@/lib/db/schema";

export type CrewMember = PublicAccount & { role: "host" | "member" };

export type CrewView = {
  listing: Listing;
  host: PublicAccount;
  members: CrewMember[];
};

/**
 * A Crew is the host plus every requester whose join request was accepted.
 * Membership is derived, never stored twice.
 */
export function getCrew(listingId: string): CrewView | null {
  const listing = db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .get();
  if (!listing) return null;

  const host = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, listing.hostId))
    .get();
  if (!host) return null;

  const accepted = db
    .select({ account: accounts })
    .from(joinRequests)
    .innerJoin(accounts, eq(accounts.id, joinRequests.requesterId))
    .where(
      and(
        eq(joinRequests.listingId, listingId),
        eq(joinRequests.status, "accepted"),
      ),
    )
    .orderBy(asc(joinRequests.decidedAt))
    .all();

  const publicHost = toPublicAccount(host);
  return {
    listing,
    host: publicHost,
    members: [
      { ...publicHost, role: "host" as const },
      ...accepted.map((r) => ({
        ...toPublicAccount(r.account),
        role: "member" as const,
      })),
    ],
  };
}

export function isCrewMember(listingId: string, accountId: string): boolean {
  const listing = db
    .select({ hostId: listings.hostId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .get();
  if (!listing) return false;
  if (listing.hostId === accountId) return true;

  const accepted = db
    .select({ id: joinRequests.id })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.listingId, listingId),
        eq(joinRequests.requesterId, accountId),
        eq(joinRequests.status, "accepted"),
      ),
    )
    .get();

  return Boolean(accepted);
}

export function acceptedMemberCount(listingId: string): number {
  const rows = db
    .select({ id: joinRequests.id })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.listingId, listingId),
        eq(joinRequests.status, "accepted"),
      ),
    )
    .all();
  return rows.length + 1; // + the host
}
