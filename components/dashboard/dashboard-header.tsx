import { Sparkles } from "lucide-react";

export function DashboardHeader() {
  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">
            {greeting}
          </span>

          <span aria-hidden="true">👋</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-gray-950 sm:text-4xl">
          Continue learning
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Pick up where you left off and keep building your knowledge.
        </p>
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-medium text-gray-500 shadow-sm sm:flex">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
        Learning companion
      </div>
    </div>
  );
}