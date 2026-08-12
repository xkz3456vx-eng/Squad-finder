import { NextResponse } from "next/server";
import { ApiError, handler, parseBody } from "@/lib/api";
import { loginWithAccountNumber, toPublicAccount } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  const { accountNumber } = await parseBody(request, loginSchema);
  const account = await loginWithAccountNumber(accountNumber);
  if (!account) throw new ApiError("Numéro de compte introuvable", 404);

  return NextResponse.json({ account: toPublicAccount(account) });
});
