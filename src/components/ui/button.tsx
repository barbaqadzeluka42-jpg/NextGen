import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-lg text-center text-sm font-semibold transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:brightness-110",
        gradient: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/30 hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "border border-input bg-card/60 hover:bg-secondary",
        ghost: "hover:bg-secondary",
        destructive: "bg-destructive text-white hover:brightness-110",
        link: "h-auto min-h-0 p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2 sm:min-h-10",
        sm: "min-h-10 px-3 text-sm sm:min-h-9",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11 sm:size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
