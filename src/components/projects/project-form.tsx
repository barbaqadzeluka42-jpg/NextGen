"use client";
import { useActionState } from "react";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { CheckRow, Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { saveProject } from "@/actions/projects";
import { projectCategoryLabels, projectDevLabels } from "@/lib/constants";
import type { ActionState, ProjectRow } from "@/lib/types";

export function ProjectForm({ project, imageUrl }: { project?: ProjectRow; imageUrl?: string | null }) {
  const [state, action] = useActionState(saveProject, {} as ActionState);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {project && <input type="hidden" name="id" value={project.id} />}
      <FormAlert state={state} />
      <Field label="პროექტის სახელი" name="title" errors={e.title}>
        <Input id="title" name="title" required maxLength={120} defaultValue={project?.title} aria-invalid={!!e.title} aria-describedby="title-error" />
      </Field>
      <Field label="აღწერა" name="description" errors={e.description} hint="რა არის პროექტი, რას აკეთებს და რა ტექნოლოგიებით/მეთოდებით შეიქმნა.">
        <Textarea id="description" name="description" required maxLength={3000} rows={6} defaultValue={project?.description} aria-invalid={!!e.description} aria-describedby="description-error description-hint" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="მიმართულება" name="category" errors={e.category}>
          <Select id="category" name="category" defaultValue={project?.category ?? "programming"}>
            {Object.entries(projectCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="განვითარების სტატუსი" name="dev_status" errors={e.dev_status}>
          <Select id="dev_status" name="dev_status" defaultValue={project?.dev_status ?? "idea"}>
            {Object.entries(projectDevLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="ავტორები" name="authors" errors={e.authors} hint="თითო ავტორი ახალ ხაზზე ან მძიმით გამოყოფილი. მიუთითე მხოლოდ სახელი (გვარი სურვილისამებრ). მაქს. 6.">
        <Textarea id="authors" name="authors" required rows={3} className="min-h-20" defaultValue={project?.author_names.join("\n")} aria-invalid={!!e.authors} aria-describedby="authors-error authors-hint" />
      </Field>
      <Field label="სურათი (არასავალდებულო)" name="image" errors={e.image} hint="JPG, PNG ან WebP, მაქსიმუმ 2 მბ. არ ატვირთო სურათი, რომელზეც ჩანს პირადი ინფორმაცია ან სხვისი სახე ნებართვის გარეშე.">
        {imageUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
            <img src={imageUrl} alt="მიმდინარე სურათი" className="h-16 w-24 rounded-lg object-cover" />
            <label className="flex items-center gap-2 text-sm"><Checkbox name="remove_image" /> სურათის წაშლა</label>
          </div>
        )}
        <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium" aria-describedby="image-error image-hint" />
      </Field>
      <CheckRow htmlFor="authors_consent" error={e.authors_consent?.[0]}>
        <Checkbox id="authors_consent" name="authors_consent" defaultChecked={project?.authors_consent} aria-describedby="authors_consent-error" />
        <label htmlFor="authors_consent">ვადასტურებ, რომ ყველა ზემოთ მითითებული ავტორი თანახმაა, მისი სახელი და პროექტი საჯაროდ გამოქვეყნდეს ადმინისტრატორის დამტკიცების შემდეგ. თანხმობის გაუქმება შეგიძლია პროექტის წაშლით.</label>
      </CheckRow>
      <p className="rounded-lg bg-secondary/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        პროექტი საჯაროდ გამოჩნდება მხოლოდ ადმინისტრატორის დამტკიცების შემდეგ. დამტკიცებული პროექტის ყოველი რედაქტირება ხელახალ განხილვაზე გადადის.
      </p>
      <SubmitButton size="lg" variant="gradient" pendingText="ინახება...">{project ? "ცვლილებების შენახვა" : "განსახილველად გაგზავნა"}</SubmitButton>
    </form>
  );
}
