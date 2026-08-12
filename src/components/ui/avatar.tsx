import { cn } from "./index";

export type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-lg",
};

const PIXELS: Record<NonNullable<AvatarProps["size"]>, number> = {
  sm: 32,
  md: 40,
  lg: 64,
};

/** Palette déterministe pour le fallback en initiales. */
const TINTS: readonly string[] = [
  "bg-[#2e2350] text-[#c3b0ff]",
  "bg-[#123043] text-[#8fd6ff]",
  "bg-[#123a2f] text-[#7ff0c0]",
  "bg-[#43321a] text-[#ffcf8f]",
  "bg-[#451f2c] text-[#ff9fb0]",
  "bg-[#2b2f4a] text-[#aebaff]",
];

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) return "?";
  const letters = words.map((word) => [...word][0] ?? "").join("");
  return letters.toUpperCase() || "?";
}

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TINTS[hash % TINTS.length] ?? "bg-surface-2 text-muted";
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: AvatarProps): React.JSX.Element {
  const base = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    "border border-border/80 bg-surface-2",
    SIZES[size],
    className,
  );

  if (src) {
    const px = PIXELS[size];
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars Roblox distants, pas d'optimisation next/image souhaitée
      <img
        src={src}
        alt={name}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(base, "object-cover")}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(base, tintFor(name), "font-semibold tracking-wide")}
    >
      {initialsOf(name)}
    </span>
  );
}
