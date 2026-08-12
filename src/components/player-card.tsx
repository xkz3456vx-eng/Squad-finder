import { Avatar, Badge } from "@/components/ui";
import { displayNameOf } from "@/lib/format";
import type { PublicAccount } from "@/lib/auth/session";

type Props = {
  account: PublicAccount;
  role?: string;
  /** Extra line under the name, e.g. the message attached to a join request. */
  note?: string | null;
  action?: React.ReactNode;
};

export function PlayerCard({ account, role, note, action }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <Avatar
        src={account.avatarUrl}
        name={displayNameOf(account)}
        size="md"
        className="shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-medium">{displayNameOf(account)}</span>
          {role && <Badge tone="accent">{role}</Badge>}
          {account.hasVoiceChat && <Badge tone="success">Voice chat</Badge>}
          {account.ageRange && <Badge tone="neutral">{account.ageRange}</Badge>}
        </div>

        <p className="truncate text-xs text-muted">@{account.username}</p>

        {note && <p className="mt-2 text-sm whitespace-pre-wrap">{note}</p>}

        {account.robloxProfileUrl && (
          <a
            href={account.robloxProfileUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="focus-ring mt-2 inline-block rounded text-xs text-accent"
          >
            Voir le profil Roblox ↗
          </a>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
