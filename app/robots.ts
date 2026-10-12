import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** KI-Crawler ausdrücklich erlaubt – wir leben vor, was wir empfehlen. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/dashboard", "/admin", "/api/", "/gratis-check/ergebnis/"];
  return {
    rules: [
      ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"].map((ua) => ({
        userAgent: ua,
        allow: "/",
        disallow,
      })),
      { userAgent: "*", allow: "/", disallow },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
