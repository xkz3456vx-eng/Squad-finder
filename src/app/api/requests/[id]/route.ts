import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ApiError, handler, parseBody } from "@/lib/api";
import { nowSeconds, requireAccount } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { joinRequests, listings } from "@/lib/db/schema";
import { acceptedMemberCount } from "@/lib/crew/access";
import { requestDecisionSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Host accepts or declines a join request. Acceptance opens the Crew. */
export const PATCH = handler(async (request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();
  const { action } = await parseBody(request, requestDecisionSchema);

  const row = db
    .select({ request: joinRequests, listing: listings })
    .from(joinRequests)
    .innerJoin(listings, eq(listings.id, joinRequests.listingId))
    .where(eq(joinRequests.id, id))
    .get();

  if (!row) throw new ApiError("Demande introuvable", 404);
  if (row.listing.hostId !== account.id) {
    throw new ApiError("Seul l'hôte peut répondre à cette demande", 403);
  }
  if (row.request.status !== "pending") {
    throw new ApiError("Cette demande a déjà été traitée", 409);
  }

  if (
    action === "accept" &&
    row.listing.slots !== null &&
    acceptedMemberCount(row.listing.id) >= row.listing.slots
  ) {
    throw new ApiError("Le crew est complet", 409);
  }

  const updated = db
    .update(joinRequests)
    .set({
      status: action === "accept" ? "accepted" : "declined",
      decidedAt: nowSeconds(),
    })
    .where(eq(joinRequests.id, id))
    .returning()
    .get();

  return NextResponse.json({ request: updated });
});
