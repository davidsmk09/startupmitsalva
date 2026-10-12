import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7", {
  variants: {
    variant: {
      default: "bg-background text-foreground",
      info: "border-primary/30 bg-primary/5 text-foreground [&>svg]:text-primary",
      warning: "border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning-foreground",
      destructive: "border-destructive/40 bg-destructive/5 text-foreground [&>svg]:text-destructive",
      success: "border-success/40 bg-success/10 text-foreground [&>svg]:text-success",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold leading-none", className)} {...props} />;
}
export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}
