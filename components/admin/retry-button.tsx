"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";

export function RetryScanButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await apiFetch(`/api/admin/scans/${scanId}/retry`, { method: "POST", body: {} });
        setBusy(false);
        if (!res.ok) return toast.error(res.error);
        toast.success("Scan neu eingereiht.");
        router.refresh();
      }}
    >
      <RotateCcw /> Erneut ausführen
    </Button>
  );
}
