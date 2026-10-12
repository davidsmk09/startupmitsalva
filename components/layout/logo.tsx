import Link from "next/link";
import { Radar } from "lucide-react";
import { site } from "@/lib/site";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight" aria-label={`${site.name} – Startseite`}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Radar className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-lg">{site.name}</span>
    </Link>
  );
}
