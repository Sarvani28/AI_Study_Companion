import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";

type RecommendedNextProps = {
  projectId: string;
  title: string | null;
  description: string | null;
  action: string | null;
};

export function RecommendedNext({
  projectId,
  title,
  description,
  action,
}: RecommendedNextProps) {
  if (!title) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Lightbulb className="h-4 w-4" />
          </div>

          <h2 className="text-base font-semibold text-gray-950">
            Recommended next step
          </h2>
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-500">
          Recommendations will appear after you complete
          assessments and build learning activity.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Lightbulb className="h-4 w-4" />
        </div>

        <h2 className="text-base font-semibold text-gray-950">
          Recommended next step
        </h2>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-gray-950">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      )}

      {action && (
        <Link
          href={
            action.startsWith("/")
              ? action
              : `/projects/${projectId}/mastery`
          }
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gray-900 transition hover:text-indigo-600"
        >
          Review concept
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}