import { describe, expect, it } from "vitest";
import { normalizeDomain, parseJson, currentMonth } from "@/lib/utils";
import { domainSchema, registerSchema } from "@/lib/validation";
import { hashToken, generateToken } from "@/lib/security/tokens";

describe("normalizeDomain", () => {
  it("entfernt Protokoll, www, Pfad und Port", () => {
    expect(normalizeDomain("https://www.Beispiel.de:443/pfad?x=1")).toBe("beispiel.de");
    expect(normalizeDomain("shop.example.com")).toBe("shop.example.com");
  });
});

describe("domainSchema", () => {
  it("akzeptiert gültige Domains und normalisiert", () => {
    expect(domainSchema.parse("https://www.Mueller-Bau.de/")).toBe("mueller-bau.de");
  });
  it("lehnt ungültige Eingaben ab", () => {
    expect(domainSchema.safeParse("localhost").success).toBe(false);
    expect(domainSchema.safeParse("nicht eine domain").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("verlangt mindestens 10 Zeichen Passwort und AGB", () => {
    const base = { name: "A", email: "a@b.de", password: "123456789", acceptTerms: true };
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "1234567890" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: "1234567890", acceptTerms: false }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("parseJson mit Fallback", () => {
    expect(parseJson("[1]", [])).toEqual([1]);
    expect(parseJson("kaputt", ["x"])).toEqual(["x"]);
  });
  it("currentMonth", () => {
    expect(currentMonth(new Date("2026-03-05T00:00:00Z"))).toBe("2026-03");
  });
  it("Tokens werden gehasht", () => {
    const tk = generateToken();
    expect(tk).toHaveLength(64);
    expect(hashToken(tk)).not.toBe(tk);
    expect(hashToken(tk)).toBe(hashToken(tk));
  });
});
