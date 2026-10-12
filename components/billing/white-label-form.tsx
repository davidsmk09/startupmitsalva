"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";

export function WhiteLabelForm({ initialName, hasLogo }: { initialName: string; hasLogo: boolean }) {
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await apiFetch("/api/org/white-label", { method: "PATCH", body: { name, ...(logo !== undefined ? { logoDataUrl: logo } : {}) } });
        setBusy(false);
        if (res.ok) toast.success("White-Label gespeichert. Neue Reports nutzen dein Branding.");
        else toast.error(res.error);
      }}
    >
      <Field id="wl-name" label="Name im Report" hint="z. B. deine Agentur">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <Field id="wl-logo" label="Logo (PNG/JPG, max. 300 KB)" hint={hasLogo ? "Ein Logo ist hinterlegt." : undefined}>
        <Input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 300 * 1024) return toast.error("Datei ist größer als 300 KB.");
            const reader = new FileReader();
            reader.onload = () => setLogo(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Speichern
        </Button>
        {hasLogo && (
          <Button type="button" variant="ghost" onClick={() => setLogo(null)}>
            Logo entfernen (beim Speichern)
          </Button>
        )}
      </div>
    </form>
  );
}
