import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getCurrentAccount, toPublicAccount } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accounts, joinRequests } from "@/lib/db/schema";
import { getListingCard } from "@/lib/listings/queries";
import { timeAgo } from "@/lib/format";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { JoinButton } from "@/components/join-button";
import { PlayerCard } from "@/components/player-card";
import { RequestActions } from "@/components/request-actions";
import { ListingStatusToggle } from "@/components/listing-status-toggle";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getCurrentAccount();

  const card = getListingCard(id, viewer?.id ?? null);
  if (!card) notFound();

  const { listing, host } = card;
  const isHost = card.viewerIsHost;
  const full = listing.slots !== null && card.crewSize >= listing.slots;

  const pending = isHost
    ? db
        .select({ request: joinRequests, requester: accounts })
        .from(joinRequests)
        .innerJoin(accounts, eq(accounts.id, joinRequests.requesterId))
        .where(
          and(
            eq(joinRequests.listingId, id),
            eq(joinRequests.status, "pending"),
          ),
        )
        .orderBy(asc(joinRequests.createdAt))
        .all()
    : [];

  return (
    <div className="space-y-5">
      <Link href="/" className="focus-ring inline-block rounded text-sm text-muted">
        ← Toutes les annonces
      </Link>

      <Card className="overflow-hidden p-0">
        {listing.gameThumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.gameThumbnailUrl}
            alt={`Vignette de ${listing.gameName}`}
            referrerPolicy="no-referrer"
            className="h-40 w-full object-cover sm:h-56"
          />
        )}

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{listing.gameName}</Badge>
            {listing.status !== "open" && <Badge tone="neutral">Fermée</Badge>}
            <span className="ml-auto text-xs text-muted">
              {timeAgo(listing.createdAt)}
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>

          <p className="whitespace-pre-wrap text-muted">{listing.description}</p>

          {listing.requirements && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <h2 className="text-sm font-semibold">Critères / préférences</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {listing.requirements}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            {listing.gameUrl && (
              <a
                href={listing.gameUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="focus-ring rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                Ouvrir le jeu ↗
              </a>
            )}
            <span className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-muted">
              {card.crewSize}
              {listing.slots ? `/${listing.slots}` : ""} joueur
              {card.crewSize > 1 ? "s" : ""}
            </span>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Hôte</h2>
            <PlayerCard account={host} role="Hôte" />
            {!listing.privateServerLink && (
              <p className="mt-2 text-xs text-muted">
                Pas de serveur privé sur cette annonce : ajoute l&apos;hôte en
                ami sur Roblox une fois accepté.
              </p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            {isHost ? (
              <div className="flex flex-wrap gap-2">
                <Link href={`/crew/${listing.id}`} className="focus-ring rounded-lg">
                  <Button size="lg">Ouvrir le crew →</Button>
                </Link>
                <ListingStatusToggle
                  listingId={listing.id}
                  status={listing.status === "open" ? "open" : "closed"}
                />
              </div>
            ) : (
              <JoinButton
                listingId={listing.id}
                status={card.viewerRequestStatus}
                signedIn={Boolean(viewer)}
                closed={listing.status !== "open"}
                full={full}
              />
            )}
          </div>
        </div>
      </Card>

      {isHost && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Demandes en attente{" "}
            <span className="text-muted">({pending.length})</span>
          </h2>

          {pending.length === 0 ? (
            <EmptyState
              title="Aucune demande pour le moment"
              description="Les joueurs qui cliquent sur « Demander à rejoindre » apparaîtront ici."
            />
          ) : (
            <div className="space-y-2">
              {pending.map((row) => (
                <PlayerCard
                  key={row.request.id}
                  account={toPublicAccount(row.requester)}
                  note={row.request.message}
                  action={<RequestActions requestId={row.request.id} />}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
