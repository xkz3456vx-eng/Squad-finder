import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, sessions, type Account } from "@/lib/db/schema";
import { generateAccountNumber, normalizeAccountNumber } from "./account-number";

export const SESSION_COOKIE = "squad_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export type NewAccountInput = {
  username: string;
  displayName?: string | null;
  robloxUserId?: number | null;
  robloxProfileUrl?: string | null;
  avatarUrl?: string | null;
  ageRange?: string | null;
  hasVoiceChat?: boolean | null;
};

/**
 * Creates an anonymous account and opens its session. The returned account
 * number is the only credential the user ever gets — it is shown once at
 * sign-up and is what they type to sign back in on another device.
 */
export async function registerAccount(
  input: NewAccountInput,
): Promise<Account> {
  // The account number is random enough that a collision is astronomically
  // unlikely, but the unique index makes the retry cheap and correct.
  let created: Account | undefined;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const row = {
      id: randomUUID(),
      accountNumber: generateAccountNumber(),
      username: input.username,
      displayName: input.displayName ?? null,
      robloxUserId: input.robloxUserId ?? null,
      robloxProfileUrl: input.robloxProfileUrl ?? null,
      avatarUrl: input.avatarUrl ?? null,
      ageRange: input.ageRange ?? null,
      hasVoiceChat: input.hasVoiceChat ?? null,
    };
    try {
      created = db.insert(accounts).values(row).returning().get();
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  if (!created) throw new Error("Could not allocate an account number");

  await openSession(created.id);
  return created;
}

/** Opens a new device session and puts its token in the cookie. */
async function openSession(accountId: string): Promise<void> {
  const token = newSessionToken();
  db.insert(sessions)
    .values({ id: randomUUID(), accountId, tokenHash: hashToken(token) })
    .run();
  await setSessionCookie(token);
}

/**
 * Signs in with an account number. Existing sessions on other devices are left
 * alone — signing in on a phone must not sign you out on a desktop.
 */
export async function loginWithAccountNumber(
  rawAccountNumber: string,
): Promise<Account | null> {
  const accountNumber = normalizeAccountNumber(rawAccountNumber);
  if (!accountNumber) return null;

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.accountNumber, accountNumber))
    .get();
  if (!account) return null;

  await openSession(account.id);
  return account;
}

/** Ends only the session this device is holding. */
export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in account, or null. Memoised for the lifetime of the request. */
export const getCurrentAccount = cache(async (): Promise<Account | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .get();

  return row?.account ?? null;
});

/** Same as {@link getCurrentAccount} but throws for guarded routes. */
export async function requireAccount(): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account) throw new UnauthorizedError();
  return account;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * What other users are allowed to see. The account number is a credential and
 * must never cross this boundary.
 */
export type PublicAccount = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  robloxUserId: number | null;
  robloxProfileUrl: string | null;
  ageRange: string | null;
  hasVoiceChat: boolean | null;
};

export function toPublicAccount(account: Account): PublicAccount {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    robloxUserId: account.robloxUserId,
    robloxProfileUrl: account.robloxProfileUrl,
    ageRange: account.ageRange,
    hasVoiceChat: account.hasVoiceChat,
  };
}
