import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireAccount, toPublicAccount } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accounts, joinRequests, listings } from "@/lib/db/schema";
import { acceptedMemberCount } from "@/lib/crew/access";
import { joinRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Host-only: every request on this listing, pending first. */
export const GET = handler(async (_request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();

  const listing = db.select().from(listings).where(eq(listings.id, id)).get();
  if (!listing) throw new ApiError("Annonce introuvable", 404);
  if (listing.hostId !== account.id) {
    throw new ApiError("Réservé à l'hôte de l'annonce", 403);
  }

  const rows = db
    .select({ request: joinRequests, requester: accounts })
    .from(joinRequests)
    .innerJoin(accounts, eq(accounts.id, joinRequests.requesterId))
    .where(eq(joinRequests.listingId, id))
    .orderBy(asc(joinRequests.createdAt))
    .all();

  return NextResponse.json({
    requests: rows.map((row) => ({
      id: row.request.id,
      status: row.request.status,
      message: row.request.message,
      createdAt: row.request.createdAt,
      requester: toPublicAccount(row.requester),
    })),
  });
});

/** "Demander à rejoindre". */
export const POST = handler(async (request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();
  const { message } = await parseBody(request, joinRequestSchema);

  const listing = db.select().from(listings).where(eq(listings.id, id)).get();
  if (!listing) throw new ApiError("Annonce introuvable", 404);
  if (listing.status !== "open") throw new ApiError("Annonce fermée", 409);
  if (listing.hostId === account.id) {
    throw new ApiError("Tu es déjà l'hôte de cette annonce", 409);
  }
  if (listing.slots !== null && acceptedMemberCount(id) >= listing.slots) {
    throw new ApiError("Le crew est complet", 409);
  }

  const existing = db
    .select()
    .from(joinRequests)
    .where(
      and(eq(joinRequests.listingId, id), eq(joinRequests.requesterId, account.id)),
    )
    .get();

  if (existing) {
    if (existing.status === "declined") {
      throw new ApiError("Ta demande a déjà été refusée", 409);
    }
    // Re-posting is idempotent rather than an error: the button may be
    // double-clicked, or the page reopened in another tab.
    return NextResponse.json({ request: existing });
  }

  const created = db
    .insert(joinRequests)
    .values({
      id: randomUUID(),
      listingId: id,
      requesterId: account.id,
      message: message ?? null,
    })
    .returning()
    .get();

  return NextResponse.json({ request: created }, { status: 201 });
});
