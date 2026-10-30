"use client";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/actions/projects";

export function DeleteProjectButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending}
      onClick={() => { if (confirm("წაიშალოს პროექტი? მოქმედება შეუქცევადია.")) start(() => deleteProject(id)); }}>
      <Trash2 /> წაშლა
    </Button>
  );
}
