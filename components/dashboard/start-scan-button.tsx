"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export function StartScanButton({ projectId, disabled, ...props }: { projectId: string; disabled?: boolean } & ButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      data-testid="start-scan"
      onClick={async () => {
        setLoading(true);
        const res = await apiFetch<{ scan: { id: string } }>(`/api/projects/${projectId}/scans`, { method: "POST", body: {} });
        setLoading(false);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Scan gestartet.");
        router.push(`/dashboard/scans/${res.data.scan.id}`);
      }}
    >
      <Play aria-hidden="true" />
      {loading ? t.common.loading : t.dashboard.startScan}
    </Button>
  );
}
