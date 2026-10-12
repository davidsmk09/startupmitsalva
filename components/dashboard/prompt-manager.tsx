"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Sparkles, Star, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client-api";
import { PROMPT_CATEGORIES } from "@/lib/constants";

export type PromptRow = { id: string; stableId: string; text: string; category: string; active: boolean; isTop: boolean; source: string };

const CATEGORY_LABEL: Record<string, string> = {
  KATEGORIE: "Kategorie",
  EMPFEHLUNG: "Empfehlung",
  VERGLEICH: "Vergleich",
  LOKAL: "Lokal",
  MARKE: "Marke",
};

export function PromptManager({
  projectId,
  prompts,
  limit,
  topAllowed,
  maxTop,
}: {
  projectId: string;
  prompts: PromptRow[];
  limit: number;
  topAllowed: boolean;
  maxTop: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newText, setNewText] = useState("");
  const [newCat, setNewCat] = useState<string>("EMPFEHLUNG");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const activeCount = prompts.filter((p) => p.active).length;
  const topCount = prompts.filter((p) => p.isTop).length;

  const grouped = useMemo(() => {
    const list = prompts.filter((p) => (filter === "all" ? true : filter === "active" ? p.active : !p.active));
    return PROMPT_CATEGORIES.map((c) => ({ category: c, items: list.filter((p) => p.category === c) })).filter((g) => g.items.length);
  }, [prompts, filter]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await apiFetch(`/api/prompts/${id}`, { method: "PATCH", body });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant={activeCount > limit ? "destructive" : "info"}>
            {activeCount} / {limit} aktiv
          </Badge>
          {topAllowed && (
            <Badge variant="outline">
              {topCount} / {maxTop} Top-Prompts (täglich)
            </Badge>
          )}
          <label htmlFor="prompt-filter" className="sr-only">
            Filter
          </label>
          <NativeSelect id="prompt-filter" className="h-9 w-auto" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">Alle</option>
            <option value="active">Nur aktive</option>
            <option value="inactive">Nur inaktive</option>
          </NativeSelect>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await apiFetch<{ added: number }>(`/api/projects/${projectId}/prompts/suggest`, { method: "POST", body: {} });
            setBusy(false);
            if (!res.ok) return toast.error(res.error);
            toast.success(res.data.added ? `${res.data.added} neue Vorschläge (inaktiv) ergänzt.` : "Keine neuen Vorschläge gefunden.");
            router.refresh();
          }}
        >
          <Sparkles /> Prompts neu vorschlagen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-base">
            Eigenen Prompt ergänzen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (newText.trim().length < 5) return toast.error("Bitte mindestens 5 Zeichen eingeben.");
              setBusy(true);
              const res = await apiFetch(`/api/projects/${projectId}/prompts`, { body: { text: newText, category: newCat } });
              setBusy(false);
              if (!res.ok) return toast.error(res.error);
              setNewText("");
              toast.success("Prompt ergänzt.");
              router.refresh();
            }}
          >
            <label htmlFor="new-prompt" className="sr-only">
              Neuer Prompt
            </label>
            <Input id="new-prompt" value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="z. B. Welcher Anbieter in … ist empfehlenswert?" />
            <label htmlFor="new-cat" className="sr-only">
              Kategorie
            </label>
            <NativeSelect id="new-cat" className="sm:w-44" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              {PROMPT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" disabled={busy}>
              <Plus /> Hinzufügen
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Außer in der Kategorie „Marke“ darf der Markenname nicht im Prompt stehen – sonst misst der Scan nicht, ob KI-Systeme dich von sich aus nennen.
          </p>
        </CardContent>
      </Card>

      {grouped.map((g) => (
        <section key={g.category} aria-labelledby={`cat-${g.category}`}>
          <h2 id={`cat-${g.category}`} className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[g.category]} ({g.items.length})
          </h2>
          <ul className="divide-y rounded-lg border">
            {g.items.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <code className="w-16 shrink-0 text-xs text-muted-foreground" title="Stabile ID">
                  {p.stableId}
                </code>
                <div className="min-w-0 flex-1">
                  {editing === p.id ? (
                    <div className="flex gap-2">
                      <label htmlFor={`edit-${p.id}`} className="sr-only">
                        Prompt bearbeiten
                      </label>
                      <Input id={`edit-${p.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                      <Button
                        size="icon"
                        aria-label="Speichern"
                        onClick={async () => {
                          if (await patch(p.id, { text: draft })) setEditing(null);
                        }}
                      >
                        <Check />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Abbrechen" onClick={() => setEditing(null)}>
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <p className={p.active ? "" : "text-muted-foreground line-through decoration-muted-foreground/40"}>{p.text}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.source === "USER" && <Badge variant="outline">eigener</Badge>}
                  {topAllowed && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-pressed={p.isTop}
                      aria-label={p.isTop ? "Top-Prompt entfernen" : "Als Top-Prompt markieren (tägliche Scans)"}
                      onClick={() => patch(p.id, { isTop: !p.isTop })}
                    >
                      <Star className={p.isTop ? "fill-warning text-warning" : ""} />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Prompt bearbeiten"
                    onClick={() => {
                      setEditing(p.id);
                      setDraft(p.text);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Switch checked={p.active} aria-label={p.active ? "Prompt deaktivieren" : "Prompt aktivieren"} onCheckedChange={(v) => patch(p.id, { active: v })} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
