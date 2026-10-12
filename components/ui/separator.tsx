import { cn } from "@/lib/utils";

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("my-4 border-border", className)} />;
}
