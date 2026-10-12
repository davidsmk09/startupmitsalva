"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUS } from "@/lib/constants";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export function LeadStatusSelect({ leadId, status, compact }: { leadId: string; status: string; compact?: boolean }) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Lead-Status ändern"
      className={compact ? "h-8 text-xs" : undefined}
      defaultValue={status}
      onChange={async (e) => {
        const res = await apiFetch(`/api/admin/leads/${leadId}`, { method: "PATCH", body: { status: e.target.value } });
        if (!res.ok) return toast.error(res.error);
        toast.success("Status aktualisiert.");
        router.refresh();
      }}
    >
      {LEAD_STATUS.map((s) => (
        <option key={s} value={s}>
          {t.lead.status[s]}
        </option>
      ))}
    </NativeSelect>
  );
}

export function LeadNotes({ leadId, notes }: { leadId: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor="notes" className="text-sm font-medium">
        Interne Notizen
      </label>
      <Textarea id="notes" rows={6} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await apiFetch(`/api/admin/leads/${leadId}`, { method: "PATCH", body: { notes: value } });
          setBusy(false);
          if (res.ok) toast.success("Notizen gespeichert.");
          else toast.error(res.error);
        }}
      >
        Notizen speichern
      </Button>
    </div>
  );
}

export function ConvertLeadButton({ leadId, defaultPaket }: { leadId: string; defaultPaket: number }) {
  const router = useRouter();
  const [paket, setPaket] = useState(defaultPaket === 3 ? 3 : 2);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect aria-label="Paket" className="h-9 w-auto" value={paket} onChange={(e) => setPaket(Number(e.target.value))}>
        <option value={2}>Paket 2</option>
        <option value={3}>Paket 3</option>
      </NativeSelect>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await apiFetch<{ serviceProject: { id: string } }>(`/api/admin/leads/${leadId}/convert`, { body: { paket, withTemplate: true } });
          setBusy(false);
          if (!res.ok) return toast.error(res.error);
          toast.success("Serviceprojekt angelegt.");
          router.push(`/admin/service-projects/${res.data.serviceProject.id}`);
        }}
      >
        In Serviceprojekt umwandeln
      </Button>
    </div>
  );
}
