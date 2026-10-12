import { FlaskConical } from "lucide-react";
import { t } from "@/lib/i18n";

export function DemoBanner() {
  return (
    <div role="status" className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-sm" data-testid="demo-banner">
      <FlaskConical className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{t.common.demoBanner}</span>
    </div>
  );
}
