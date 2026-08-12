import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { UnauthorizedError } from "@/lib/auth/session";
import { RobloxApiError } from "@/lib/roblox/client";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Parses a JSON request body against a schema, throwing `ApiError` on failure. */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("Corps de requête JSON invalide", 400);
  }
  return schema.parse(raw);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Wraps a route handler so thrown domain errors become clean JSON responses. */
export function handler<Args extends unknown[]>(
  fn: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await fn(request, ...args);
    } catch (error) {
      if (error instanceof ApiError) return jsonError(error.message, error.status);
      if (error instanceof UnauthorizedError) {
        return jsonError("Connecte-toi pour continuer", 401);
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return jsonError(first?.message ?? "Données invalides", 422);
      }
      if (error instanceof RobloxApiError) {
        return jsonError(error.message, 502);
      }
      console.error("Unhandled route error", error);
      return jsonError("Erreur interne", 500);
    }
  };
}
