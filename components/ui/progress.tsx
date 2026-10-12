"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value,
  label,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { label?: string }) {
  return (
    <ProgressPrimitive.Root
      aria-label={label}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-secondary", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
