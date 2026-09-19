import { FolderKanban } from "lucide-react";

import { ProjectCard } from "./project-card";

type Project = {
  id: string;
  name: string;
  description: string | null;
  mastery: number;
  materialCount: number;
  quizCount: number;
  accuracy: number;
};

type ProjectsGridProps = {
  projects: Project[];
};

export function ProjectsGrid({
  projects,
}: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
          <FolderKanban className="h-6 w-6 text-gray-400" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-gray-950">
          No projects yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Create your first project to start adding materials,
          asking questions, taking quizzes, and tracking mastery.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          id={project.id}
          name={project.name}
          description={project.description}
          mastery={project.mastery}
          materialCount={project.materialCount}
          quizCount={project.quizCount}
          accuracy={project.accuracy}
        />
      ))}
    </div>
  );
}