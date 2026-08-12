const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** "il y a 3 minutes" from a unix-seconds timestamp. */
export function timeAgo(unixSeconds: number, now = Date.now()): string {
  const diff = Math.round(unixSeconds - now / 1000);
  const abs = Math.abs(diff);

  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return "à l'instant";
}

export function formatTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("fr", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function displayNameOf(account: {
  username: string;
  displayName: string | null;
}): string {
  return account.displayName?.trim() || account.username;
}
