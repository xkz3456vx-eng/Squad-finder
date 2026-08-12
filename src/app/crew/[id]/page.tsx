import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { getCrew, isCrewMember } from "@/lib/crew/access";
import { listCrewMessages } from "@/lib/crew/messages";
import { Badge, Card } from "@/components/ui";
import { CrewChat } from "@/components/crew-chat";
import { PlayerCard } from "@/components/player-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CrewPage({ params }: Props) {
  const { id } = await params;

  const viewer = await getCurrentAccount();
  if (!viewer) redirect(`/login?next=/crew/${id}`);

  const crew = getCrew(id);
  if (!crew) notFound();

  // The Crew is the whole point of the access control: only the host and
  // accepted players ever see the roster, the private server link, or the chat.
  if (!isCrewMember(id, viewer.id)) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">Accès réservé au crew</h1>
        <p className="mt-2 text-sm text-muted">
          Tu dois être accepté par l&apos;hôte de cette annonce pour entrer.
        </p>
        <Link
          href={`/listings/${id}`}
          className="focus-ring mt-4 inline-block rounded text-sm text-accent"
        >
          Voir l&apos;annonce →
        </Link>
      </Card>
    );
  }

  const { listing } = crew;
  const messages = listCrewMessages(id);

  return (
    <div className="space-y-5">
      <Link
        href={`/listings/${id}`}
        className="focus-ring inline-block rounded text-sm text-muted"
      >
        ← Retour à l&apos;annonce
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{listing.gameName}</Badge>
        {listing.status !== "open" && <Badge tone="neutral">Annonce fermée</Badge>}
        <h1 className="w-full text-2xl font-bold tracking-tight">
          {listing.title}
        </h1>
      </div>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">Rejoindre la partie</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {listing.gameUrl ? (
            <a
              href={listing.gameUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="focus-ring rounded-lg bg-accent px-3 py-2 font-medium text-accent-contrast"
            >
              Lancer {listing.gameName} ↗
            </a>
          ) : (
            <span className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-muted">
              Aucun lien de jeu fourni
            </span>
          )}

          {listing.privateServerLink ? (
            <a
              href={listing.privateServerLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="focus-ring rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 font-medium text-accent"
            >
              Serveur privé ↗
            </a>
          ) : (
            <span className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-muted">
              Pas de serveur privé — ajoutez l&apos;hôte en ami sur Roblox
            </span>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            Crew <span className="text-muted">({crew.members.length})</span>
          </h2>
          {crew.members.map((member) => (
            <PlayerCard
              key={member.id}
              account={member}
              role={member.role === "host" ? "Hôte" : undefined}
            />
          ))}
        </section>

        <CrewChat
          listingId={id}
          viewerId={viewer.id}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
