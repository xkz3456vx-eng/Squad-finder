import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentAccount,
  toPublicAccount,
} from "@/lib/auth/session";
import {
  getIncomingRequests,
  getListingsHostedBy,
  getOutgoingRequests,
} from "@/lib/listings/queries";
import { timeAgo } from "@/lib/format";
import { AccountForm } from "@/components/account-form";
import { AccountNumberPanel } from "@/components/account-number-panel";
import { ListingCard } from "@/components/listing-card";
import { PlayerCard } from "@/components/player-card";
import { RequestActions } from "@/components/request-actions";
import { Badge, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  pending: "warn",
  accepted: "success",
  declined: "danger",
} as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
};

export default async function MePage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/onboarding");

  const incoming = getIncomingRequests(account.id);
  const outgoing = getOutgoingRequests(account.id);
  const hosted = getListingsHostedBy(account.id);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Mon compte</h1>
        <AccountNumberPanel accountNumber={account.accountNumber} compact />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Demandes reçues{" "}
          <span className="text-muted">({incoming.length})</span>
        </h2>

        {incoming.length === 0 ? (
          <EmptyState
            title="Aucune demande en attente"
            description="Les joueurs qui veulent rejoindre tes annonces apparaîtront ici."
          />
        ) : (
          <div className="space-y-2">
            {incoming.map((request) => (
              <div key={request.id} className="space-y-1">
                <p className="text-xs text-muted">
                  sur{" "}
                  <Link
                    href={`/listings/${request.listing.id}`}
                    className="focus-ring rounded text-accent"
                  >
                    {request.listing.title}
                  </Link>{" "}
                  · {timeAgo(request.createdAt)}
                </p>
                <PlayerCard
                  account={request.requester}
                  note={request.message}
                  action={<RequestActions requestId={request.id} />}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Mes demandes envoyées{" "}
          <span className="text-muted">({outgoing.length})</span>
        </h2>

        {outgoing.length === 0 ? (
          <EmptyState
            title="Aucune demande envoyée"
            description="Parcours le fil d'annonces et demande à rejoindre un crew."
          />
        ) : (
          <div className="space-y-2">
            {outgoing.map((request) => (
              <Card key={request.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listings/${request.listing.id}`}
                    className="focus-ring block truncate rounded font-medium"
                  >
                    {request.listing.title}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {request.listing.gameName} · {timeAgo(request.createdAt)}
                  </p>
                </div>

                <Badge
                  tone={
                    STATUS_TONE[request.status as keyof typeof STATUS_TONE] ??
                    "neutral"
                  }
                >
                  {STATUS_LABEL[request.status] ?? request.status}
                </Badge>

                {request.status === "accepted" && (
                  <Link
                    href={`/crew/${request.listing.id}`}
                    className="focus-ring shrink-0 rounded text-sm text-accent"
                  >
                    Crew →
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Mes annonces <span className="text-muted">({hosted.length})</span>
        </h2>

        {hosted.length === 0 ? (
          <EmptyState
            title="Aucune annonce publiée"
            description="Publie une annonce pour constituer ton crew."
          />
        ) : (
          <div className="space-y-3">
            {hosted.map((data) => (
              <ListingCard key={data.listing.id} data={data} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Modifier mon profil</h2>
        <AccountForm mode="edit" account={toPublicAccount(account)} />
      </section>
    </div>
  );
}
