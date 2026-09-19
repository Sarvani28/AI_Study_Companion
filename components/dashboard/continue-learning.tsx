import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
} from "lucide-react";

export function ContinueLearning({
  project,
  mastery,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  mastery: number;
}) {
  if (!project) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-400">
            Continue learning
          </h2>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
          <BookOpen className="mx-auto h-6 w-6 text-gray-400" />

          <h3 className="mt-4 text-base font-semibold text-gray-900">
            No active project yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            Create a learning project and add your first study material to
            start building your knowledge.
          </p>

          <Link
            href="/spaces"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Explore spaces
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-400">
          Pick up where you left off
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-gray-950">
                    {project.name}
                  </h3>

                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600">
                    In progress
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {project.description ||
                    "Continue working through your learning material."}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>Active learning project</span>
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-medium text-gray-400">
                Mastery
              </p>

              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {mastery}%
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-500">
                Overall progress
              </span>

              <span className="font-semibold text-indigo-600">
                {mastery}%
              </span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={mastery}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${mastery}%` }}
              />
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            <Link
              href={`/projects/${project.id}`}
              className="group inline-flex h-10 items-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
            >
              Continue
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}