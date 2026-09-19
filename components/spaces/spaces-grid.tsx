"use client";

import { SpaceCard } from "./space-card";

type Space = {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
  averageMastery: number;
};

type SpacesGridProps = {
  spaces: Space[];
};

export function SpacesGrid({ spaces }: SpacesGridProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <h2 className="text-lg font-semibold">
          No spaces yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Create your first learning space to organize projects,
          materials, quizzes, and progress.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {spaces.map((space) => (
        <SpaceCard
          key={space.id}
          id={space.id}
          name={space.name}
          description={space.description}
          projectCount={space.projectCount}
          averageMastery={space.averageMastery}
        />
      ))}
    </div>
  );
}