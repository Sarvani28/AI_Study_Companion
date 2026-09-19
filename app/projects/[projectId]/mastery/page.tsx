"use client";

import Link from "next/link";

import {
  use,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
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
  lastAssessedAt:
    | string
    | null;
  trend: string;
};

type MasteryData = {
  project: {
    id: string;
    name: string;
    learningGoal:
      | string
      | null;
  };

  overallMastery: number;

  mastery: MasteryItem[];
};

function getTrendIcon(
  trend: string
) {
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
    <Target className="h-4 w-4" />
  );
}

export default function MasteryPage({
  params,
}: PageProps) {
  const { projectId } =
    use(params);

  const [
    data,
    setData,
  ] =
    useState<MasteryData | null>(
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
              "Could not load mastery."
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

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-10 w-72 rounded bg-muted" />

            <div className="h-40 rounded-3xl border bg-muted/40" />

            <div className="h-64 rounded-3xl border bg-muted/40" />
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
              "Could not load mastery."}
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
            Mastery
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {data.project.name}
          </h1>

          {data.project
            .learningGoal && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {
                data.project
                  .learningGoal
              }
            </p>
          )}
        </header>

        <section className="mt-8 rounded-3xl border bg-card p-7 shadow-sm">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-muted-foreground">
                Overall mastery
              </p>

              <p className="mt-2 text-5xl font-semibold tracking-tight">
                {Math.round(
                  data.overallMastery
                )}
                %
              </p>
            </div>

            <Link
              href={`/projects/${projectId}/quiz/open-ended`}
              className="rounded-xl bg-foreground px-5 py-3 text-center text-sm font-medium text-background"
            >
              Practice now
            </Link>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{
                width: `${Math.min(
                  100,
                  data.overallMastery
                )}%`,
              }}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Concept mastery
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your current understanding of
              each concept.
            </p>
          </div>

          {data.mastery.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed p-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                No mastery data yet
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Complete a quiz to begin
                tracking mastery.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.mastery.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium">
                          {
                            item.conceptName
                          }
                        </h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {
                            item.attemptCount
                          }{" "}
                          attempts
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {getTrendIcon(
                          item.trend
                        )}

                        {item.trend}
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <p className="text-3xl font-semibold">
                        {Math.round(
                          item.masteryScore
                        )}
                        %
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {Math.round(
                          item.confidence
                        )}
                        % confidence
                      </p>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{
                          width: `${Math.min(
                            100,
                            item.masteryScore
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}