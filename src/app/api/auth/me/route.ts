import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handler, parseBody } from "@/lib/api";
import {
  getCurrentAccount,
  nowSeconds,
  requireAccount,
  toPublicAccount,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { profileUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const account = await getCurrentAccount();
  return NextResponse.json({
    account: account ? toPublicAccount(account) : null,
    accountNumber: account?.accountNumber ?? null,
  });
});

export const PATCH = handler(async (request) => {
  const account = await requireAccount();
  const input = await parseBody(request, profileUpdateSchema);

  const updated = db
    .update(accounts)
    .set({
      username: input.username,
      displayName: input.displayName ?? null,
      robloxUserId: input.robloxUserId ?? null,
      robloxProfileUrl: input.robloxProfileUrl ?? null,
      avatarUrl: input.avatarUrl ?? null,
      ageRange: input.ageRange ?? null,
      hasVoiceChat: input.hasVoiceChat ?? null,
      updatedAt: nowSeconds(),
    })
    .where(eq(accounts.id, account.id))
    .returning()
    .get();

  return NextResponse.json({ account: toPublicAccount(updated ?? account) });
});
