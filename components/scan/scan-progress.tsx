"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { t } from "@/lib/i18n";

type Status = { status: string; phase: string; doneRuns: number; totalRuns: number; error: string | null };

/** Live-Status: Polling alle 3 Sekunden, bei Abschluss Seite neu laden. */
export function ScanProgress({ scanId, token, onDoneHref }: { scanId: string; token?: string; onDoneHref?: string }) {
  const router = useRouter();
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}/status${token ? `?token=${encodeURIComponent(token)}` : ""}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Status;
          if (!alive) return;
          setS(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            if (onDoneHref) router.push(onDoneHref);
            router.refresh();
            return;
          }
        }
      } catch {
        /* nächster Versuch */
      }
      timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [scanId, token, router, onDoneHref]);

  const pct = s?.totalRuns ? Math.round((s.doneRuns / s.totalRuns) * 90) + (s.phase === "AUSWERTUNG" ? 8 : 0) : s?.phase === "TECHNIK" ? 5 : 2;
  return (
    <Card data-testid="scan-progress">
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          {t.dashboard.scanRunning}
        </CardTitle>
        <CardDescription aria-live="polite">{t.scan.phases[s?.phase ?? "WARTESCHLANGE"] ?? s?.phase}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={pct} label="Fortschritt des Scans" />
        <p className="text-sm text-muted-foreground tabular-nums">
          {s?.totalRuns ? `${s.doneRuns} von ${s.totalRuns} KI-Abfragen` : "Vorbereitung …"}
        </p>
        {s?.phase === "WARTESCHLANGE" && (
          <p className="text-xs text-muted-foreground">
            Der Scan wartet auf einen freien Worker. Lokal: Läuft <code>npm run worker</code>?
          </p>
        )}
      </CardContent>
    </Card>
  );
}
