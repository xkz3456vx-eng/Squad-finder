import Link from "next/link";
import { Avatar, Badge, Card } from "@/components/ui";
import { displayNameOf, timeAgo } from "@/lib/format";
import type { ListingCardData } from "@/lib/listings/queries";

const STATUS_LABEL: Record<string, string> = {
  pending: "Demande envoyée",
  accepted: "Dans le crew",
  declined: "Refusée",
};

export function ListingCard({ data }: { data: ListingCardData }) {
  const { listing, host } = data;
  const closed = listing.status !== "open";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="focus-ring block rounded-xl"
    >
      <Card interactive className="animate-fade-in overflow-hidden p-0">
        <div className="flex gap-4 p-4">
          {listing.gameThumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.gameThumbnailUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="hidden h-[72px] w-32 shrink-0 rounded-lg object-cover sm:block"
            />
          ) : (
            <div
              aria-hidden
              className="hidden h-[72px] w-32 shrink-0 place-items-center rounded-lg bg-surface-2 text-2xl sm:grid"
            >
              🎮
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{listing.gameName}</Badge>
              {closed && <Badge tone="neutral">Fermée</Badge>}
              {data.viewerIsHost && <Badge tone="success">Ton annonce</Badge>}
              {!data.viewerIsHost && data.viewerRequestStatus && (
                <Badge
                  tone={
                    data.viewerRequestStatus === "accepted"
                      ? "success"
                      : data.viewerRequestStatus === "declined"
                        ? "danger"
                        : "warn"
                  }
                >
                  {STATUS_LABEL[data.viewerRequestStatus]}
                </Badge>
              )}
            </div>

            <h3 className="mt-1.5 truncate text-base font-semibold">
              {listing.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {listing.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-2.5 text-sm">
          <Avatar src={host.avatarUrl} name={displayNameOf(host)} size="sm" />
          <span className="truncate font-medium">{displayNameOf(host)}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">
            {data.crewSize}
            {listing.slots ? `/${listing.slots}` : ""} joueur
            {data.crewSize > 1 ? "s" : ""}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted">
            {timeAgo(listing.createdAt)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
