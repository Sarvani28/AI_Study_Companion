"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  Brain,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Users,
  XCircle,
} from "lucide-react";

type AdminData = {
  overview: {
    users: number;
    projects: number;
    materials: number;
    tutorRequests: number;

    aiUsage: {
      tutorRequests: number;
      quizEvaluation: number;
      recommendations: number;
      averageLatencyMs: number;
      successRate: number;
    };

    backgroundJobs: {
      completed: number;
      processing: number;
      failed: number;
    };
  };
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {label}
        </p>

        <div className="rounded-xl border p-2">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-5 text-3xl font-semibold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const [
    data,
    setData,
  ] =
    useState<AdminData | null>(
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
            "/api/admin/overview",
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Could not load admin dashboard."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-48 rounded bg-muted" />

            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({
                length: 4,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-32 rounded-2xl bg-muted"
                  />
                )
              )}
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
              "Could not load admin dashboard."}
          </p>
        </div>
      </main>
    );
  }

  const {
    overview,
  } = data;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header>
          <p className="text-sm text-muted-foreground">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Admin
          </h1>
        </header>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">
            Overview
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Users"
              value={overview.users}
              icon={Users}
            />

            <StatCard
              label="Projects"
              value={overview.projects}
              icon={FolderKanban}
            />

            <StatCard
              label="Materials"
              value={overview.materials}
              icon={Activity}
            />

            <StatCard
              label="Tutor requests"
              value={
                overview.tutorRequests
              }
              icon={Brain}
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">
            AI Usage
          </h2>

          <div className="rounded-3xl border bg-card p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tutor requests
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {overview.aiUsage.tutorRequests.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Quiz evaluation
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {overview.aiUsage.quizEvaluation.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Recommendations
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {overview.aiUsage.recommendations.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 border-t pt-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Average latency
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {(
                    overview.aiUsage
                      .averageLatencyMs /
                    1000
                  ).toFixed(1)}
                  s
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Success rate
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {
                    overview.aiUsage
                      .successRate
                  }
                  %
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">
            Background jobs
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5">
              <CheckCircle2 className="h-5 w-5" />

              <p className="mt-5 text-3xl font-semibold">
                {
                  overview
                    .backgroundJobs
                    .completed
                }
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Completed
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <Clock3 className="h-5 w-5" />

              <p className="mt-5 text-3xl font-semibold">
                {
                  overview
                    .backgroundJobs
                    .processing
                }
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Processing
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <XCircle className="h-5 w-5" />

              <p className="mt-5 text-3xl font-semibold">
                {
                  overview
                    .backgroundJobs
                    .failed
                }
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Failed
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}