import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/api";
import { getCurrentAccount, registerAccount } from "@/lib/auth/session";
import { ApiError } from "@/lib/api";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  const existing = await getCurrentAccount();
  if (existing) throw new ApiError("Tu es déjà connecté", 409);

  const input = await parseBody(request, registerSchema);
  const account = await registerAccount({
    username: input.username,
    displayName: input.displayName ?? null,
    robloxUserId: input.robloxUserId ?? null,
    robloxProfileUrl: input.robloxProfileUrl ?? null,
    avatarUrl: input.avatarUrl ?? null,
    ageRange: input.ageRange ?? null,
    hasVoiceChat: input.hasVoiceChat ?? null,
  });

  // The account number is returned exactly once, to its owner, at creation.
  return NextResponse.json({
    accountNumber: account.accountNumber,
    account: {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
    },
  });
});
