import * as React from "react";
import { cn } from "./index";

export type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FieldProps): React.JSX.Element {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-5 text-text"
      >
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p className="text-xs leading-4 text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-4 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Contrôles
   -------------------------------------------------------------------------- */

const CONTROL = cn(
  "focus-ring w-full rounded-lg border border-border bg-surface-2 text-text",
  "placeholder:text-muted",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border/80",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:text-danger",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(CONTROL, "h-10 px-3 text-sm", className)}
        {...rest}
      />
    );
  },
);

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ className, rows, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows ?? 4}
        className={cn(CONTROL, "min-h-24 resize-y px-3 py-2 text-sm", className)}
        {...rest}
      />
    );
  },
);

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          CONTROL,
          "h-10 cursor-pointer appearance-none px-3 pr-9 text-sm",
          // Chevron intégré (data-URI, aucune dépendance)
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239a9ab0%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
          "bg-[length:16px_16px] bg-[right_0.65rem_center] bg-no-repeat",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);
