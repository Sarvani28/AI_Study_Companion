"use client";

import Link from "next/link";
import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type AnalyticsData = {
  project: {
    id: string;
    name: string;
  };

  summary: {
    tutorMessages: number;
    quizzes: number;
    questions: number;
    quizAccuracy: number;
    questionAccuracy: number;
    materials: number;
  };

  masteryChart: Array<{
    index: number;
    mastery: number;
    concept: string;
    date: string;
  }>;

  quizAccuracyChart: Array<{
    index: number;
    accuracy: number;
    date: string;
  }>;

  tutorActivity: Array<{
    index: number;
    date: string;
    messages: number;
  }>;

  materialProcessing: Array<{
    filename: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getMasteryLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Building";
  return "Needs practice";
}

function getStatusConfig(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized === "ready" ||
    normalized === "completed"
  ) {
    return {
      label: "Ready",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
      icon: CheckCircle2,
    };
  }

  if (
    normalized === "processing" ||
    normalized === "queued"
  ) {
    return {
      label:
        normalized === "queued"
          ? "Queued"
          : "Processing",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400",
      icon: Activity,
    };
  }

  if (normalized === "failed") {
    return {
      label: "Failed",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400",
      icon: CircleHelp,
    };
  }

  return {
    label: status,
    className:
      "border-border bg-muted text-muted-foreground",
    icon: FileText,
  };
}

function formatChartDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatFullDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      concept?: string;
      date?: string;
    };
  }>;
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0]?.value;
  const date =
    payload[0]?.payload?.date;

  return (
    <div className="min-w-36 rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur">
      <p className="text-xs text-muted-foreground">
        {date
          ? formatFullDate(date)
          : label}
      </p>

      {payload[0]?.payload?.concept && (
        <p className="mt-1 text-xs font-medium">
          {payload[0].payload.concept}
        </p>
      )}

      <p className="mt-2 text-lg font-semibold">
        {typeof value === "number"
          ? Math.round(value)
          : value}
        {suffix}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4.5 w-4.5" />
        </div>

        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium">
        {label}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="border-b px-6 py-6 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-4.5 w-4.5" />
          </div>

          <div>
            <h2 className="font-semibold">
              {title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8">
        {children}
      </div>
    </section>
  );
}

export default function AnalyticsPage({
  params,
}: PageProps) {
  const { projectId } = use(params);

  const [data, setData] =
    useState<AnalyticsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            `/api/projects/${projectId}/analytics`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Could not load analytics."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load analytics."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId]);

  const insights = useMemo(() => {
    if (!data) {
      return {
        mastery: 0,
        quizAccuracy: 0,
        questionAccuracy: 0,
        materialReady: 0,
        materialTotal: 0,
      };
    }

    const readyMaterials =
      data.materialProcessing.filter(
        (item) =>
          item.status.toLowerCase() ===
          "ready"
      ).length;

    return {
      mastery:
        data.masteryChart.length > 0
          ? data.masteryChart[
              data.masteryChart.length - 1
            ]?.mastery ?? 0
          : 0,

      quizAccuracy:
        data.summary.quizAccuracy,

      questionAccuracy:
        data.summary.questionAccuracy,

      materialReady: readyMaterials,

      materialTotal:
        data.materialProcessing.length,
    };
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-5 w-28 rounded-full bg-muted" />

            <div className="space-y-3">
              <div className="h-10 w-80 rounded-xl bg-muted" />
              <div className="h-5 w-[34rem] max-w-full rounded-lg bg-muted" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-36 rounded-2xl bg-muted" />
              <div className="h-36 rounded-2xl bg-muted" />
              <div className="h-36 rounded-2xl bg-muted" />
              <div className="h-36 rounded-2xl bg-muted" />
            </div>

            <div className="h-80 rounded-3xl bg-muted" />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-96 rounded-3xl bg-muted" />
              <div className="h-96 rounded-3xl bg-muted" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <CircleHelp className="h-7 w-7 text-destructive" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Unable to load analytics
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error ??
                "Could not load analytics data."}
            </p>

            <Link
              href={`/projects/${projectId}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to project
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const mastery =
    clamp(insights.mastery);

  const quizAccuracy =
    clamp(insights.quizAccuracy);

  const questionAccuracy =
    clamp(insights.questionAccuracy);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back */}
        <Link
          href={`/projects/${projectId}`}
          className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to project
        </Link>

        {/* Header */}
        <header className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Learning analytics
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your learning dashboard
            </h1>

            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Understand your progress, assessment performance,
              tutor activity, and learning materials in one place.
            </p>

            <div className="mt-4 inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">
              {data.project.name}
            </div>
          </div>

          <Link
            href={`/projects/${projectId}/quiz`}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Brain className="h-4 w-4" />
            Practice now
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </header>

        {/* Main Metrics */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Target}
            label="Overall mastery"
            value={`${Math.round(mastery)}%`}
            description={getMasteryLabel(mastery)}
          />

          <StatCard
            icon={Trophy}
            label="Quiz accuracy"
            value={`${Math.round(quizAccuracy)}%`}
            description="Performance across quizzes"
          />

          <StatCard
            icon={MessageSquare}
            label="Tutor interactions"
            value={data.summary.tutorMessages}
            description="Questions asked to your AI tutor"
          />

          <StatCard
            icon={FileText}
            label="Learning materials"
            value={data.summary.materials}
            description="Documents in this project"
          />
        </section>

        {/* Learning Snapshot */}
        <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Activity className="h-4.5 w-4.5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Learning snapshot
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  A quick view of your current learning performance.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-3">

            {/* Mastery */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Mastery
                </span>

                <span className="text-sm font-semibold">
                  {Math.round(mastery)}%
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${mastery}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {getMasteryLabel(mastery)} understanding
              </p>
            </div>

            {/* Quiz accuracy */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Quiz accuracy
                </span>

                <span className="text-sm font-semibold">
                  {Math.round(quizAccuracy)}%
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${quizAccuracy}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Across completed quizzes
              </p>
            </div>

            {/* Question accuracy */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Question accuracy
                </span>

                <span className="text-sm font-semibold">
                  {Math.round(questionAccuracy)}%
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${questionAccuracy}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Across answered questions
              </p>
            </div>
          </div>
        </section>

        {/* Mastery + Quiz Accuracy */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* Mastery */}
          <ChartCard
            title="Mastery over time"
            description="How your concept mastery has changed."
            icon={TrendingUp}
          >
            {data.masteryChart.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={data.masteryChart}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />

                    <XAxis
                      dataKey="index"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const item =
                          data.masteryChart[
                            Number(value)
                          ];

                        return item
                          ? formatChartDate(
                              item.date
                            )
                          : "";
                      }}
                      className="text-[11px]"
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      className="text-[11px]"
                    />

                    <Tooltip
                      content={
                        <ChartTooltip suffix="%" />
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="mastery"
                      stroke="currentColor"
                      strokeWidth={3}
                      dot={{
                        r: 3,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart
                title="No mastery data yet"
                description="Complete an assessment to start tracking mastery."
              />
            )}
          </ChartCard>

          {/* Quiz Accuracy */}
          <ChartCard
            title="Quiz accuracy"
            description="Accuracy across completed quizzes."
            icon={Trophy}
          >
            {data.quizAccuracyChart.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={data.quizAccuracyChart}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />

                    <XAxis
                      dataKey="index"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const item =
                          data.quizAccuracyChart[
                            Number(value)
                          ];

                        return item
                          ? formatChartDate(
                              item.date
                            )
                          : "";
                      }}
                      className="text-[11px]"
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      className="text-[11px]"
                    />

                    <Tooltip
                      content={
                        <ChartTooltip suffix="%" />
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="currentColor"
                      strokeWidth={3}
                      dot={{
                        r: 3,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart
                title="No quiz data yet"
                description="Complete a quiz to begin tracking accuracy."
              />
            )}
          </ChartCard>
        </section>

        {/* Tutor Activity + Materials */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* Tutor Activity */}
          <ChartCard
            title="Tutor activity"
            description="Your interactions with the AI tutor over time."
            icon={MessageSquare}
          >
            {data.tutorActivity.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={data.tutorActivity}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />

                    <XAxis
                      dataKey="index"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const item =
                          data.tutorActivity[
                            Number(value)
                          ];

                        return item
                          ? formatChartDate(
                              item.date
                            )
                          : "";
                      }}
                      className="text-[11px]"
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      className="text-[11px]"
                    />

                    <Tooltip
                      content={
                        <ChartTooltip />
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="messages"
                      stroke="currentColor"
                      strokeWidth={3}
                      dot={{
                        r: 3,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart
                title="No tutor activity yet"
                description="Ask your AI tutor a question to begin tracking activity."
              />
            )}
          </ChartCard>

          {/* Materials */}
          <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="border-b px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Learning materials
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Current processing state of your documents.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {data.materialProcessing.length}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {data.materialProcessing.length > 0 ? (
                <div className="space-y-3">
                  {data.materialProcessing.map(
                    (material) => {
                      const status =
                        getStatusConfig(
                          material.status
                        );

                      const StatusIcon =
                        status.icon;

                      return (
                        <div
                          key={`${material.filename}-${material.createdAt}`}
                          className="group rounded-2xl border p-4 transition hover:bg-muted/30"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {material.filename}
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  Added{" "}
                                  {formatFullDate(
                                    material.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${status.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>

                  <h3 className="mt-5 font-semibold">
                    No materials yet
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Upload learning materials to build your
                    project knowledge base.
                  </p>

                  <Link
                    href={`/projects/${projectId}/materials`}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
                  >
                    Add materials
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </section>

        {/* Performance */}
        <section className="mt-8 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-4.5 w-4.5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Assessment performance
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  A detailed look at your current assessment accuracy.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 sm:grid-cols-2">
            <div className="border-b p-6 sm:border-b-0 sm:border-r sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Quiz accuracy
                </p>

                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="mt-4 text-4xl font-semibold tracking-tight">
                {Math.round(quizAccuracy)}%
              </p>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${quizAccuracy}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Based on {data.summary.quizzes} completed{" "}
                {data.summary.quizzes === 1
                  ? "quiz"
                  : "quizzes"}.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Question accuracy
                </p>

                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="mt-4 text-4xl font-semibold tracking-tight">
                {Math.round(questionAccuracy)}%
              </p>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${questionAccuracy}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Based on {data.summary.questions} answered{" "}
                {data.summary.questions === 1
                  ? "question"
                  : "questions"}.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-8 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Brain className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Keep building your progress
                </h2>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use your tutor, quizzes, and assessments to
                  strengthen the concepts that matter most.
                </p>
              </div>
            </div>

            <Link
              href={`/projects/${projectId}/quiz`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Continue learning
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptyChart({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-80 flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BarChart3 className="h-7 w-7 text-muted-foreground" />
      </div>

      <h3 className="mt-5 font-semibold">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}