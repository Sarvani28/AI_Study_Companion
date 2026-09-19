import {
  Brain,
  CircleCheck,
  Target,
} from "lucide-react";

export function LearningStats({
  mastery,
  quizzes,
  accuracy,
}: {
  mastery: number;
  quizzes: number;
  accuracy: number;
}) {
  const stats = [
    {
      label: "Overall mastery",
      value: `${mastery}%`,
      description: "Across active projects",
      icon: Brain,
    },
    {
      label: "Quizzes",
      value: quizzes.toString(),
      description: "Completed assessments",
      icon: Target,
    },
    {
      label: "Accuracy",
      value: `${accuracy}%`,
      description: "Across answered questions",
      icon: CircleCheck,
    },
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-400">
          Your learning
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                <Icon className="h-4 w-4" />
              </div>

              <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
                {stat.value}
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700">
                {stat.label}
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}