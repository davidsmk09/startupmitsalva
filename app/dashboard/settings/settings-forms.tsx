"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

type U = { email: string; name: string; notifyWeekly: boolean; notifyAlerts: boolean; hasPassword: boolean };

export function SettingsForms({ user }: { user: U }) {
  const [name, setName] = useState(user.name);
  const [weekly, setWeekly] = useState(user.notifyWeekly);
  const [alerts, setAlerts] = useState(user.notifyAlerts);
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [del, setDel] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function saveProfile(body: Record<string, unknown>) {
    const res = await apiFetch("/api/account/profile", { method: "PATCH", body });
    if (res.ok) toast.success("Gespeichert.");
    else toast.error(res.error);
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Profil</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile({ name });
            }}
          >
            <Field id="name" label={t.auth.name} className="flex-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Button type="submit">{t.common.save}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setPwErr(null);
              if (pw.next.length < 10) return setPwErr(t.auth.passwordTooShort);
              if (pw.next !== pw.repeat) return setPwErr(t.auth.passwordsDontMatch);
              const res = await apiFetch("/api/account/password", { body: { currentPassword: pw.current, newPassword: pw.next } });
              if (!res.ok) return setPwErr(res.error);
              setPw({ current: "", next: "", repeat: "" });
              toast.success("Passwort geändert.");
            }}
          >
            {user.hasPassword && (
              <Field id="current" label="Aktuelles Passwort">
                <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
              </Field>
            )}
            <Field id="next" label="Neues Passwort" hint={t.auth.passwordHint}>
              <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            </Field>
            <Field id="repeat" label={t.auth.passwordRepeat}>
              <Input type="password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} autoComplete="new-password" />
            </Field>
            {pwErr && <p className="text-sm text-destructive sm:col-span-3">{pwErr}</p>}
            <div className="sm:col-span-3">
              <Button type="submit">Passwort speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="weekly" className="font-normal">
              Wöchentliche Zusammenfassung nach automatischen Scans
            </Label>
            <Switch
              id="weekly"
              checked={weekly}
              onCheckedChange={(v) => {
                setWeekly(v);
                saveProfile({ notifyWeekly: v });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="alerts" className="font-normal">
              E-Mail-Alert bei deutlicher Score-Veränderung (ab Business)
            </Label>
            <Switch
              id="alerts"
              checked={alerts}
              onCheckedChange={(v) => {
                setAlerts(v);
                saveProfile({ notifyAlerts: v });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Datenschutz</CardTitle>
          <CardDescription>Exportiere alle deine Daten oder lösche dein Konto vollständig.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href="/api/account/export">
              <Download /> Daten exportieren (JSON)
            </a>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 /> Konto löschen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Konto endgültig löschen?</DialogTitle>
                <DialogDescription>
                  Dein Konto, deine Organisation (falls du einziges Mitglied bist) mit allen Projekten, Scans und Reports werden gelöscht. Ein aktives Abo
                  wird gekündigt. Das kann nicht rückgängig gemacht werden.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Field id="del-email" label="Zur Bestätigung deine E-Mail-Adresse">
                  <Input value={del.email} onChange={(e) => setDel({ ...del, email: e.target.value })} />
                </Field>
                {user.hasPassword && (
                  <Field id="del-pw" label={t.auth.password}>
                    <Input type="password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} />
                  </Field>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t.common.cancel}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={busy || del.email.trim().toLowerCase() !== user.email}
                  onClick={async () => {
                    setBusy(true);
                    const res = await apiFetch("/api/account", { method: "DELETE", body: { confirmEmail: del.email, password: del.password } });
                    setBusy(false);
                    if (!res.ok) return toast.error(res.error);
                    toast.success("Konto gelöscht.");
                    await signOut({ callbackUrl: "/" });
                  }}
                >
                  Endgültig löschen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
