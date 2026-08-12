import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/api";
import { getCurrentAccount, requireAccount } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { getListingFeed } from "@/lib/listings/queries";
import { listingSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handler(async (request) => {
  const viewer = await getCurrentAccount();
  const params = new URL(request.url).searchParams;

  const feed = getListingFeed({
    viewerId: viewer?.id ?? null,
    search: params.get("q"),
    includeClosed: params.get("includeClosed") === "1",
  });

  return NextResponse.json({ listings: feed });
});

export const POST = handler(async (request) => {
  const host = await requireAccount();
  const input = await parseBody(request, listingSchema);

  const created = db
    .insert(listings)
    .values({
      id: randomUUID(),
      hostId: host.id,
      title: input.title,
      description: input.description,
      requirements: input.requirements ?? null,
      gameName: input.gameName,
      gamePlaceId: input.gamePlaceId ?? null,
      gameUniverseId: input.gameUniverseId ?? null,
      gameUrl: input.gameUrl ?? null,
      gameThumbnailUrl: input.gameThumbnailUrl ?? null,
      privateServerLink: input.privateServerLink ?? null,
      slots: input.slots ?? null,
    })
    .returning()
    .get();

  return NextResponse.json({ listing: created }, { status: 201 });
});
