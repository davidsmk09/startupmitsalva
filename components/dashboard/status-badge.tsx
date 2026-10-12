import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

const SCAN_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
  COMPLETED: "success",
  RUNNING: "info",
  QUEUED: "secondary",
  FAILED: "destructive",
};

export function ScanStatusBadge({ status }: { status: string }) {
  return <Badge variant={SCAN_VARIANT[status] ?? "secondary"}>{t.scan.status[status] ?? status}</Badge>;
}

const AUDIT_VARIANT: Record<string, "success" | "warning" | "destructive" | "info"> = {
  PASS: "success",
  WARN: "warning",
  FAIL: "destructive",
  INFO: "info",
};

export function AuditStatusBadge({ status }: { status: string }) {
  return <Badge variant={AUDIT_VARIANT[status] ?? "info"}>{t.audit.status[status] ?? status}</Badge>;
}

export function ImpactBadge({ impact }: { impact: string }) {
  const v = impact === "HOCH" ? "destructive" : impact === "MITTEL" ? "warning" : "secondary";
  return <Badge variant={v}>{t.reco.impact[impact] ?? impact}</Badge>;
}

export function EffortBadge({ effort }: { effort: string }) {
  return <Badge variant="outline">{t.reco.effort[effort] ?? effort}</Badge>;
}
