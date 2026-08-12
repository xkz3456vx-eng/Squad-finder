import { cn } from "./index";

/**
 * Spinner SVG minimal, colorisé via `currentColor`.
 * Utilisable depuis un Server Component (aucune API navigateur).
 */
export function Spinner({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={cn("animate-spin-slow h-4 w-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Chargement"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.22"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
