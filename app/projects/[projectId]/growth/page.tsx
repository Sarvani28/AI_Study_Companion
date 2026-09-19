"use client";

import Link from "next/link";

import {
  use,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  MasteryHistoryChart,
} from "@/components/growth/mastery-history-chart";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type GrowthHistory = {
  id: string;
  conceptId: string;
  conceptName: string;
  oldMastery: number;
  assessmentScore: number;
  newMastery: number;
  change: number;
  trend:
    | "Improving"
    | "Stable"
    | "Needs Attention";
  source: string;
  createdAt: string;
};

type GrowthData = {
  project: {
    id: string;
    name: string;
  };

  overallMastery: number;

  mastery: Array<{
    id: string;
    conceptId: string;
    conceptName: string;
    masteryScore: number;
    confidence: number;
    attemptCount: number;
    correctCount: number;
    trend: string;
  }>;

  history: GrowthHistory[];

  trendCounts: {
    improving: number;
    stable: number;
    needsAttention: number;
  };
};

function TrendIcon({
  trend,
}: {
  trend: string;
}) {
  if (
    trend ===
    "Improving"
  ) {
    return (
      <TrendingUp className="h-4 w-4" />
    );
  }

  if (
    trend ===
    "Needs Attention"
  ) {
    return (
      <TrendingDown className="h-4 w-4" />
    );
  }

  return (
    <Minus className="h-4 w-4" />
  );
}

export default function GrowthPage({
  params,
}: PageProps) {
  const { projectId } =
    use(params);

  const [
    data,
    setData,
  ] =
    useState<GrowthData | null>(
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
    async function loadGrowth() {
      try {
        const response =
          await fetch(
            `/api/mastery?projectId=${projectId}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Could not load growth."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load growth."
        );
      } finally {
        setLoading(false);
      }
    }

    loadGrowth();
  }, [projectId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-24 rounded bg-muted" />

            <div className="h-10 w-72 rounded bg-muted" />

            <div className="h-80 rounded-3xl border bg-muted/40" />
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
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm text-destructive">
            {error ??
              "Could not load growth."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </Link>

        <header className="mt-8">
          <p className="text-sm text-muted-foreground">
            Growth
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {data.project.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track how your mastery changes
            as you complete assessments.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Improving
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                data.trendCounts
                  .improving
              }
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Stable
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                data.trendCounts
                  .stable
              }
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Needs Attention
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                data.trendCounts
                  .needsAttention
              }
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">
              Mastery history
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your mastery progression across
              assessments.
            </p>
          </div>

          <div className="mt-8">
            <MasteryHistoryChart
              history={
                data.history
              }
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Recent changes
          </h2>

          <div className="mt-4 space-y-3">
            {data.history
              .slice()
              .reverse()
              .slice(0, 10)
              .map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {
                          item.conceptName
                        }
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(
                          item.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.round(
                            item.oldMastery
                          )}
                          %
                          <span className="mx-2 text-muted-foreground">
                            →
                          </span>
                          {Math.round(
                            item.newMastery
                          )}
                          %
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Assessment:{" "}
                          {Math.round(
                            item.assessmentScore
                          )}
                          %
                        </p>
                      </div>

                      <div
                        className={[
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                          item.trend ===
                          "Improving"
                            ? "bg-green-500/10 text-green-700"
                            : item.trend ===
                                "Needs Attention"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        <TrendIcon
                          trend={
                            item.trend
                          }
                        />

                        {item.trend}
                      </div>
                    </div>
                  </div>
                )
              )}

            {data.history.length ===
              0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Complete your first
                  assessment to see
                  growth here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}