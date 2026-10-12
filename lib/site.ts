import { env } from "@/lib/env";

/** Seitenweite Konfiguration (Name/URL kommen aus ENV). */
export const site = {
  get name() {
    return env.appName;
  },
  get url() {
    return env.appUrl;
  },
  description:
    "Prüfe, wie sichtbar dein Unternehmen in KI-Antworten von ChatGPT, Perplexity, Gemini und Claude ist – und erhalte konkrete, priorisierte Verbesserungen.",
  locale: "de_DE",
};
