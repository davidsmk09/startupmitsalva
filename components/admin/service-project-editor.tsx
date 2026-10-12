"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field } from "@/components/forms/field";
import { SERVICE_PROJECT_STATUS, SERVICE_TASK_CATEGORIES, SERVICE_TASK_STATUS } from "@/lib/constants";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

type Task = {
  id: string;
  titel: string;
  beschreibung: string | null;
  kategorie: string;
  status: string;
  zugewiesenAn: string | null;
  dueDate: string | null;
  sichtbarFuerKunde: boolean;
};

export function ServiceProjectEditor({
  project,
  tasks,
}: {
  project: { id: string; title: string; status: string; notizen: string | null; paket: number; orgEmail: string };
  tasks: Task[];
}) {
  const router = useRouter();
  const [meta, setMeta] = useState({ title: project.title, status: project.status, notizen: project.notizen ?? "", orgEmail: project.orgEmail });
  const [newTask, setNewTask] = useState({ titel: "", kategorie: "WEBSITE", dueDate: "", zugewiesenAn: "" });

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    const res = await apiFetch(`/api/admin/service-tasks/${id}`, { method: "PATCH", body });
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Projekt</CardTitle>
          <CardDescription>Paket {project.paket}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await apiFetch(`/api/admin/service-projects/${project.id}`, { method: "PATCH", body: meta });
              if (!res.ok) return toast.error(res.error);
              toast.success("Gespeichert.");
              router.refresh();
            }}
          >
            <Field id="sp-title" label="Titel">
              <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            </Field>
            <Field id="sp-status" label="Status">
              <NativeSelect value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value })}>
                {SERVICE_PROJECT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {t.service.projectStatus[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="sp-org" label="Kundenkonto (E-Mail)" hint="Verknüpft das Projekt mit der Organisation dieses Kunden (Kundenansicht).">
              <Input value={meta.orgEmail} onChange={(e) => setMeta({ ...meta, orgEmail: e.target.value })} placeholder="kunde@example.com" />
            </Field>
            <Field id="sp-notes" label="Interne Notizen" className="md:col-span-2">
              <Textarea rows={4} value={meta.notizen} onChange={(e) => setMeta({ ...meta, notizen: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit">Speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle as="h2">Tasks ({tasks.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await apiFetch<{ added: number }>(`/api/admin/service-projects/${project.id}/template`, { method: "POST", body: {} });
              if (!res.ok) return toast.error(res.error);
              toast.success(`${res.data.added} Standard-Tasks ergänzt.`);
              router.refresh();
            }}
          >
            <Wand2 /> Standard-Tasks ergänzen
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            onSubmit={async (e) => {
              e.preventDefault();
              if (newTask.titel.trim().length < 2) return toast.error("Bitte einen Titel eingeben.");
              const res = await apiFetch(`/api/admin/service-projects/${project.id}/tasks`, { body: { ...newTask, sichtbarFuerKunde: true } });
              if (!res.ok) return toast.error(res.error);
              setNewTask({ titel: "", kategorie: "WEBSITE", dueDate: "", zugewiesenAn: "" });
              router.refresh();
            }}
          >
            <Input aria-label="Neuer Task: Titel" placeholder="Neuer Task …" value={newTask.titel} onChange={(e) => setNewTask({ ...newTask, titel: e.target.value })} />
            <NativeSelect aria-label="Kategorie" value={newTask.kategorie} onChange={(e) => setNewTask({ ...newTask, kategorie: e.target.value })}>
              {SERVICE_TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.service.category[c]}
                </option>
              ))}
            </NativeSelect>
            <Input aria-label="Zugewiesen an" placeholder="Zuständig" value={newTask.zugewiesenAn} onChange={(e) => setNewTask({ ...newTask, zugewiesenAn: e.target.value })} />
            <Input aria-label="Fällig am" type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
            <Button type="submit">
              <Plus /> Anlegen
            </Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zuständig</TableHead>
                <TableHead>Fällig</TableHead>
                <TableHead>Kunde sieht</TableHead>
                <TableHead>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="max-w-sm">
                    <p className="font-medium">{task.titel}</p>
                    {task.beschreibung && <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{task.beschreibung}</p>}
                  </TableCell>
                  <TableCell>
                    <NativeSelect aria-label="Kategorie" className="h-8 text-xs" defaultValue={task.kategorie} onChange={(e) => patchTask(task.id, { kategorie: e.target.value })}>
                      {SERVICE_TASK_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {t.service.category[c]}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect aria-label="Status" className="h-8 text-xs" defaultValue={task.status} onChange={(e) => patchTask(task.id, { status: e.target.value })}>
                      {SERVICE_TASK_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {t.service.taskStatus[s]}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Zuständig"
                      className="h-8 text-xs"
                      defaultValue={task.zugewiesenAn ?? ""}
                      onBlur={(e) => e.target.value !== (task.zugewiesenAn ?? "") && patchTask(task.id, { zugewiesenAn: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Fällig am"
                      type="date"
                      className="h-8 text-xs"
                      defaultValue={task.dueDate ?? ""}
                      onChange={(e) => patchTask(task.id, { dueDate: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-pressed={task.sichtbarFuerKunde}
                      aria-label={task.sichtbarFuerKunde ? "Für Kunden ausblenden" : "Für Kunden sichtbar machen"}
                      onClick={() => patchTask(task.id, { sichtbarFuerKunde: !task.sichtbarFuerKunde })}
                    >
                      {task.sichtbarFuerKunde ? <Eye /> : <EyeOff className="text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Task löschen"
                      onClick={async () => {
                        const res = await apiFetch(`/api/admin/service-tasks/${task.id}`, { method: "DELETE" });
                        if (!res.ok) return toast.error(res.error);
                        router.refresh();
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function NewServiceProjectForm() {
  const router = useRouter();
  const [v, setV] = useState({ title: "", paket: 2, orgEmail: "" });
  return (
    <form
      className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await apiFetch<{ serviceProject: { id: string } }>("/api/admin/service-projects", { body: v });
        if (!res.ok) return toast.error(res.error);
        router.push(`/admin/service-projects/${res.data.serviceProject.id}`);
      }}
    >
      <Field id="nsp-title" label="Titel">
        <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </Field>
      <Field id="nsp-paket" label="Paket">
        <NativeSelect value={v.paket} onChange={(e) => setV({ ...v, paket: Number(e.target.value) })}>
          <option value={2}>Paket 2</option>
          <option value={3}>Paket 3</option>
        </NativeSelect>
      </Field>
      <Field id="nsp-email" label="Kundenkonto (E-Mail, optional)">
        <Input value={v.orgEmail} onChange={(e) => setV({ ...v, orgEmail: e.target.value })} />
      </Field>
      <Button type="submit">Anlegen</Button>
    </form>
  );
}
