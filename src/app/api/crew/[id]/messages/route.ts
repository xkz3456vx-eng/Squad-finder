import { NextResponse } from "next/server";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireAccount } from "@/lib/auth/session";
import { isCrewMember } from "@/lib/crew/access";
import { listCrewMessages, postCrewMessage } from "@/lib/crew/messages";
import { chatMessageSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();
  if (!isCrewMember(id, account.id)) {
    throw new ApiError("Tu ne fais pas partie de ce crew", 403);
  }

  const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
  const messages = listCrewMessages(id, Number.isFinite(after) ? after : 0);

  return NextResponse.json({ messages });
});

export const POST = handler(async (request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const account = await requireAccount();
  if (!isCrewMember(id, account.id)) {
    throw new ApiError("Tu ne fais pas partie de ce crew", 403);
  }

  const { body } = await parseBody(request, chatMessageSchema);
  const message = postCrewMessage(id, account.id, body);

  return NextResponse.json({ message }, { status: 201 });
});
