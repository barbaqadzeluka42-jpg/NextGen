"use client";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FormAlert({ state, className }: { state: ActionState; className?: string }) {
  if (!state?.message) return null;
  const ok = state.ok;
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        ok ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{state.message}</span>
    </div>
  );
}

export function Field({
  label, name, errors, hint, children, className,
}: {
  label: string; name: string; errors?: string[]; hint?: string; children: React.ReactNode; className?: string;
}) {
  const err = errors?.[0];
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !err && <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {err && <p id={`${name}-error`} role="alert" className="text-xs font-medium text-destructive">{err}</p>}
    </div>
  );
}

/** Checkbox + wrapped label text, large tap target */
export function CheckRow({ children, htmlFor, error }: { children: React.ReactNode; htmlFor: string; error?: string }) {
  return (
    <div>
      <div className="flex items-start gap-3 text-sm leading-relaxed">{children}</div>
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
