import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { logout } from "@/lib/auth/session";

export const runtime = "nodejs";

export const POST = handler(async () => {
  await logout();
  return NextResponse.json({ ok: true });
});
