"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Globe, Search, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { HorizontalBars } from "@/components/charts/bar-chart";
import { AuditStatusBadge, EffortBadge, ImpactBadge } from "@/components/dashboard/status-badge";
import { HighlightedAnswer } from "@/components/scan/highlight";
import { CopyCode } from "@/components/scan/copy-code";
import { apiFetch } from "@/lib/client-api";
import type { Recommendation } from "@/lib/recommendations";
import type { ScanMetrics } from "@/lib/scan/scoring";
import type { ScanRunView } from "@/lib/dashboard/scan-view";
import { t } from "@/lib/i18n";

export type ScanResultData = {
  scanId: string;
  brandNames: string[];
  competitorNames: string[];
  ownDomain: string;
  summary: string;
  overall: number | null;
  visibility: number | null;
  technical: number | null;
  margin: number | null;
  partial: boolean;
  note: string | null;
  metrics: ScanMetrics | null;
  audit: { id: string; checkKey: string; title: string; status: string; weight: number; details: string; recommendation: string; data: Record<string, unknown> | null }[];
  recommendations: Recommendation[];
  runs: ScanRunView[];
  providerLabels: Record<string, string>;
  competitionEnabled: boolean;
  taskTargets?: { id: string; title: string }[];
};

const CAT_LABEL: Record<string, string> = { KATEGORIE: "Kategorie", EMPFEHLUNG: "Empfehlung", VERGLEICH: "Vergleich", LOKAL: "Lokal", MARKE: "Marke" };
const pct = (x: number | null | undefined) => (x == null ? "–" : `${Math.round(x * 100)} %`);

export function ScanResultTabs({ data, defaultTab = "overview" }: { data: ScanResultData; defaultTab?: string }) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList aria-label="Ergebnis-Bereiche">
        <TabsTrigger value="overview">{t.scan.tabs.overview}</TabsTrigger>
        <TabsTrigger value="answers">{t.scan.tabs.answers}</TabsTrigger>
        <TabsTrigger value="sources">{t.scan.tabs.sources}</TabsTrigger>
        <TabsTrigger value="competition">{t.scan.tabs.competition}</TabsTrigger>
        <TabsTrigger value="technical">{t.scan.tabs.technical}</TabsTrigger>
        <TabsTrigger value="recommendations">{t.scan.tabs.recommendations}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab data={data} />
      </TabsContent>
      <TabsContent value="answers">
        <AnswersTab data={data} />
      </TabsContent>
      <TabsContent value="sources">
        <SourcesTab data={data} />
      </TabsContent>
      <TabsContent value="competition">
        <CompetitionTab data={data} />
      </TabsContent>
      <TabsContent value="technical">
        <TechnicalTab data={data} />
      </TabsContent>
      <TabsContent value="recommendations">
        <RecommendationsTab data={data} />
      </TabsContent>
    </Tabs>
  );
}

function OverviewTab({ data }: { data: ScanResultData }) {
  const m = data.metrics;
  return (
    <div className="space-y-6">
      {(data.partial || data.note) && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Hinweis</AlertTitle>
          <AlertDescription>
            {data.partial && <p>{t.scan.partial}</p>}
            {data.note && <p>{data.note}</p>}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-3">
          <ScoreGauge score={data.overall} margin={data.margin} label={t.dashboard.overallScore} />
          <ScoreGauge score={data.visibility} margin={data.margin} label={t.dashboard.visibilityScore} />
          <ScoreGauge score={data.technical} label={t.dashboard.technicalScore} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>
      {m && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Kennzahlen</CardTitle>
              <CardDescription>{m.overall.runs} ausgewertete KI-Antworten</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  [t.scan.mentionRate, pct(m.overall.mentionRate), "50 %"],
                  [t.scan.citationRate, pct(m.overall.citationRate), "25 %"],
                  [t.scan.prominence, pct(m.overall.prominence), "10 %"],
                  [t.scan.shareOfVoice, m.overall.shareOfVoice == null ? "– (keine Wettbewerber)" : pct(m.overall.shareOfVoice), "15 %"],
                ].map(([k, v, w]) => (
                  <div key={k} className="rounded-md bg-muted p-3">
                    <dt className="text-xs text-muted-foreground">
                      {k} <span className="opacity-70">(Gewicht {w})</span>
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.dashboard.byProvider}</CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBars
                ariaLabel="Balkendiagramm: Sichtbarkeit je KI-Anbieter"
                valueHeader="Score"
                data={Object.entries(m.byProvider).map(([p, v]) => ({ label: data.providerLabels[p] ?? p, value: Math.round(v.score) }))}
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle as="h2">Nach Prompt-Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Antworten</TableHead>
                    <TableHead>{t.scan.mentionRate}</TableHead>
                    <TableHead>{t.scan.citationRate}</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(m.byCategory).map(([c, v]) => (
                    <TableRow key={c}>
                      <TableCell>{CAT_LABEL[c] ?? c}</TableCell>
                      <TableCell className="tabular-nums">{v.runs}</TableCell>
                      <TableCell className="tabular-nums">{pct(v.mentionRate)}</TableCell>
                      <TableCell className="tabular-nums">{pct(v.citationRate)}</TableCell>
                      <TableCell className="tabular-nums">{Math.round(v.score)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t.common.honestyNote}</p>
    </div>
  );
}

function AnswersTab({ data }: { data: ScanResultData }) {
  const [provider, setProvider] = useState("all");
  const [category, setCategory] = useState("all");
  const [mention, setMention] = useState("all");
  const [q, setQ] = useState("");
  const providers = Array.from(new Set(data.runs.map((r) => r.provider)));
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.runs.filter(
      (r) =>
        (provider === "all" || r.provider === provider) &&
        (category === "all" || r.promptCategory === category) &&
        (mention === "all" || (mention === "yes" ? r.brandMentioned : !r.brandMentioned)) &&
        (!needle || r.answerText.toLowerCase().includes(needle) || r.promptText.toLowerCase().includes(needle)),
    );
  }, [data.runs, provider, category, mention, q]);
  const byPrompt = useMemo(() => {
    const map = new Map<string, ScanRunView[]>();
    for (const r of filtered) map.set(r.promptStableId, [...(map.get(r.promptStableId) ?? []), r]);
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="answer-search" className="sr-only">
            Antworten durchsuchen
          </label>
          <Input id="answer-search" className="pl-9" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect aria-label="KI-Anbieter filtern" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="all">Alle Anbieter</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {data.providerLabels[p] ?? p}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Kategorie filtern" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Alle Kategorien</option>
          {Object.entries(CAT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Erwähnung filtern" value={mention} onChange={(e) => setMention(e.target.value)}>
          <option value="all">Erwähnt & nicht erwähnt</option>
          <option value="yes">Nur mit Erwähnung</option>
          <option value="no">Nur ohne Erwähnung</option>
        </NativeSelect>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} Antworten · <mark className="brand-hit">Marke</mark> · <mark className="competitor-hit">Wettbewerber</mark>
      </p>
      {byPrompt.map(([stableId, runs]) => (
        <Card key={stableId}>
          <CardHeader className="pb-3">
            <CardDescription>
              <code>{stableId}</code> · {CAT_LABEL[runs[0].promptCategory] ?? runs[0].promptCategory}
            </CardDescription>
            <CardTitle as="h3" className="text-base">
              „{runs[0].promptText}“
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.map((r) => (
              <details key={r.id} className="rounded-md border p-3" open={runs.length <= 2}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{data.providerLabels[r.provider] ?? r.provider}</span>
                  <span className="text-muted-foreground">Lauf {r.runIndex + 1}</span>
                  {r.error ? (
                    <Badge variant="destructive">Fehler</Badge>
                  ) : (
                    <>
                      <Badge variant={r.brandMentioned ? "success" : "secondary"}>{r.brandMentioned ? t.scan.mentioned : t.scan.notMentioned}</Badge>
                      {r.brandCited && <Badge variant="info">{t.scan.cited}</Badge>}
                      {r.mentionPosition && <Badge variant="outline">{t.scan.position} {r.mentionPosition}</Badge>}
                      {r.sentiment && (
                        <Badge variant="outline" title={t.scan.sentimentExperimental}>
                          Stimmung: {r.sentiment} (exp.)
                        </Badge>
                      )}
                    </>
                  )}
                </summary>
                <div className="mt-3">
                  {r.error ? (
                    <p className="text-sm text-destructive">{r.error}</p>
                  ) : (
                    <>
                      <HighlightedAnswer text={r.answerText} brand={data.brandNames} competitors={data.competitorNames} />
                      {r.citations.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground">Quellen</p>
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {r.citations.slice(0, 10).map((c) => (
                              <li key={c.url}>
                                <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  {c.title || new URL(c.url).hostname}
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SourcesTab({ data }: { data: ScanResultData }) {
  const m = data.metrics;
  if (!m) return <p className="text-sm text-muted-foreground">Keine Daten.</p>;
  return (
    <div className="space-y-6">
      <Alert variant={m.ownDomainCited ? "success" : "warning"}>
        {m.ownDomainCited ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle>{m.ownDomainCited ? t.scan.ownDomainCited : t.scan.ownDomainNotCited}</AlertTitle>
        <AlertDescription>
          Domain: <strong>{data.ownDomain}</strong> · Zitationsrate {pct(m.overall.citationRate)}
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Meistzitierte Domains</CardTitle>
          <CardDescription>Welche Quellen nutzen die KI-Assistenten für Antworten in deiner Branche?</CardDescription>
        </CardHeader>
        <CardContent>
          {m.topDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">Die Antworten enthielten keine Quellenangaben.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Nennungen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.topDomains.map((d, i) => (
                  <TableRow key={d.domain} className={d.own ? "bg-success/10" : ""}>
                    <TableCell className="tabular-nums">{i + 1}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {d.domain} {d.own && <Badge variant="success">deine Domain</Badge>}
                    </TableCell>
                    <TableCell className="tabular-nums">{d.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitionTab({ data }: { data: ScanResultData }) {
  const m = data.metrics;
  if (!data.competitionEnabled || !m || m.shareOfVoice.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {data.competitionEnabled
            ? "Für dieses Projekt sind keine Wettbewerber hinterlegt. Ergänze bis zu 5 Wettbewerber in den Projekteinstellungen."
            : "Der Wettbewerbsvergleich (Share of Voice) ist ab dem Business-Plan enthalten."}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t.scan.shareOfVoice}</CardTitle>
        <CardDescription>Anteil der Erwähnungen über alle Antworten (deine Marke hervorgehoben)</CardDescription>
      </CardHeader>
      <CardContent>
        <HorizontalBars
          ariaLabel="Balkendiagramm: Share of Voice"
          valueSuffix=" %"
          valueHeader="Anteil"
          data={m.shareOfVoice.map((e) => ({ label: e.name, value: Math.round(e.share * 100), highlight: e.isBrand }))}
        />
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Marke</TableHead>
              <TableHead>Erwähnungen</TableHead>
              <TableHead>Anteil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {m.shareOfVoice.map((e) => (
              <TableRow key={e.name}>
                <TableCell className={e.isBrand ? "font-semibold" : ""}>{e.name}</TableCell>
                <TableCell className="tabular-nums">{e.mentions}</TableCell>
                <TableCell className="tabular-nums">{pct(e.share)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TechnicalTab({ data }: { data: ScanResultData }) {
  if (data.audit.length === 0) return <p className="text-sm text-muted-foreground">Kein Technik-Check vorhanden.</p>;
  return (
    <ul className="space-y-3">
      {data.audit.map((a) => (
        <li key={a.id}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <AuditStatusBadge status={a.status} />
                <CardTitle as="h3" className="text-base">
                  {a.title}
                </CardTitle>
                {a.weight > 0 && <span className="text-xs text-muted-foreground">Gewicht {a.weight}</span>}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{a.details}</p>
              {Array.isArray(a.data?.blocked) && (a.data!.blocked as string[]).length > 0 && (
                <ul className="flex flex-wrap gap-1">
                  {(a.data!.blocked as string[]).map((b) => (
                    <li key={b}>
                      <Badge variant="destructive">{b} blockiert</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {a.status !== "PASS" && (
                <p className="rounded-md bg-muted p-3">
                  <strong>So behebst du es: </strong>
                  {a.recommendation}
                </p>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function RecommendationsTab({ data }: { data: ScanResultData }) {
  const [target, setTarget] = useState(data.taskTargets?.[0]?.id ?? "");
  if (data.recommendations.length === 0) return <p className="text-sm text-muted-foreground">Keine offenen Empfehlungen.</p>;
  return (
    <div className="space-y-4">
      {data.taskTargets && data.taskTargets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3 text-sm">
          <span className="font-medium">Admin: In Serviceprojekt übernehmen</span>
          <NativeSelect aria-label="Serviceprojekt wählen" className="h-9 w-auto" value={target} onChange={(e) => setTarget(e.target.value)}>
            {data.taskTargets.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.title}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <ol className="space-y-4">
        {data.recommendations.map((r, i) => (
          <li key={r.key}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                  <CardTitle as="h3" className="text-base">
                    {r.title}
                  </CardTitle>
                  <ImpactBadge impact={r.impact} />
                  <EffortBadge effort={r.effort} />
                  <Badge variant="outline">{r.source === "TECHNIK" ? "Technik" : "KI-Antworten"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{t.reco.why}</p>
                  <p className="text-muted-foreground">{r.why}</p>
                </div>
                <div>
                  <p className="font-medium">{t.reco.how}</p>
                  <ol className="ml-5 list-decimal space-y-1">
                    {r.how.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ol>
                </div>
                {r.snippet && <CopyCode code={r.snippet.code} language={r.snippet.language} />}
                {data.taskTargets && data.taskTargets.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await apiFetch(`/api/admin/service-projects/${target}/tasks`, {
                        body: { titel: r.title, beschreibung: `${r.why}\n\n${r.how.map((h) => `- ${h}`).join("\n")}`, kategorie: r.category, sichtbarFuerKunde: true },
                      });
                      if (res.ok) toast.success("Als Task übernommen.");
                      else toast.error(res.error);
                    }}
                  >
                    <ListPlus /> Als Service-Task anlegen
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
