import {
  BarChart3,
  BookOpen,
  Target,
} from "lucide-react";

type ProjectOverviewStatsProps = {
  materialCount: number;
  quizScore: number;
  accuracy: number;
};

type StatCardProps = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

function StatCard({
  label,
  value,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export function ProjectOverviewStats({
  materialCount,
  quizScore,
  accuracy,
}: ProjectOverviewStatsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Materials"
        value={String(materialCount)}
        icon={BookOpen}
      />

      <StatCard
        label="Quiz score"
        value={`${Math.round(quizScore)}%`}
        icon={BarChart3}
      />

      <StatCard
        label="Accuracy"
        value={`${Math.round(accuracy)}%`}
        icon={Target}
      />
    </section>
  );
}