import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full min-h-11 rounded-lg border border-input bg-card px-3 py-2 text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive sm:min-h-10";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(field, className)} {...props} />;
}
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-28 resize-y leading-relaxed", className)} {...props} />;
}
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(field, "appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}
export function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return <input type="checkbox" className={cn("mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-input accent-[var(--primary)]", className)} {...props} />;
}
