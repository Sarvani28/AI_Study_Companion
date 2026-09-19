import Link from "next/link";
import {
  ArrowRight,
  Lightbulb,
  Sparkles,
} from "lucide-react";

export function RecommendedNext({
  recommendation,
}: {
  recommendation: {
    title: string;
    description: string;
    action: string | null;
  } | null;
}) {
  if (!recommendation) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-400">
            Recommended next
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <Lightbulb className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Your next recommendation will appear here
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Complete some learning activity and StudyAI will use your
                progress to suggest what to focus on next.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-400">
          Recommended next
        </h2>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
              <Lightbulb className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />

                <span className="text-xs font-semibold text-indigo-600">
                  Personalized recommendation
                </span>
              </div>

              <h3 className="mt-2 text-lg font-semibold tracking-tight text-gray-950">
                {recommendation.title}
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                {recommendation.description}
              </p>
            </div>
          </div>

          {recommendation.action && (
            <Link
              href={recommendation.action}
              className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Review now
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}