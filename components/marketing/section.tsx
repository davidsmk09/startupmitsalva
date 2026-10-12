import { cn } from "@/lib/utils";

export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <div className="container">{children}</div>
    </section>
  );
}

export function SectionTitle({ title, subtitle, center = true }: { title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={cn("mb-10 max-w-3xl", center && "mx-auto text-center")}>
      <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
