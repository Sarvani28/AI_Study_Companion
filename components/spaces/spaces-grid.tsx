import { SpaceCard } from "@/components/spaces/space-card";

type Space = {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
  averageMastery: number;
};

type SpacesGridProps = {
  spaces: Space[];
  onDelete: (id: string) => Promise<void>;
};

export function SpacesGrid({
  spaces,
  onDelete,
}: SpacesGridProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <h2 className="text-lg font-semibold text-gray-950">
          No spaces yet
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Create your first learning space to get started.
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
            onDeleted={(deletedId) => {
              // The parent will refresh the page/list.
              window.location.reload();
            }}
          />
      ))}
    </div>
  );
}