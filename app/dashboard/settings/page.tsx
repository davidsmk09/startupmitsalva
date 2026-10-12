import { getDashboardContext } from "@/lib/dashboard/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForms } from "./settings-forms";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const { user } = await getDashboardContext();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  return (
    <>
      <PageHeader title="Einstellungen" description="Profil, Sicherheit, Benachrichtigungen und Datenschutz" />
      <SettingsForms
        user={{ email: user.email, name: user.name ?? "", notifyWeekly: user.notifyWeekly, notifyAlerts: user.notifyAlerts, hasPassword: Boolean(record.passwordHash) }}
      />
    </>
  );
}
