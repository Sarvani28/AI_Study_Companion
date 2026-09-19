"use client";

import Link from "next/link";

import {
  use,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BookOpen,
  Brain,
  MessageSquare,
  Target,
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-xl border p-2">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-5 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default function AnalyticsPage({
  params,
}: PageProps) {
  const { projectId } =
    use(params);

  const [
    data,
    setData,
  ] =
    useState<AnalyticsData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    async function load() {
      try {
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

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-10 w-72 rounded bg-muted" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-muted" />
              <div className="h-32 rounded-2xl bg-muted" />
              <div className="h-32 rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-destructive">
            {error ??
              "Could not load analytics."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </Link>

        <header className="mt-8">
          <p className="text-sm text-muted-foreground">
            Analytics
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {data.project.name}
          </h1>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard
            icon={MessageSquare}
            label="Tutor messages"
            value={
              data.summary
                .tutorMessages
            }
          />

          <StatCard
            icon={Brain}
            label="Quizzes"
            value={
              data.summary
                .quizzes
            }
          />

          <StatCard
            icon={BookOpen}
            label="Questions"
            value={
              data.summary
                .questions
            }
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6">
            <h2 className="font-semibold">
              Mastery over time
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              How your concept mastery has changed.
            </p>

            <div className="mt-6 h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    data.masteryChart
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="index"
                  />

                  <YAxis
                    domain={[
                      0,
                      100,
                    ]}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="mastery"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6">
            <h2 className="font-semibold">
              Quiz accuracy
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Accuracy across completed quizzes.
            </p>

            <div className="mt-6 h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    data.quizAccuracyChart
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="index"
                  />

                  <YAxis
                    domain={[
                      0,
                      100,
                    ]}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6">
            <h2 className="font-semibold">
              Tutor activity
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Tutor interactions over time.
            </p>

            <div className="mt-6 h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    data.tutorActivity
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="index"
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6">
            <h2 className="font-semibold">
              Material processing
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Current state of project materials.
            </p>

            <div className="mt-5 space-y-3">
              {data.materialProcessing.map(
                (material) => (
                  <div
                    key={
                      material.filename
                    }
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {
                          material.filename
                        }
                      </p>
                    </div>

                    <span className="ml-4 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {
                        material.status
                      }
                    </span>
                  </div>
                )
              )}

              {data.materialProcessing
                .length ===
                0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No materials yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5" />

            <div>
              <h2 className="font-semibold">
                Learning accuracy
              </h2>

              <p className="text-sm text-muted-foreground">
                Current assessment performance.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Quiz accuracy
              </p>

              <p className="mt-1 text-3xl font-semibold">
                {
                  data.summary
                    .quizAccuracy
                }
                %
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Question accuracy
              </p>

              <p className="mt-1 text-3xl font-semibold">
                {
                  data.summary
                    .questionAccuracy
                }
                %
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}