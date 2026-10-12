"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export function VerifyBanner() {
  const [sending, setSending] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-warning/10 px-4 py-2 text-sm">
      <MailWarning className="h-4 w-4 text-warning-foreground" aria-hidden="true" />
      <span>{t.auth.verifyPending}</span>
      <Button
        size="sm"
        variant="outline"
        disabled={sending}
        onClick={async () => {
          setSending(true);
          const res = await apiFetch("/api/auth/resend-verification", { method: "POST", body: {} });
          setSending(false);
          if (res.ok) toast.success(t.auth.verificationSent);
          else toast.error(res.error);
        }}
      >
        {t.auth.resendVerification}
      </Button>
    </div>
  );
}
