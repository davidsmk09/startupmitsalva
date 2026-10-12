import { describe, expect, it } from "vitest";
import { assertSafeUrl, assertUrlShape, isPrivateIp, SsrfError } from "@/lib/crawl/ssrf";

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd00:ec2::254",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "64:ff9b::a00:1",
  ])("blockiert %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "2a00:1450:4001:80b::200e", "2606:4700::6810:84e5"])("erlaubt %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it("blockiert ungültige Eingaben", () => {
    expect(isPrivateIp("nicht-ip")).toBe(true);
  });
});

describe("assertUrlShape", () => {
  it.each([
    "file:///etc/passwd",
    "ftp://example.com",
    "gopher://example.com",
    "http://user:pw@example.com/",
    "http://localhost/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://example.com:22/",
    "http://metadata.google.internal/",
    "http://intranet/",
    "http://printer.local/",
  ])("lehnt %s ab", (url) => {
    expect(() => assertUrlShape(url)).toThrow(SsrfError);
  });

  it("erlaubt normale http/https-URLs", () => {
    expect(assertUrlShape("https://www.example.com/pfad").hostname).toBe("www.example.com");
    expect(assertUrlShape("http://example.com:8080/").port).toBe("8080");
  });
});

describe("assertSafeUrl (mit DNS)", () => {
  it("blockiert Domains, die auf private IPs auflösen (DNS-Rebinding-Schutz)", async () => {
    await expect(assertSafeUrl("https://evil.example/", async () => ["10.0.0.5"])).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("https://evil.example/", async () => ["93.184.216.34", "127.0.0.1"])).rejects.toThrow(SsrfError);
  });
  it("erlaubt öffentliche Auflösung", async () => {
    await expect(assertSafeUrl("https://ok.example/", async () => ["93.184.216.34"])).resolves.toBeInstanceOf(URL);
  });
  it("Fehler bei nicht auflösbaren Domains", async () => {
    await expect(
      assertSafeUrl("https://gibtsnicht.example/", async () => {
        throw new Error("ENOTFOUND");
      }),
    ).rejects.toThrow(SsrfError);
  });
});
