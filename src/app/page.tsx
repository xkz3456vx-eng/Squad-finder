import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth/session";
import { getListingFeed } from "@/lib/listings/queries";
import { ListingCard } from "@/components/listing-card";
import { Button, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function FeedPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const account = await getCurrentAccount();
  const feed = getListingFeed({ viewerId: account?.id ?? null, search: q });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Trouve ton crew Roblox
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Publie une annonce, accepte les joueurs qui te conviennent, et
          retrouve-les dans un espace privé avec chat en direct. Sans e-mail,
          sans mot de passe.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={account ? "/listings/new" : "/onboarding"}
            className="focus-ring rounded-lg"
          >
            <Button size="lg">Publier une annonce</Button>
          </Link>
          {!account && (
            <Link href="/login" className="focus-ring rounded-lg">
              <Button size="lg" variant="secondary">
                J&apos;ai déjà un numéro de compte
              </Button>
            </Link>
          )}
        </div>
      </section>

      <form action="/" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Chercher un jeu, un titre…"
          aria-label="Rechercher une annonce"
          className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm placeholder:text-muted"
        />
        <Button type="submit" variant="secondary">
          Chercher
        </Button>
      </form>

      {feed.length === 0 ? (
        <EmptyState
          icon={<span className="text-3xl">🎮</span>}
          title={q ? "Aucune annonce pour cette recherche" : "Aucune annonce"}
          description={
            q
              ? "Essaie un autre nom de jeu, ou publie la tienne."
              : "Sois le premier à chercher des joueurs."
          }
          action={
            <Link
              href={account ? "/listings/new" : "/onboarding"}
              className="focus-ring rounded-lg"
            >
              <Button>Publier une annonce</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {feed.map((data) => (
            <ListingCard key={data.listing.id} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}
