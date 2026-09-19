import { Brain } from "lucide-react";

type ConceptMastery = {
  id: string;
  name: string;
  mastery: number;
};

type MasteryOverviewProps = {
  overallMastery: number;
  concepts: ConceptMastery[];
};

export function MasteryOverview({
  overallMastery,
  concepts,
}: MasteryOverviewProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Overall mastery */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Brain className="h-4 w-4" />
            </div>

            <h2 className="text-base font-semibold text-gray-950">
              Overall mastery
            </h2>
          </div>

          <span className="text-xl font-semibold text-gray-950">
            {overallMastery}%
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{
              width: `${Math.min(
                Math.max(overallMastery, 0),
                100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Concepts */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-950">
          Concept mastery
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Your current understanding across important concepts.
        </p>

        {concepts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm font-medium text-gray-700">
              No concept mastery data yet
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Complete quizzes and assessments to build your
              concept mastery profile.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {concepts.map((concept) => (
              <div key={concept.id}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {concept.name}
                  </span>

                  <span className="text-sm font-semibold text-gray-950">
                    {concept.mastery}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-800 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          concept.mastery,
                          0
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}