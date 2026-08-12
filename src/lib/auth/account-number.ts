import { randomInt } from "node:crypto";

/**
 * Crockford-style alphabet: no I, L, O, U, so a number read out loud or copied
 * by hand cannot be ambiguous.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUPS = 3;
const GROUP_SIZE = 4;

/** e.g. `RBX-7K3M-9QW2-XT4A` */
export function generateAccountNumber(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let chunk = "";
    for (let i = 0; i < GROUP_SIZE; i++) {
      chunk += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(chunk);
  }
  return `RBX-${groups.join("-")}`;
}

/**
 * Accepts what a human is likely to type back: lowercase, missing dashes,
 * missing prefix, stray spaces. Returns the canonical form or null.
 */
export function normalizeAccountNumber(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = raw.startsWith("RBX") ? raw.slice(3) : raw;

  if (body.length !== GROUPS * GROUP_SIZE) return null;
  if (![...body].every((c) => ALPHABET.includes(c))) return null;

  const groups: string[] = [];
  for (let i = 0; i < body.length; i += GROUP_SIZE) {
    groups.push(body.slice(i, i + GROUP_SIZE));
  }
  return `RBX-${groups.join("-")}`;
}
