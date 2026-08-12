"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Button, TextArea, cn } from "@/components/ui";
import { formatTime } from "@/lib/format";
import type { CrewChatMessage } from "@/lib/crew/messages";

type Props = {
  listingId: string;
  viewerId: string;
  initialMessages: CrewChatMessage[];
};

type Status = "connecting" | "live" | "offline";

export function CrewChat({ listingId, viewerId, initialMessages }: Props) {
  const [messages, setMessages] = useState<CrewChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<Status>("connecting");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  const lastSeq = initialMessages.at(-1)?.seq ?? 0;

  const append = useCallback((incoming: CrewChatMessage) => {
    setMessages((current) => {
      // The optimistic POST response and the SSE echo carry the same seq.
      if (current.some((m) => m.seq === incoming.seq)) return current;
      return [...current, incoming].sort((a, b) => a.seq - b.seq);
    });
  }, []);

  useEffect(() => {
    const source = new EventSource(
      `/api/crew/${listingId}/messages/stream?after=${lastSeq}`,
    );

    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus("offline");
    source.addEventListener("message", (event) => {
      setStatus("live");
      try {
        append(JSON.parse((event as MessageEvent<string>).data) as CrewChatMessage);
      } catch {
        // A truncated frame is not worth tearing the stream down for; the
        // browser will replay from Last-Event-ID if the connection drops.
      }
    });

    return () => source.close();
  }, [listingId, lastSeq, append]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && pinnedToBottom.current) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/crew/${listingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await res.json()) as {
        error?: string;
        message?: CrewChatMessage;
      };

      if (!res.ok || !payload.message) {
        setError(payload.error ?? "Envoi impossible");
        return;
      }
      append(payload.message);
      setDraft("");
      pinnedToBottom.current = true;
    } catch {
      setError("Impossible de joindre le serveur");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Chat du crew</h2>
        <span
          className={cn(
            "ml-auto flex items-center gap-1.5 text-xs",
            status === "live" ? "text-success" : "text-muted",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              status === "live"
                ? "bg-success"
                : status === "connecting"
                  ? "animate-pulse-soft bg-warn"
                  : "bg-danger",
            )}
          />
          {status === "live"
            ? "En direct"
            : status === "connecting"
              ? "Connexion…"
              : "Reconnexion…"}
        </span>
      </div>

      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          pinnedToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            Personne n&apos;a encore parlé. Lance la partie !
          </p>
        )}

        {messages.map((message) => {
          const mine = message.author.id === viewerId;
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-2.5",
                mine ? "flex-row-reverse text-right" : "flex-row",
              )}
            >
              <Avatar
                src={message.author.avatarUrl}
                name={message.author.displayName ?? message.author.username}
                size="sm"
                className="mt-0.5 shrink-0"
              />
              <div className={cn("min-w-0 max-w-[80%]")}>
                <p className="text-xs text-muted">
                  {message.author.displayName ?? message.author.username}
                  <span className="mx-1">·</span>
                  {formatTime(message.createdAt)}
                </p>
                <p
                  className={cn(
                    "mt-1 inline-block whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm",
                    mine
                      ? "bg-accent text-accent-contrast"
                      : "bg-surface-2 text-text",
                  )}
                >
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <TextArea
            rows={1}
            maxLength={1000}
            placeholder="Écris un message…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            // Inline: the shared TextArea ships a taller `min-h-*`, and two
            // competing Tailwind utilities would resolve by stylesheet order.
            style={{ minHeight: "2.5rem", maxHeight: "8rem" }}
            className="resize-none"
          />
          <Button
            loading={sending}
            disabled={!draft.trim()}
            onClick={() => void send()}
          >
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
