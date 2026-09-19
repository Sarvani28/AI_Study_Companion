"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Flame,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type MasteryItem = {
  id: string;
  conceptId: string;
  conceptName: string;
  masteryScore: number;
  confidence: number;
  attemptCount: number;
  correctCount: number;
  lastAssessedAt: string | null;
  trend: string;
};

type MasteryData = {
  project: {
    id: string;
    name: string;
    learningGoal: string | null;
  };

  overallMastery: number;

  mastery: MasteryItem[];
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

function getMasteryDescription(score: number) {
  if (score >= 80) {
    return "You have a strong understanding of this material.";
  }

  if (score >= 60) {
    return "Your understanding is developing well. Keep practicing.";
  }

  if (score >= 40) {
    return "You have a foundation. More practice will strengthen it.";
  }

  return "This area needs more focused practice.";
}

function getTrendConfig(trend: string) {
  if (trend === "Improving") {
    return {
      icon: TrendingUp,
      label: "Improving",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
    };
  }

  if (trend === "Needs Attention") {
    return {
      icon: TrendingDown,
      label: "Needs attention",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
    };
  }

  return {
    icon: Minus,
    label: "Stable",
    className:
      "border-border bg-muted/60 text-muted-foreground",
  };
}

function formatDate(date: string | null) {
  if (!date) return "Not assessed yet";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Recently assessed";
  }
}

export default function MasteryPage({ params }: PageProps) {
  const { projectId } = use(params);

  const [data, setData] = useState<MasteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/mastery?projectId=${projectId}`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Could not load mastery."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load mastery."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId]);

  const stats = useMemo(() => {
    if (!data) {
      return {
        strong: 0,
        developing: 0,
        needsAttention: 0,
        totalAttempts: 0,
      };
    }

    return {
      strong: data.mastery.filter(
        (item) => item.masteryScore >= 80
      ).length,

      developing: data.mastery.filter(
        (item) =>
          item.masteryScore >= 50 &&
          item.masteryScore < 80
      ).length,

      needsAttention: data.mastery.filter(
        (item) => item.masteryScore < 50
      ).length,

      totalAttempts: data.mastery.reduce(
        (total, item) => total + item.attemptCount,
        0
      ),
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-2xl bg-muted" />
              <div className="h-28 rounded-2xl bg-muted" />
              <div className="h-28 rounded-2xl bg-muted" />
            </div>

            <div className="h-72 rounded-3xl bg-muted" />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-64 rounded-2xl bg-muted" />
              <div className="h-64 rounded-2xl bg-muted" />
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
              Unable to load mastery
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error ?? "Could not load mastery data."}
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

  const overall = clamp(data.overallMastery);
  const masteryLabel = getMasteryLabel(overall);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back */}
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
              <Target className="h-3.5 w-3.5" />
              Learning analytics
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Mastery overview
            </h1>

            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Track how well you understand each concept and identify
              where focused practice can help you improve.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
                {data.project.name}
              </span>

              {data.project.learningGoal && (
                <span className="max-w-xl truncate rounded-lg border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  Goal: {data.project.learningGoal}
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/projects/${projectId}/quiz/open-ended`}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <BookOpen className="h-4 w-4" />
            Practice now
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </header>

        {/* Summary Stats */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                {Math.round(overall)}%
              </span>

              <span className="mb-1 text-xs font-medium text-muted-foreground">
                {masteryLabel}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Strong concepts
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {stats.strong}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              80% mastery or higher
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Developing
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {stats.developing}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              50–79% mastery
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Practice needed
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {stats.needsAttention}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Below 50% mastery
            </p>
          </div>
        </section>

        {/* Overall Mastery */}
        <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
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
                      strokeDasharray={`${overall * 2.64} 264`}
                    />
                  </svg>

                  <span className="relative text-xl font-semibold">
                    {Math.round(overall)}%
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Current learning progress
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {masteryLabel} understanding
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    {getMasteryDescription(overall)}
                  </p>
                </div>
              </div>

              <div className="min-w-52 rounded-2xl bg-muted/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total practice
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {stats.totalAttempts}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  recorded attempts
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium">
                  Overall progress
                </span>

                <span className="text-muted-foreground">
                  {Math.round(overall)} / 100
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{
                    width: `${overall}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Concept Mastery */}
        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Concept mastery
                </h2>

                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {data.mastery.length}
                </span>
              </div>

              <p className="mt-1.5 text-sm text-muted-foreground">
                A detailed view of your understanding across the
                concepts in this project.
              </p>
            </div>

            <Link
              href={`/projects/${projectId}/quiz/open-ended`}
              className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Practice concepts
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {data.mastery.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed bg-card p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Target className="h-7 w-7 text-muted-foreground" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Your mastery profile is empty
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Complete a quiz or open-ended assessment to start
                building your concept mastery profile.
              </p>

              <Link
                href={`/projects/${projectId}/quiz/open-ended`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
              >
                Start practicing
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {data.mastery.map((item) => {
                const score = clamp(item.masteryScore);
                const confidence = clamp(item.confidence);
                const trend = getTrendConfig(item.trend);
                const TrendIcon = trend.icon;

                const accuracy =
                  item.attemptCount > 0
                    ? Math.round(
                        (item.correctCount /
                          item.attemptCount) *
                          100
                      )
                    : 0;

                return (
                  <article
                    key={item.id}
                    className="group rounded-2xl border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">
                          {item.conceptName}
                        </h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Last assessed{" "}
                          {formatDate(item.lastAssessedAt)}
                        </p>
                      </div>

                      <div
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trend.className}`}
                      >
                        <TrendIcon className="h-3.5 w-3.5" />
                        {trend.label}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <span className="text-4xl font-semibold tracking-tight">
                          {Math.round(score)}
                        </span>

                        <span className="ml-1 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>

                      <span className="mb-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
                        {getMasteryLabel(score)}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground transition-all duration-500"
                          style={{
                            width: `${score}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-5 grid grid-cols-3 divide-x rounded-xl border bg-muted/30">
                      <div className="px-3 py-3 text-center">
                        <p className="text-sm font-semibold">
                          {item.attemptCount}
                        </p>

                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Attempts
                        </p>
                      </div>

                      <div className="px-3 py-3 text-center">
                        <p className="text-sm font-semibold">
                          {accuracy}%
                        </p>

                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Accuracy
                        </p>
                      </div>

                      <div className="px-3 py-3 text-center">
                        <p className="text-sm font-semibold">
                          {Math.round(confidence)}%
                        </p>

                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Confidence
                        </p>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          Confidence
                        </span>

                        <span className="text-muted-foreground">
                          {Math.round(confidence)}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-muted-foreground/60 transition-all duration-500"
                          style={{
                            width: `${confidence}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between border-t pt-4">
                      <span className="text-xs text-muted-foreground">
                        {getMasteryDescription(score)}
                      </span>

                      <Link
                        href={`/projects/${projectId}/quiz/open-ended`}
                        className="inline-flex items-center gap-1 text-xs font-semibold opacity-0 transition group-hover:opacity-100"
                      >
                        Practice
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        {data.mastery.length > 0 && (
          <section className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Flame className="h-4 w-4" />
                  </div>

                  <h2 className="font-semibold">
                    Keep building your mastery
                  </h2>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Continue practicing to strengthen weaker concepts,
                  improve confidence, and keep your learning progress
                  moving forward.
                </p>
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