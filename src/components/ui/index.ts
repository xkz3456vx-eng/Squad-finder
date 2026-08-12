/**
 * Point d'entrée du design system Squad Finder.
 * Tous les composants sont présentationnels et utilisables depuis un
 * Server Component (aucun `"use client"`, aucune API navigateur).
 */

export type ClassValue = string | false | null | undefined;

/** Mini-`clsx` : concatène les classes non vides (aucune dépendance npm). */
export function cn(...classes: ClassValue[]): string {
  let out = "";
  for (const cls of classes) {
    if (!cls) continue;
    out = out ? `${out} ${cls}` : cls;
  }
  return out;
}

export { Button } from "./button";
export type { ButtonProps } from "./button";

export { Avatar } from "./avatar";
export type { AvatarProps } from "./avatar";

export { Badge } from "./badge";
export type { BadgeProps } from "./badge";

export { Card } from "./card";
export type { CardProps } from "./card";

export { Field, TextInput, TextArea, Select } from "./field";
export type {
  FieldProps,
  TextInputProps,
  TextAreaProps,
  SelectProps,
} from "./field";

export { Spinner } from "./spinner";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";
