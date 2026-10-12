"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/client-api";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Trash2 /> Projekt löschen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Projekt wirklich löschen?</DialogTitle>
          <DialogDescription>Alle Prompts, Scans und Reports dieses Projekts werden unwiderruflich gelöscht.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
              setBusy(false);
              if (!res.ok) return toast.error(res.error);
              toast.success("Projekt gelöscht.");
              document.cookie = "active_project=; Path=/; Max-Age=0";
              router.push("/dashboard/projects");
              router.refresh();
            }}
          >
            Endgültig löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
