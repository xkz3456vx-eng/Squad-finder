import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, handler, parseBody } from "@/lib/api";
import {
  getCurrentAccount,
  nowSeconds,
  requireAccount,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { getListingCard } from "@/lib/listings/queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({ status: z.enum(["open", "closed"]) });

export const GET = handler(async (_request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const viewer = await getCurrentAccount();

  const card = getListingCard(id, viewer?.id ?? null);
  if (!card) throw new ApiError("Annonce introuvable", 404);

  return NextResponse.json({ listing: card });
});

export const PATCH = handler(async (request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();
  const { status } = await parseBody(request, patchSchema);

  const listing = db.select().from(listings).where(eq(listings.id, id)).get();
  if (!listing) throw new ApiError("Annonce introuvable", 404);
  if (listing.hostId !== account.id) {
    throw new ApiError("Seul l'hôte peut modifier cette annonce", 403);
  }

  const updated = db
    .update(listings)
    .set({ status, updatedAt: nowSeconds() })
    .where(eq(listings.id, id))
    .returning()
    .get();

  return NextResponse.json({ listing: updated });
});

export const DELETE = handler(async (_request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();

  const listing = db.select().from(listings).where(eq(listings.id, id)).get();
  if (!listing) throw new ApiError("Annonce introuvable", 404);
  if (listing.hostId !== account.id) {
    throw new ApiError("Seul l'hôte peut supprimer cette annonce", 403);
  }

  db.delete(listings).where(eq(listings.id, id)).run();
  return NextResponse.json({ ok: true });
});
