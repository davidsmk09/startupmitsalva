import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "E-Mail-Outbox" };
export const dynamic = "force-dynamic";

/** Protokoll aller versendeten bzw. (ohne RESEND_API_KEY) nur protokollierten E-Mails. */
export default async function AdminOutbox() {
  const mails = await prisma.outboxEmail.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="E-Mail-Outbox" description="Ohne RESEND_API_KEY werden E-Mails nur hier und in der Konsole protokolliert (Status LOGGED)." />
      <div className="space-y-3">
        {mails.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-6">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <Badge variant={m.status === "SENT" ? "success" : m.status === "FAILED" ? "destructive" : "secondary"}>{m.status}</Badge>
                  <span className="font-medium">{m.subject}</span>
                  <span className="text-muted-foreground">an {m.to}</span>
                  <span className="text-muted-foreground">· {formatDate(m.createdAt, true)}</span>
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{m.text}</pre>
                {m.error && <p className="mt-2 text-xs text-destructive">{m.error}</p>}
              </details>
            </CardContent>
          </Card>
        ))}
        {mails.length === 0 && <p className="text-sm text-muted-foreground">Noch keine E-Mails.</p>}
      </div>
    </>
  );
}
