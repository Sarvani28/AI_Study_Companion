"use client";

import Link from "next/link";

import {
  use,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  CircleHelp,
  Loader2,
  Sparkles,
  Target,
  X,
} from "lucide-react";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type Question = {
  id: string;
  question: string;
  conceptId: string | null;
  difficulty: string | null;
};

type Session = {
  id: string;
  projectId: string;
  projectName: string;
};

type Evaluation = {
  score: number;
  percentage: number;
  understanding: string;
  correct: boolean;
  conceptsCovered: string[];
  missingConcepts: string[];
  feedback: string;
};

type MasteryUpdate = {
  conceptId: string;
  concept: string;
  oldScore: number;
  newScore: number;
  trend: string;
};

export default function OpenEndedQuizPage({
  params,
}: PageProps) {
  const { projectId } =
    use(params);

  const started =
    useRef(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    question,
    setQuestion,
  ] =
    useState<Question | null>(
      null
    );

  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );

  const [
    answer,
    setAnswer,
  ] = useState("");

  const [
    evaluation,
    setEvaluation,
  ] =
    useState<Evaluation | null>(
      null
    );

  const [
    masteryUpdates,
    setMasteryUpdates,
  ] = useState<
    MasteryUpdate[]
  >([]);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;

    createQuestion();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createQuestion() {
    try {
      setLoading(true);
      setError(null);

      const response =
        await fetch(
          "/api/quiz/open-ended",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              projectId,
            }),

            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not create assessment."
        );
      }

      setSession(
        data.quizSession
      );

      setQuestion(
        data.question
      );

      setAnswer("");
      setEvaluation(null);
      setMasteryUpdates([]);
    } catch (err) {
      console.error(
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not create assessment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (
      !question ||
      !session ||
      !answer.trim() ||
      submitting ||
      evaluation
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response =
        await fetch(
          "/api/quiz/open-ended/answer",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              projectId,

              questionId:
                question.id,

              quizSessionId:
                session.id,

              answer:
                answer.trim(),
            }),

            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not evaluate answer."
        );
      }

      setEvaluation(
        data.evaluation
      );

      setMasteryUpdates(
        data.mastery ?? []
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not evaluate answer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-24 rounded bg-muted" />

            <div className="h-9 w-72 rounded bg-muted" />

            <div className="rounded-3xl border p-8">
              <div className="h-5 w-32 rounded bg-muted" />

              <div className="mt-8 h-16 w-full rounded bg-muted" />

              <div className="mt-8 h-40 rounded-2xl bg-muted" />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Preparing your assessment...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link
            href={`/projects/${projectId}/quiz`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to quiz
          </Link>

          <div className="mt-10 rounded-3xl border border-destructive/30 bg-destructive/5 p-8">
            <CircleHelp className="h-6 w-6 text-destructive" />

            <h1 className="mt-4 text-xl font-semibold">
              Assessment unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error}
            </p>

            <button
              type="button"
              onClick={
                createQuestion
              }
              className="mt-6 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (
    !question ||
    !session
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/projects/${projectId}/quiz`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to quiz
        </Link>

        <header className="mt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Open-ended assessment
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {session.projectName}
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Explain the concept in your own words.
            Your answer will be evaluated against
            your project materials.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Target className="h-3.5 w-3.5" />
              Open ended
            </span>

            {question.difficulty && (
              <span className="rounded-full border px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                {question.difficulty}
              </span>
            )}
          </div>

          <h2 className="mt-7 text-2xl font-semibold leading-9 tracking-tight">
            {question.question}
          </h2>

          {!evaluation ? (
            <>
              <div className="mt-8">
                <label
                  htmlFor="answer"
                  className="text-sm font-medium"
                >
                  Your answer
                </label>

                <textarea
                  id="answer"
                  value={answer}
                  onChange={(event) =>
                    setAnswer(
                      event.target.value
                    )
                  }
                  placeholder="Explain your reasoning in your own words..."
                  rows={8}
                  disabled={submitting}
                  className="mt-3 w-full resize-none rounded-2xl border bg-background px-4 py-4 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-foreground"
                />

                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>
                    Try to explain the
                    concept rather than
                    copying a definition.
                  </span>

                  <span>
                    {answer.length}/8000
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  disabled={
                    !answer.trim() ||
                    submitting
                  }
                  onClick={
                    submitAnswer
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {submitting
                    ? "Evaluating..."
                    : "Submit answer"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-8 space-y-5">
              <div
                className={[
                  "rounded-2xl border p-6",
                  evaluation.correct
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-destructive/30 bg-destructive/5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border">
                      {evaluation.correct ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-destructive" />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {evaluation.correct
                          ? "Good understanding"
                          : "Needs more practice"}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {evaluation.understanding}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-semibold">
                      {evaluation.percentage}%
                    </p>

                    <p className="text-xs text-muted-foreground">
                      assessment score
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your answer
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {answer}
                </p>
              </div>

              <div className="rounded-2xl border p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Feedback
                </p>

                <p className="mt-3 text-sm leading-7">
                  {evaluation.feedback}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />

                    <p className="text-sm font-semibold">
                      Concepts covered
                    </p>
                  </div>

                  {evaluation
                    .conceptsCovered
                    .length >
                  0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {evaluation.conceptsCovered.map(
                        (
                          concept
                        ) => (
                          <span
                            key={
                              concept
                            }
                            className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
                          >
                            {concept}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No specific concepts
                      detected.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />

                    <p className="text-sm font-semibold">
                      Missing concepts
                    </p>
                  </div>

                  {evaluation
                    .missingConcepts
                    .length >
                  0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {evaluation.missingConcepts.map(
                        (
                          concept
                        ) => (
                          <span
                            key={
                              concept
                            }
                            className="rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                          >
                            {concept}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      You covered the
                      important concepts.
                    </p>
                  )}
                </div>
              </div>

              {masteryUpdates.length >
                0 && (
                <div className="rounded-2xl border p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mastery updated
                  </p>

                  <div className="mt-4 space-y-3">
                    {masteryUpdates.map(
                      (
                        update
                      ) => (
                        <div
                          key={
                            update.conceptId
                          }
                          className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {
                                update.concept
                              }
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground capitalize">
                              {
                                update.trend
                              }
                            </p>
                          </div>

                          <p className="text-sm font-semibold">
                            {Math.round(
                              update.oldScore
                            )}
                            %
                            <span className="mx-2 text-muted-foreground">
                              →
                            </span>
                            {Math.round(
                              update.newScore
                            )}
                            %
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href={`/projects/${projectId}/mastery`}
                  className="rounded-xl border px-5 py-3 text-center text-sm font-medium"
                >
                  View mastery
                </Link>

                <button
                  type="button"
                  onClick={
                    createQuestion
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
                >
                  <Sparkles className="h-4 w-4" />
                  Try another question
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}