"use client";

import { Plus } from "lucide-react";

type ProjectsHeaderProps = {
  spaceName: string;
  onNewProject: () => void;
};

export function ProjectsHeader({
  spaceName,
  onNewProject,
}: ProjectsHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Learning Space
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          {spaceName}
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Organize your learning into focused projects.
        </p>
      </div>

      <button
        type="button"
        onClick={onNewProject}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background shadow-sm transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New Project
      </button>
    </div>
  );
}