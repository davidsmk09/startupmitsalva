import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ScanView } from "@/lib/dashboard/scan-view";
import { providerLabel } from "@/lib/providers";
import { scoreLevel } from "@/lib/scan/scoring";
import { formatDate } from "@/lib/utils";

const C = {
  text: "#111827",
  muted: "#4b5563",
  light: "#e5e7eb",
  accent: "#1d4ed8",
  pass: "#15803d",
  warn: "#b45309",
  fail: "#b91c1c",
  info: "#1d4ed8",
};

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontSize: 10.5, lineHeight: 1.5, color: C.text, fontFamily: "Helvetica" },
  coverPage: { padding: 56, color: C.text, fontFamily: "Helvetica", justifyContent: "space-between" },
  h1: { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  h2: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 10, marginTop: 4, color: C.accent },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  muted: { color: C.muted },
  small: { fontSize: 8.5, color: C.muted },
  section: { marginBottom: 18 },
  row: { flexDirection: "row" },
  card: { borderWidth: 1, borderColor: C.light, borderRadius: 6, padding: 12, marginBottom: 10 },
  scoreBox: { flex: 1, borderWidth: 1, borderColor: C.light, borderRadius: 6, padding: 12, marginRight: 8, alignItems: "center" },
  scoreNum: { fontSize: 28, fontFamily: "Helvetica-Bold" },
  barTrack: { height: 8, backgroundColor: C.light, borderRadius: 4, marginTop: 3, marginBottom: 6 },
  table: { borderTopWidth: 1, borderColor: C.light },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.light, paddingVertical: 4 },
  th: { fontFamily: "Helvetica-Bold", color: C.muted, fontSize: 9 },
  badge: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3, color: "#ffffff" },
  footer: { position: "absolute", bottom: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
  code: { fontFamily: "Courier", fontSize: 7.5, backgroundColor: "#f3f4f6", padding: 6, borderRadius: 4, marginTop: 4 },
});

const STATUS_LABEL: Record<string, string> = { PASS: "Bestanden", WARN: "Warnung", FAIL: "Nicht bestanden", INFO: "Hinweis" };
const STATUS_COLOR: Record<string, string> = { PASS: C.pass, WARN: C.warn, FAIL: C.fail, INFO: C.info };
const LEVEL_LABEL = { low: "niedrig", medium: "mittel", high: "stark" };
const pct = (x: number | null | undefined) => (x == null ? "–" : `${Math.round(x * 100)} %`);

/** Ersetzt Zeichen, die die Standard-PDF-Schrift nicht darstellen kann. */
function safe(text: string): string {
  return text
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(/[→]/g, "->")
    .replace(/[  ]/g, " ")
    .replace(/[^\u0000-ÿ€–—„“”‚‘’…•]/g, "");
}

function Bar({ value }: { value: number }) {
  return (
    <View style={s.barTrack}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 8, backgroundColor: C.accent, borderRadius: 4 }} />
    </View>
  );
}

function Footer({ brand }: { brand: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{safe(brand)}</Text>
      <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}

export type ReportBranding = { name: string; logoDataUrl?: string | null };

export function ReportDocument({ view, branding }: { view: ScanView; branding: ReportBranding }) {
  const { scan, project, metrics, audit, recommendations } = view;
  const overall = scan.overallScore;
  const level = scoreLevel(overall);
  const failing = audit.filter((a) => a.status === "FAIL" || a.status === "WARN");

  return (
    <Document title={`KI-Sichtbarkeitsreport ${project.brandName}`} author={branding.name} creator={branding.name} language="de">
      {/* Deckblatt */}
      <Page size="A4" style={s.coverPage}>
        <View>
          {branding.logoDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={branding.logoDataUrl} style={{ width: 140, maxHeight: 60, objectFit: "contain", marginBottom: 24 }} />
          ) : (
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 24 }}>{safe(branding.name)}</Text>
          )}
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 120 }}>Report</Text>
          <Text style={s.h1}>KI-Sichtbarkeit</Text>
          <Text style={{ fontSize: 20, marginBottom: 6 }}>{safe(project.brandName)}</Text>
          <Text style={s.muted}>
            {safe(project.domain)} · {safe(project.industry)} in {safe(project.city)}
          </Text>
          <Text style={[s.muted, { marginTop: 4 }]}>Scan vom {formatDate(scan.createdAt, true)}</Text>
        </View>
        <View>
          <View style={[s.card, { alignItems: "flex-start" }]}>
            <Text style={s.small}>Gesamtscore</Text>
            <Text style={{ fontSize: 40, fontFamily: "Helvetica-Bold" }}>{overall === null ? "–" : Math.round(overall)} / 100</Text>
            <Text style={s.muted}>
              Stufe: {LEVEL_LABEL[level]}
              {scan.visibilityMargin != null ? ` · Schwankungsbreite ± ${scan.visibilityMargin}` : ""}
            </Text>
          </View>
          {scan.isDemo && (
            <Text style={[s.small, { color: C.warn }]}>
              Hinweis: Dieser Report enthält simulierte Demo-Daten (kein KI-API-Key hinterlegt).
            </Text>
          )}
          <Text style={s.small}>Erstellt mit {safe(branding.name)}. KI-Antworten schwanken – dieser Report zeigt eine Momentaufnahme, keine Garantie.</Text>
        </View>
      </Page>

      {/* Executive Summary + Scores */}
      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <Text style={s.h2}>Executive Summary</Text>
          <Text>{safe(view.summary)}</Text>
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Scores</Text>
          <View style={s.row}>
            {[
              ["Gesamt", scan.overallScore],
              ["KI-Sichtbarkeit", scan.visibilityScore],
              ["Technik", scan.technicalScore],
            ].map(([label, val]) => (
              <View key={label as string} style={s.scoreBox}>
                <Text style={s.small}>{label as string}</Text>
                <Text style={s.scoreNum}>{val === null ? "–" : Math.round(val as number)}</Text>
                <Text style={s.small}>von 100</Text>
              </View>
            ))}
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>
            Gesamtscore = 60 % KI-Sichtbarkeit + 40 % Technik. KI-Sichtbarkeit = 50 % Erwähnungsrate + 25 % Zitationsrate + 10 % Prominenz + 15 % Share
            of Voice (ohne Wettbewerber geht dieses Gewicht auf die Erwähnungsrate).
          </Text>
        </View>
        {metrics && (
          <>
            <View style={s.section}>
              <Text style={s.h2}>Kennzahlen</Text>
              {[
                ["Erwähnungsrate", metrics.overall.mentionRate],
                ["Zitationsrate (eigene Domain als Quelle)", metrics.overall.citationRate],
                ["Prominenz (Position in Aufzählungen)", metrics.overall.prominence],
                ...(metrics.overall.shareOfVoice != null ? [["Share of Voice", metrics.overall.shareOfVoice] as [string, number]] : []),
              ].map(([label, v]) => (
                <View key={label as string}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text>{label as string}</Text>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>{pct(v as number)}</Text>
                  </View>
                  <Bar value={(v as number) * 100} />
                </View>
              ))}
              <Text style={s.small}>
                Basis: {metrics.overall.runs} ausgewertete Antworten{metrics.runsFailed ? `, ${metrics.runsFailed} fehlgeschlagene Abfragen` : ""}.
              </Text>
            </View>
            <View style={s.section} wrap={false}>
              <Text style={s.h2}>Nach KI-Anbieter</Text>
              <View style={s.table}>
                <View style={s.tr}>
                  <Text style={[s.th, { flex: 2 }]}>Anbieter</Text>
                  <Text style={[s.th, { flex: 1 }]}>Score</Text>
                  <Text style={[s.th, { flex: 1 }]}>Erwähnung</Text>
                  <Text style={[s.th, { flex: 1 }]}>Zitation</Text>
                </View>
                {Object.entries(metrics.byProvider).map(([p, m]) => (
                  <View key={p} style={s.tr}>
                    <Text style={{ flex: 2 }}>{safe(providerLabel(p))}</Text>
                    <Text style={{ flex: 1 }}>{Math.round(m.score)}</Text>
                    <Text style={{ flex: 1 }}>{pct(m.mentionRate)}</Text>
                    <Text style={{ flex: 1 }}>{pct(m.citationRate)}</Text>
                  </View>
                ))}
              </View>
            </View>
            {metrics.shareOfVoice.length > 0 && (
              <View style={s.section} wrap={false}>
                <Text style={s.h2}>Wettbewerb (Share of Voice)</Text>
                {metrics.shareOfVoice.map((e) => (
                  <View key={e.name}>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Text style={e.isBrand ? { fontFamily: "Helvetica-Bold" } : {}}>{safe(e.name)}</Text>
                      <Text>{pct(e.share)}</Text>
                    </View>
                    <Bar value={e.share * 100} />
                  </View>
                ))}
              </View>
            )}
            {metrics.topDomains.length > 0 && (
              <View style={s.section} wrap={false}>
                <Text style={s.h2}>Meistzitierte Quellen</Text>
                {metrics.topDomains.slice(0, 10).map((d) => (
                  <View key={d.domain} style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={d.own ? { fontFamily: "Helvetica-Bold" } : {}}>
                      {safe(d.domain)}
                      {d.own ? " (eigene Domain)" : ""}
                    </Text>
                    <Text>{d.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <Footer brand={branding.name} />
      </Page>

      {/* Befunde */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Befunde aus dem Technik-Check</Text>
        {(failing.length ? failing : audit).map((a) => (
          <View key={a.id} style={s.card} wrap={false}>
            <View style={[s.row, { alignItems: "center", marginBottom: 4 }]}>
              <Text style={[s.badge, { backgroundColor: STATUS_COLOR[a.status] ?? C.info, marginRight: 6 }]}>{STATUS_LABEL[a.status] ?? a.status}</Text>
              <Text style={s.h3}>{safe(a.title)}</Text>
            </View>
            <Text>{safe(a.details)}</Text>
            {a.status !== "PASS" && <Text style={[s.muted, { marginTop: 3 }]}>Empfehlung: {safe(a.recommendation)}</Text>}
          </View>
        ))}
        {failing.length > 0 && (
          <Text style={s.small}>
            Bestanden: {audit.filter((a) => a.status === "PASS").map((a) => safe(a.title)).join(", ") || "–"}
          </Text>
        )}
        <Footer brand={branding.name} />
      </Page>

      {/* Maßnahmen */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Maßnahmen (priorisiert)</Text>
        {recommendations.length === 0 && <Text>Keine offenen Maßnahmen.</Text>}
        {recommendations.map((r, i) => (
          <View key={r.key} style={s.card} wrap={false}>
            <Text style={s.h3}>
              {i + 1}. {safe(r.title)}
            </Text>
            <Text style={s.small}>
              Impact {r.impact.toLowerCase()} · Aufwand {r.effort.toLowerCase()} · Quelle: {r.source === "TECHNIK" ? "Technik-Check" : "KI-Antworten"}
            </Text>
            <Text style={{ marginTop: 4 }}>{safe(r.why)}</Text>
            {r.how.map((h, j) => (
              <Text key={j}>
                {j + 1}. {safe(h)}
              </Text>
            ))}
            {r.snippet && <Text style={s.code}>{safe(r.snippet.code.slice(0, 1200))}</Text>}
          </View>
        ))}
        <Footer brand={branding.name} />
      </Page>

      {/* Methodik */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Methodik und Grenzen</Text>
        <View style={s.section}>
          <Text style={s.h3}>So messen wir</Text>
          <Text>
            Wir stellen KI-Assistenten über deren offizielle Schnittstellen markenneutrale Fragen, wie sie potenzielle Kundinnen und Kunden stellen
            (z. B. „Welchen Anbieter in {safe(project.city)} empfiehlst du?“). Jede Frage wird je Anbieter mehrfach gestellt, weil Antworten
            schwanken. Wir werten aus, ob und an welcher Stelle die Marke genannt wird, ob die eigene Website als Quelle dient und wie häufig
            Wettbewerber erscheinen.
          </Text>
        </View>
        <View style={s.section}>
          <Text style={s.h3}>Technik-Check</Text>
          <Text>
            Zusätzlich prüfen wir die Website auf technische Voraussetzungen: Zugriff für KI-Crawler (robots.txt), Sitemap, HTTPS, Inhalte ohne
            JavaScript, strukturierte Daten, Metadaten, antwortfähige Inhalte, Vertrauenssignale und Konsistenz der Kontaktdaten.
          </Text>
        </View>
        <View style={s.section}>
          <Text style={s.h3}>Grenzen</Text>
          <Text>• KI-Antworten sind nicht deterministisch und ändern sich mit Modell-Updates. Ein Score ist eine Momentaufnahme.</Text>
          <Text>• API-Antworten können von den Antworten in den Endkunden-Apps abweichen (z. B. durch Personalisierung oder Standort).</Text>
          <Text>• Die Markenerkennung arbeitet mit Textabgleich; seltene Fehlzuordnungen sind möglich.</Text>
          <Text>• Stimmungsanalysen sind experimentell und fließen nicht in den Score ein.</Text>
          <Text>• Maßnahmen verbessern die Chance auf Erwähnungen, garantieren aber keine bestimmten Platzierungen.</Text>
        </View>
        <View style={s.section}>
          <Text style={s.h3}>Diesem Report zugrunde liegende Daten</Text>
          <Text>
            Anbieter: {safe((JSON.parse(scan.providersJson) as string[]).map(providerLabel).join(", ") || "–")} · Antworten: {view.runs.length} · Prompts:{" "}
            {new Set(view.runs.map((r) => r.promptStableId)).size}
          </Text>
        </View>
        <Footer brand={branding.name} />
      </Page>
    </Document>
  );
}

export async function renderReportPdf(view: ScanView, branding: ReportBranding): Promise<Buffer> {
  return renderToBuffer(<ReportDocument view={view} branding={branding} />);
}
