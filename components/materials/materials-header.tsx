import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type MaterialsHeaderProps = {
  projectId: string;
  projectName: string;
  materialCount: number;
};

export function MaterialsHeader({
  projectId,
  projectName,
  materialCount,
}: MaterialsHeaderProps) {
  return (
    <div className="space-y-3">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Materials
        </h1>

        <p className="mt-2 text-muted-foreground">
          Your project knowledge base
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {materialCount}{" "}
          {materialCount === 1 ? "material" : "materials"} in{" "}
          <span className="font-medium text-foreground">
            {projectName}
          </span>
        </p>
      </div>
    </div>
  );
}