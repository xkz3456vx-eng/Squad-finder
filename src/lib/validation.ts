import { z } from "zod";

export const AGE_RANGES = ["13-15", "16-17", "18-24", "25+"] as const;

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional();

export const usernameSchema = trimmed(50).min(1, "Le nom d'utilisateur est requis");

export const registerSchema = z.object({
  username: usernameSchema,
  displayName: optionalText(50),
  robloxProfileUrl: optionalText(300),
  robloxUserId: z.number().int().positive().nullable().optional(),
  avatarUrl: optionalText(500),
  ageRange: z.enum(AGE_RANGES).nullable().optional(),
  hasVoiceChat: z.boolean().nullable().optional(),
});

export const profileUpdateSchema = registerSchema;

export const loginSchema = z.object({
  accountNumber: z.string().trim().min(1, "Numéro de compte requis"),
});

export const listingSchema = z.object({
  title: trimmed(120).min(3, "Titre trop court"),
  description: trimmed(2000).min(1, "Décris ce que tu cherches"),
  requirements: optionalText(1000),

  gameName: trimmed(120).min(1, "Le nom du jeu est requis"),
  gameUrl: optionalText(300),
  gamePlaceId: z.number().int().positive().nullable().optional(),
  gameUniverseId: z.number().int().positive().nullable().optional(),
  gameThumbnailUrl: optionalText(500),

  privateServerLink: optionalText(500),
  slots: z.number().int().min(2).max(100).nullable().optional(),
});

export const joinRequestSchema = z.object({
  message: optionalText(500),
});

export const requestDecisionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const chatMessageSchema = z.object({
  body: trimmed(1000).min(1, "Message vide"),
});

export type ListingInput = z.infer<typeof listingSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
