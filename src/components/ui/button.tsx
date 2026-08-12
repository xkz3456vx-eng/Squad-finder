import { cn } from "./index";
import { Spinner } from "./spinner";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-contrast border border-transparent shadow-sm shadow-black/40 hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface-2 text-text border border-border hover:bg-surface-2 hover:border-accent/60 active:brightness-95",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-surface-2 hover:text-text",
  danger:
    "bg-danger-soft text-danger border border-danger/40 hover:bg-danger hover:text-accent-contrast active:brightness-95",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled === true || loading;

  return (
    <button
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "focus-ring inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,border-color,color,filter,box-shadow] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} /> : null}
      {children}
    </button>
  );
}
