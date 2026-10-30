import { Badge } from "@/components/ui/badge";
import { projectCategoryLabels, projectDevLabels } from "@/lib/constants";
import type { ProjectRow } from "@/lib/types";

export function ProjectCard({ project, imageUrl }: { project: ProjectRow; imageUrl?: string | null }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/15 via-accent/10 to-secondary">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, optimisation not applicable
          <img src={imageUrl} alt={`პროექტი: ${project.title}`} loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <div aria-hidden className="grid size-full place-items-center text-5xl font-black text-primary/25">{project.title.charAt(0)}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{projectCategoryLabels[project.category]}</Badge>
          <Badge variant="outline">{projectDevLabels[project.dev_status]}</Badge>
        </div>
        <h3 className="text-lg font-bold leading-snug">{project.title}</h3>
        <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        <p className="mt-auto pt-2 text-xs font-medium text-muted-foreground">ავტორები: {project.author_names.join(", ")}</p>
      </div>
    </article>
  );
}
