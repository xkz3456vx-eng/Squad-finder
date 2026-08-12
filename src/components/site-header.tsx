import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth/session";
import { getIncomingRequests } from "@/lib/listings/queries";
import { displayNameOf } from "@/lib/format";
import { Avatar, Badge, Button } from "@/components/ui";
import { LogoutButton } from "./logout-button";

export async function SiteHeader() {
  const account = await getCurrentAccount();
  const pending = account ? getIncomingRequests(account.id).length : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-lg font-semibold tracking-tight"
        >
          {/* Inline SVG rather than an emoji: the mark must not depend on the
              viewer having an emoji font installed. */}
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-accent text-accent-contrast"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="m17 11 2 2 4-4" />
            </svg>
          </span>
          <span className="hidden sm:inline">Squad Finder</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {account ? (
            <>
              <Link href="/listings/new" className="focus-ring rounded-lg">
                <Button size="sm">Publier</Button>
              </Link>

              <Link
                href="/me"
                className="focus-ring flex items-center gap-2 rounded-lg px-1 py-1"
                title={displayNameOf(account)}
              >
                <Avatar
                  src={account.avatarUrl}
                  name={displayNameOf(account)}
                  size="sm"
                />
                {pending > 0 && (
                  <Badge tone="accent">
                    {pending} demande{pending > 1 ? "s" : ""}
                  </Badge>
                )}
              </Link>

              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="focus-ring rounded-lg">
                <Button size="sm" variant="ghost">
                  Se connecter
                </Button>
              </Link>
              <Link href="/onboarding" className="focus-ring rounded-lg">
                <Button size="sm">Créer un compte</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
