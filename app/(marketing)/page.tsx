import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="container py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        Wird dein Unternehmen von ChatGPT &amp; Co. gefunden?
      </h1>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/gratis-check">Gratis-Check starten</Link>
        </Button>
      </div>
    </section>
  );
}
