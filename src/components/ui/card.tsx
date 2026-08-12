import { cn } from "./index";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({
  interactive = false,
  className,
  children,
  ...rest
}: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 shadow-sm shadow-black/30 sm:p-5",
        interactive &&
          cn(
            "cursor-pointer transition-[border-color,box-shadow,transform,background-color] duration-200",
            "hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2 hover:shadow-lg hover:shadow-black/40",
            "focus-within:border-accent/60",
          ),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
