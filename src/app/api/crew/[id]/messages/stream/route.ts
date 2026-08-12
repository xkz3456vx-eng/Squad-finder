import { getCurrentAccount } from "@/lib/auth/session";
import { isCrewMember } from "@/lib/crew/access";
import { subscribeCrew } from "@/lib/crew/bus";
import { listCrewMessages } from "@/lib/crew/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const POLL_MS = 2000;
const HEARTBEAT_MS = 20_000;

/**
 * Server-Sent Events feed for one Crew chat.
 *
 * Flush strategy: the in-process bus wakes the stream the instant a member
 * posts, and a slow poll acts as a safety net (and covers a second Node
 * process). Every flush advances a `seq` cursor, so a client that reconnects
 * with `Last-Event-ID` picks up exactly where it left off with no duplicates.
 */
export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;

  const account = await getCurrentAccount();
  if (!account) return new Response("Unauthorized", { status: 401 });
  if (!isCrewMember(id, account.id)) {
    return new Response("Forbidden", { status: 403 });
  }

  const fromHeader = Number(request.headers.get("last-event-id") ?? NaN);
  const fromQuery = Number(new URL(request.url).searchParams.get("after") ?? NaN);
  let cursor = Number.isFinite(fromHeader)
    ? fromHeader
    : Number.isFinite(fromQuery)
      ? fromQuery
      : 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let flushing = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const flush = () => {
        if (closed || flushing) return;
        flushing = true;
        try {
          for (const message of listCrewMessages(id, cursor)) {
            cursor = message.seq;
            send(
              `id: ${message.seq}\nevent: message\ndata: ${JSON.stringify(message)}\n\n`,
            );
          }
        } catch (error) {
          console.error("Crew stream flush failed", error);
        } finally {
          flushing = false;
        }
      };

      const unsubscribe = subscribeCrew(id, flush);
      const poll = setInterval(flush, POLL_MS);
      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      }

      request.signal.addEventListener("abort", cleanup);

      send(`retry: 3000\n\n`);
      flush();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
