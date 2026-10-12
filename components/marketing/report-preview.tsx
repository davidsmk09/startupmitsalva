import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Beispiel-Report mit FIKTIVEN Daten (klar gekennzeichnet). */
export function ReportPreview() {
  const providers = [
    { name: "ChatGPT", value: 58 },
    { name: "Perplexity", value: 71 },
    { name: "Gemini", value: 44 },
    { name: "Claude", value: 52 },
  ];
  return (
    <div className="relative">
      <Badge variant="warning" className="absolute -top-3 left-4 z-10">
        Beispiel mit fiktiven Daten
      </Badge>
      <Card className="overflow-hidden shadow-xl" aria-label="Beispiel-Report (fiktive Daten)">
        <div className="border-b bg-muted/50 px-6 py-3 text-sm text-muted-foreground">Musterbetrieb Sanitär · Köln</div>
        <CardContent className="grid gap-6 p-6 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center">
            <ScoreGauge score={56} margin={6} label="Gesamtscore" size={180} />
          </div>
          <div className="space-y-3 md:col-span-2">
            <CardHeader className="p-0">
              <CardTitle as="h3" className="text-base">
                Sichtbarkeit je KI-Anbieter
              </CardTitle>
            </CardHeader>
            {providers.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="tabular-nums">{p.value}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${p.value}%` }} />
                </div>
              </div>
            ))}
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                robots.txt blockiert GPTBot – KI-Crawler können Inhalte nicht lesen
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden="true" />
                Keine FAQ-Struktur – 8 Fragen als FAQPage-Schema ergänzen
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                Impressum, Kontakt und Adresse konsistent
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
