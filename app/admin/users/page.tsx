import { prisma } from "@/lib/db";
import { effectivePlanKey, getPlan } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Nutzer" };
export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { memberships: { include: { org: { include: { subscription: true, _count: { select: { projects: true } } } } } } },
  });
  return (
    <>
      <PageHeader title="Nutzer" description={`${users.length} Treffer`} />
      <form className="mb-4 flex max-w-md gap-2" method="get" role="search">
        <label htmlFor="q" className="sr-only">
          Nutzer suchen
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="E-Mail oder Name …" />
        <Button type="submit">Suchen</Button>
      </form>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Mail</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Projekte</TableHead>
                <TableHead>Registriert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const org = u.memberships[0]?.org;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.email} {!u.emailVerifiedAt && <Badge variant="warning">unbestätigt</Badge>}
                    </TableCell>
                    <TableCell>{u.name ?? "–"}</TableCell>
                    <TableCell>{u.role === "ADMIN" ? <Badge variant="destructive">ADMIN</Badge> : "Kunde"}</TableCell>
                    <TableCell>{org?.name ?? "–"}</TableCell>
                    <TableCell>{getPlan(effectivePlanKey(org?.subscription)).name}</TableCell>
                    <TableCell className="tabular-nums">{org?._count.projects ?? 0}</TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
