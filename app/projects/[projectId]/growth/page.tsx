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
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Flame,
  Minus,
  Target,
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getMasteryLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Building";
  return "Needs practice";
}

function getTrendConfig(trend: string) {
  if (trend === "Improving") {
    return {
      icon: TrendingUp,
      label: "Improving",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
      iconBg:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    };
  }

  if (trend === "Needs Attention") {
    return {
      icon: TrendingDown,
      label: "Needs attention",
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
      iconBg:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
  }

  return {
    icon: Minus,
    label: "Stable",
    badge:
      "border-border bg-muted text-muted-foreground",
    iconBg:
      "bg-muted text-muted-foreground",
  };
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Recently";
  }
}

function formatDateTime(date: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "Recently";
  }
}

export default function GrowthPage({
  params,
}: PageProps) {
  const { projectId } = use(params);

  const [data, setData] =
    useState<GrowthData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadGrowth() {
      try {
        setLoading(true);
        setError(null);

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

  const summary = useMemo(() => {
    if (!data) {
      return {
        totalAssessments: 0,
        totalChange: 0,
        averageChange: 0,
        latestChange: 0,
      };
    }

    const history = data.history;

    const totalChange =
      history.length > 0
        ? history.reduce(
            (sum, item) => sum + item.change,
            0
          )
        : 0;

    const latest =
      history.length > 0
        ? history[history.length - 1]
        : null;

    return {
      totalAssessments: history.length,
      totalChange,
      averageChange:
        history.length > 0
          ? totalChange / history.length
          : 0,
      latestChange:
        latest?.change ?? 0,
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
              <div className="h-5 w-[32rem] max-w-full rounded-lg bg-muted" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-32 rounded-2xl bg-muted" />
              <div className="h-32 rounded-2xl bg-muted" />
              <div className="h-32 rounded-2xl bg-muted" />
              <div className="h-32 rounded-2xl bg-muted" />
            </div>

            <div className="h-[28rem] rounded-3xl bg-muted" />

            <div className="h-96 rounded-3xl bg-muted" />
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
              Unable to load growth
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error ??
                "Could not load growth data."}
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

  const overallMastery =
    clamp(data.overallMastery);

  const masteryLabel =
    getMasteryLabel(overallMastery);

  const recentHistory =
    data.history
      .slice()
      .reverse()
      .slice(0, 10);

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
              <Activity className="h-3.5 w-3.5" />
              Learning progress
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Growth & progress
            </h1>

            <p className="mt-3 text-base leading-7 text-muted-foreground">
              See how your mastery changes over time and
              understand which concepts are improving,
              stable, or need more attention.
            </p>

            <div className="mt-4 inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">
              {data.project.name}
            </div>
          </div>

          <Link
            href={`/projects/${projectId}/quiz/open-ended`}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Target className="h-4 w-4" />
            Practice now
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </header>

        {/* Summary Cards */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Overall */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Overall mastery
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight">
                {Math.round(overallMastery)}%
              </span>

              <span className="mb-1 text-xs text-muted-foreground">
                {masteryLabel}
              </span>
            </div>
          </div>

          {/* Improving */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Improving
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {data.trendCounts.improving}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              concepts gaining mastery
            </p>
          </div>

          {/* Stable */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Stable
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Minus className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {data.trendCounts.stable}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              concepts holding steady
            </p>
          </div>

          {/* Attention */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Needs attention
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {data.trendCounts.needsAttention}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              concepts to revisit
            </p>
          </div>
        </section>

        {/* Progress Overview */}
        <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-muted">
                  <svg
                    className="absolute inset-0 h-full w-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-foreground"
                      strokeLinecap="round"
                      strokeDasharray={`${overallMastery * 2.64} 264`}
                    />
                  </svg>

                  <span className="relative text-xl font-semibold">
                    {Math.round(overallMastery)}%
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Current progress
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {masteryLabel} understanding
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Your mastery is being updated as you
                    complete assessments and practice sessions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/50 px-5 py-4">
                  <p className="text-xs text-muted-foreground">
                    Assessments
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary.totalAssessments}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/50 px-5 py-4">
                  <p className="text-xs text-muted-foreground">
                    Avg. change
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary.averageChange >= 0
                      ? "+"
                      : ""}
                    {summary.averageChange.toFixed(1)}
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl bg-muted/50 px-5 py-4 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">
                    Latest change
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary.latestChange >= 0
                      ? "+"
                      : ""}
                    {summary.latestChange.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium">
                  Overall mastery
                </span>

                <span className="text-muted-foreground">
                  {Math.round(overallMastery)} / 100
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${overallMastery}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="mt-8 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b px-6 py-6 sm:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <BarChart3 className="h-4 w-4" />
                  </div>

                  <h2 className="text-lg font-semibold">
                    Mastery history
                  </h2>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Your mastery progression across assessments.
                </p>
              </div>

              {data.history.length > 0 && (
                <div className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {data.history.length} assessment
                  {data.history.length === 1
                    ? ""
                    : "s"}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {data.history.length > 0 ? (
              <MasteryHistoryChart
                history={data.history}
              />
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <BarChart3 className="h-7 w-7 text-muted-foreground" />
                </div>

                <h3 className="mt-5 font-semibold">
                  Your growth chart is waiting
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Complete your first assessment to start
                  building your mastery history.
                </p>

                <Link
                  href={`/projects/${projectId}/quiz/open-ended`}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
                >
                  Start an assessment
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Recent Changes */}
        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Recent changes
                </h2>

                {data.history.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {Math.min(
                      10,
                      data.history.length
                    )}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-sm text-muted-foreground">
                The latest changes to your concept mastery.
              </p>
            </div>

            <Link
              href={`/projects/${projectId}/mastery`}
              className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              View mastery
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {recentHistory.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed bg-card p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Activity className="h-7 w-7 text-muted-foreground" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                No growth activity yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Complete an assessment to see how your
                mastery changes over time.
              </p>

              <Link
                href={`/projects/${projectId}/quiz/open-ended`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
              >
                Start practicing
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-3xl border bg-card shadow-sm">
              <div className="divide-y">
                {recentHistory.map((item) => {
                  const trend =
                    getTrendConfig(item.trend);

                  const TrendIcon =
                    trend.icon;

                  const change =
                    item.change;

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col gap-5 p-5 transition hover:bg-muted/30 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
                    >
                      {/* Concept */}
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${trend.iconBg}`}
                        >
                          <TrendIcon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">
                              {item.conceptName}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trend.badge}`}
                            >
                              {trend.label}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(
                              item.createdAt
                            )}
                            {item.source
                              ? ` · ${item.source}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="flex flex-wrap items-center gap-5 sm:gap-8">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Mastery
                          </p>

                          <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                            <span>
                              {Math.round(
                                item.oldMastery
                              )}
                              %
                            </span>

                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />

                            <span>
                              {Math.round(
                                item.newMastery
                              )}
                              %
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Assessment
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {Math.round(
                              item.assessmentScore
                            )}
                            %
                          </p>
                        </div>

                        <div
                          className={[
                            "min-w-20 rounded-xl px-3 py-2 text-center",
                            change > 0
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : change < 0
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          <p className="text-[10px] font-medium uppercase tracking-wide">
                            Change
                          </p>

                          <p className="mt-0.5 text-sm font-bold">
                            {change > 0
                              ? "+"
                              : ""}
                            {change.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        {data.history.length > 0 && (
          <section className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Flame className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Keep your progress moving
                  </h2>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Practice the concepts that need attention
                    and continue building stronger, more
                    consistent mastery.
                  </p>
                </div>
              </div>

              <Link
                href={`/projects/${projectId}/quiz/open-ended`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Continue learning
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}