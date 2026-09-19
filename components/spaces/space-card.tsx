import Link from "next/link";
import { ArrowRight, FolderKanban, Sparkles } from "lucide-react";

type SpaceCardProps = {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
  averageMastery: number;
};

export function SpaceCard({
  id,
  name,
  description,
  projectCount,
  averageMastery,
}: SpaceCardProps) {
  return (
    <Link
      href={`/spaces/${id}`}
      className="group block rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/50">
          <Sparkles className="h-5 w-5" />
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      <div className="mt-5">
        <h2 className="text-lg font-semibold">{name}</h2>

        {description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No description added.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5" />
            Projects
          </div>

          <p className="mt-1 text-lg font-semibold">
            {projectCount}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Average mastery
          </p>

          <p className="mt-1 text-lg font-semibold">
            {averageMastery}%
          </p>
        </div>
      </div>

      <div className="mt-5 text-sm font-medium">
        Open workspace →
      </div>
    </Link>
  );
}