"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export type ProjectFormValues = {
  name: string;
  brandName: string;
  brandAliases: string[];
  domain: string;
  industry: string;
  city: string;
  region: string;
  language: "de" | "en";
  competitors: { name: string; domain: string }[];
};

const EMPTY: ProjectFormValues = {
  name: "",
  brandName: "",
  brandAliases: [],
  domain: "",
  industry: "",
  city: "",
  region: "",
  language: "de",
  competitors: [],
};

const STEPS = ["Website & Marke", "Branche & Ort", "Wettbewerb & Sprache", "Zusammenfassung"];

export function ProjectForm({
  mode,
  projectId,
  initial,
  maxCompetitors,
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial?: ProjectFormValues;
  maxCompetitors: number;
}) {
  const router = useRouter();
  const [v, setV] = useState<ProjectFormValues>(initial ?? EMPTY);
  const [aliasInput, setAliasInput] = useState((initial?.brandAliases ?? []).join(", "));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProjectFormValues>(k: K, val: ProjectFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0 || mode === "edit") {
      if (!v.domain.trim()) e.domain = "Bitte gib deine Domain ein.";
      if (!v.brandName.trim()) e.brandName = "Bitte gib den Markennamen ein.";
    }
    if (s === 1 || mode === "edit") {
      if (v.industry.trim().length < 2) e.industry = "Bitte gib die Branche ein.";
      if (v.city.trim().length < 2) e.city = "Bitte gib den Ort ein.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validateStep(-1) && mode === "edit") return;
    setSaving(true);
    setError(null);
    const body = {
      ...v,
      name: v.name.trim() || v.brandName.trim(),
      brandAliases: aliasInput
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      competitors: v.competitors.filter((c) => c.name.trim()),
      region: v.region || null,
    };
    const res = await apiFetch<{ project: { id: string } }>(mode === "create" ? "/api/projects" : `/api/projects/${projectId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      body,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      setErrors(res.fields ?? {});
      return;
    }
    if (mode === "create") {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `active_project=${res.data.project.id}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
      toast.success("Projekt angelegt – passende Prompts wurden vorgeschlagen.");
      router.push("/dashboard/prompts");
    } else {
      toast.success("Projekt gespeichert.");
      router.refresh();
    }
  }

  const show = (s: number) => mode === "edit" || step === s;

  return (
    <Card>
      {mode === "create" && (
        <CardHeader>
          <ol className="flex flex-wrap gap-2 text-xs" aria-label="Fortschritt">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={i === step ? "step" : undefined}
                className={`rounded-full px-3 py-1 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
          <CardTitle as="h2" className="pt-3">
            {STEPS[step]}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={mode === "edit" ? "space-y-5 pt-6" : "space-y-5"}>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {show(0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="domain" label="Domain deiner Website" hint="z. B. beispiel.de" required error={errors.domain}>
              <Input value={v.domain} onChange={(e) => set("domain", e.target.value)} placeholder="beispiel.de" autoComplete="url" />
            </Field>
            <Field id="brandName" label="Markenname" hint="So, wie Kund:innen dich nennen" required error={errors.brandName}>
              <Input value={v.brandName} onChange={(e) => set("brandName", e.target.value)} />
            </Field>
            <Field id="aliases" label="Weitere Schreibweisen (optional)" hint="Kommagetrennt, z. B. Kurzname oder alter Name" error={errors.brandAliases}>
              <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} />
            </Field>
            <Field id="name" label="Projektname (optional)" hint="Standard: Markenname" error={errors.name}>
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
          </div>
        )}
        {show(1) && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="industry" label="Branche" hint="z. B. Zahnarzt, Steuerberatung, Dachdecker" required error={errors.industry}>
              <Input value={v.industry} onChange={(e) => set("industry", e.target.value)} />
            </Field>
            <Field id="city" label="Ort" required error={errors.city}>
              <Input value={v.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
            </Field>
            <Field id="region" label="Region (optional)" hint="z. B. Rhein-Sieg-Kreis" error={errors.region}>
              <Input value={v.region} onChange={(e) => set("region", e.target.value)} />
            </Field>
          </div>
        )}
        {show(2) && (
          <div className="space-y-4">
            <Field id="language" label="Sprache der Prompts">
              <NativeSelect value={v.language} onChange={(e) => set("language", e.target.value as "de" | "en")}>
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
              </NativeSelect>
            </Field>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Wettbewerber (max. {maxCompetitors})</legend>
              {maxCompetitors === 0 && (
                <p className="text-sm text-muted-foreground">Der Wettbewerbsvergleich ist ab dem Business-Plan enthalten.</p>
              )}
              {v.competitors.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    aria-label={`Wettbewerber ${i + 1}: Name`}
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) => set("competitors", v.competitors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <Input
                    aria-label={`Wettbewerber ${i + 1}: Domain`}
                    placeholder="Domain (optional)"
                    value={c.domain}
                    onChange={(e) => set("competitors", v.competitors.map((x, j) => (j === i ? { ...x, domain: e.target.value } : x)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Wettbewerber ${i + 1} entfernen`}
                    onClick={() => set("competitors", v.competitors.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {errors.competitors && <p className="text-xs font-medium text-destructive">{errors.competitors}</p>}
              {v.competitors.length < maxCompetitors && (
                <Button type="button" variant="outline" size="sm" onClick={() => set("competitors", [...v.competitors, { name: "", domain: "" }])}>
                  <Plus /> Wettbewerber hinzufügen
                </Button>
              )}
            </fieldset>
          </div>
        )}
        {mode === "create" && step === 3 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Domain</dt><dd className="font-medium">{v.domain}</dd></div>
            <div><dt className="text-muted-foreground">Marke</dt><dd className="font-medium">{v.brandName}{aliasInput && ` (${aliasInput})`}</dd></div>
            <div><dt className="text-muted-foreground">Branche / Ort</dt><dd className="font-medium">{v.industry} in {v.city}{v.region && `, ${v.region}`}</dd></div>
            <div><dt className="text-muted-foreground">Wettbewerber</dt><dd className="font-medium">{v.competitors.filter((c) => c.name).map((c) => c.name).join(", ") || "–"}</dd></div>
            <CardDescription className="sm:col-span-2">
              Nach dem Anlegen schlagen wir dir 15–30 markenneutrale Prompts vor, die du bearbeiten kannst.
            </CardDescription>
          </dl>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-2">
        {mode === "create" ? (
          <>
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              {t.common.back}
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={() => validateStep(step) && setStep((s) => s + 1)}>
                {t.common.next}
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={submit} data-testid="create-project">
                {saving ? t.common.saving : "Projekt anlegen"}
              </Button>
            )}
          </>
        ) : (
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? t.common.saving : t.common.save}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
