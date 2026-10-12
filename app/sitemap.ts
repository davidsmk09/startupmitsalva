import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["", 1, "weekly"],
    ["/gratis-check", 0.9, "monthly"],
    ["/preise", 0.9, "monthly"],
    ["/so-funktionierts", 0.8, "monthly"],
    ["/faq", 0.7, "monthly"],
    ["/angebot", 0.6, "monthly"],
    ["/kontakt", 0.5, "yearly"],
    ["/bot", 0.2, "yearly"],
    ["/impressum", 0.1, "yearly"],
    ["/datenschutz", 0.1, "yearly"],
    ["/agb", 0.1, "yearly"],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({ url: `${site.url}${path}`, lastModified: now, priority, changeFrequency }));
}
