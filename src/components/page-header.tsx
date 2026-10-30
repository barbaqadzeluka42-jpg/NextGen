import { cn } from "@/lib/utils";

export function PageHeader({ title, description, children, className }: { title: string; description?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, children }: { icon?: React.ReactNode; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/40 px-6 py-12 text-center">
      {icon && <div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-6">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
