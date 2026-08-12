import { cn } from "./index";

export type BadgeProps = {
  tone?: "neutral" | "accent" | "success" | "warn" | "danger";
  children: React.ReactNode;
  className?: string;
};

const TONES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent-soft text-accent border-accent/30",
  success: "bg-success-soft text-success border-success/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11px] font-semibold uppercase leading-4 tracking-wide",
        "truncate",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
