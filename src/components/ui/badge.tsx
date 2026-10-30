import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-transparent bg-primary/12 text-primary",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      outline: "text-foreground",
      success: "border-transparent bg-success/15 text-success",
      warning: "border-transparent bg-warning/15 text-warning",
      destructive: "border-transparent bg-destructive/12 text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
