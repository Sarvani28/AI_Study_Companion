import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ProjectOverviewHeaderProps = {
  projectId: string;
  spaceId: string;
  spaceName: string;
  projectName: string;
  description: string | null;
};

export function ProjectOverviewHeader({
  projectId,
  spaceId,
  spaceName,
  projectName,
  description,
}: ProjectOverviewHeaderProps) {
  return (
    <div className="space-y-5">
      <Link
        href={`/spaces/${spaceId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {spaceName}
      </Link>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-400">
          Project overview
        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
          {projectName}
        </h1>

        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}