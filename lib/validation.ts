import { z } from "zod";
import { passwordSchema } from "@/lib/auth/password";
import { MAX_ALIASES, MAX_COMPETITORS, PROMPT_CATEGORIES } from "@/lib/constants";

export const emailSchema = z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse ein.").max(200);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib deinen Namen ein.").max(100),
  company: z.string().trim().max(120).optional().default(""),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "Bitte akzeptiere die AGB." }),
});

export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password: passwordSchema });

const domainRegex = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export const domainSchema = z
  .string()
  .trim()
  .min(3, "Bitte gib eine Domain ein.")
  .max(253)
  .transform((s) =>
    s
      .toLowerCase()
      .replace(/^[a-z]+:\/\//, "")
      .split("/")[0]
      .replace(/:\d+$/, "")
      .replace(/^www\./, ""),
  )
  .refine((s) => domainRegex.test(s), "Bitte gib eine gültige Domain ein (z. B. beispiel.de).");

export const competitorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  domain: z.union([domainSchema, z.literal("")]).optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Projektnamen ein.").max(100),
  brandName: z.string().trim().min(1, "Bitte gib den Markennamen ein.").max(100),
  brandAliases: z.array(z.string().trim().min(1).max(100)).max(MAX_ALIASES).default([]),
  domain: domainSchema,
  industry: z.string().trim().min(2, "Bitte gib die Branche ein.").max(100),
  city: z.string().trim().min(2, "Bitte gib den Ort ein.").max(100),
  region: z.string().trim().max(100).optional().nullable(),
  language: z.enum(["de", "en"]).default("de"),
  competitors: z.array(competitorSchema).max(MAX_COMPETITORS, `Maximal ${MAX_COMPETITORS} Wettbewerber.`).default([]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const promptSchema = z.object({
  text: z.string().trim().min(5, "Der Prompt ist zu kurz.").max(500),
  category: z.enum(PROMPT_CATEGORIES),
  active: z.boolean().optional(),
  isTop: z.boolean().optional(),
});

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib deinen Namen ein.").max(100),
  email: emailSchema,
  firma: z.string().trim().max(120).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  branche: z.string().trim().max(100).optional().default(""),
  paketInteresse: z.enum(["1", "2", "3"]).optional(),
  nachricht: z.string().trim().max(5000).optional().default(""),
  consent: z.literal(true, { error: "Bitte bestätige die Einwilligung." }),
  // Honeypot – muss leer bleiben
  homepage: z.string().max(0).optional().default(""),
  source: z.enum(["ANGEBOT", "KONTAKT"]).default("KONTAKT"),
});

export const quickCheckSchema = z.object({
  domain: domainSchema,
  brandName: z.string().trim().min(1, "Bitte gib den Markennamen ein.").max(100),
  industry: z.string().trim().min(2, "Bitte gib die Branche ein.").max(100),
  city: z.string().trim().min(2, "Bitte gib den Ort ein.").max(100),
  email: emailSchema,
  consent: z.literal(true, { error: "Bitte bestätige die Einwilligung." }),
  homepage: z.string().max(0).optional().default(""),
});
