import { env } from "@/lib/env";
import { formatEuro } from "@/lib/utils";

/** Preisdarstellung gemäß PRICE_DISPLAY (netto zzgl. MwSt. oder brutto inkl. MwSt.). */
export function priceDisplayConfig() {
  return { mode: env.priceDisplay, vat: env.vatRatePercent };
}

export function displayPrice(netCents: number, cfg = priceDisplayConfig()): string {
  const cents = cfg.mode === "gross" ? Math.round(netCents * (1 + cfg.vat / 100)) : netCents;
  return formatEuro(cents);
}
