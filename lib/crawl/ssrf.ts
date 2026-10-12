import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * SSRF-Schutz: nur http/https, keine Zugangsdaten in der URL, nur übliche
 * Ports, und keine privaten/Loopback/Link-Local/Metadaten-Adressen –
 * geprüft nach DNS-Auflösung (und erneut bei jeder Weiterleitung sowie beim
 * Verbindungsaufbau, siehe fetcher.ts → Schutz gegen DNS-Rebinding).
 */
export class SsrfError extends Error {}

const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function inV4Range(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4 = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16", // Link-Local inkl. Cloud-Metadaten 169.254.169.254
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
];

/** Expandiert eine IPv6-Adresse in 8 Hextets. */
function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone >= 0) addr = addr.slice(0, zone);
  // Eingebettetes IPv4 am Ende (z. B. ::ffff:1.2.3.4)
  const v4Match = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Match) {
    const n = ipv4ToInt(v4Match[1]);
    addr = addr.replace(v4Match[1], `${((n >>> 16) & 0xffff).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const parts = addr.split("::");
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (parts.length === 1 && missing !== 0) return null;
  const all = [...head, ...Array(Math.max(0, missing)).fill("0"), ...tail];
  if (all.length !== 8) return null;
  const nums = all.map((h) => parseInt(h || "0", 16));
  return nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff) ? null : nums;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return BLOCKED_V4.some((r) => inV4Range(ip, r)) || ip === "255.255.255.255";
  if (version === 6) {
    const h = expandV6(ip);
    if (!h) return true;
    const isZero = h.every((x) => x === 0);
    const isLoopback = h.slice(0, 7).every((x) => x === 0) && h[7] === 1;
    if (isZero || isLoopback) return true;
    if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local
    if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-Local
    if ((h[0] & 0xff00) === 0xff00) return true; // ff00::/8 Multicast
    if (h[0] === 0x2001 && h[1] === 0x0db8) return true; // Dokumentation
    // IPv4-mapped (::ffff:0:0/96), IPv4-kompatibel (::/96), NAT64 (64:ff9b::/96)
    const v4mapped = h.slice(0, 5).every((x) => x === 0) && (h[5] === 0xffff || h[5] === 0);
    const nat64 = h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0);
    if (v4mapped || nat64) {
      const v4 = `${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`;
      return isPrivateIp(v4);
    }
    return false;
  }
  return true; // keine gültige IP -> blockieren
}

const BLOCKED_HOSTNAMES = [/^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i, /^metadata(\.google\.internal)?$/i];

/** Prüft Schema/Port/Host (ohne DNS). Wirft SsrfError. */
export function assertUrlShape(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("Ungültige URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SsrfError("Nur http/https erlaubt");
  if (url.username || url.password) throw new SsrfError("Zugangsdaten in URL nicht erlaubt");
  if (!ALLOWED_PORTS.has(url.port)) throw new SsrfError("Port nicht erlaubt");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.some((r) => r.test(host))) throw new SsrfError("Host nicht erlaubt");
  if (isIP(host) && isPrivateIp(host)) throw new SsrfError("Private/interne IP-Adresse nicht erlaubt");
  if (!isIP(host) && !host.includes(".")) throw new SsrfError("Host nicht erlaubt");
  return url;
}

export type Resolver = (host: string) => Promise<string[]>;

const defaultResolver: Resolver = async (host) => (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

/** Vollständige Prüfung inkl. DNS-Auflösung aller Adressen. */
export async function assertSafeUrl(raw: string, resolve: Resolver = defaultResolver): Promise<URL> {
  const url = assertUrlShape(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return url;
  let addresses: string[];
  try {
    addresses = await resolve(host);
  } catch {
    throw new SsrfError("Domain konnte nicht aufgelöst werden");
  }
  if (!addresses.length) throw new SsrfError("Domain konnte nicht aufgelöst werden");
  if (addresses.some(isPrivateIp)) throw new SsrfError("Domain zeigt auf eine private/interne Adresse");
  return url;
}
