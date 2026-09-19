"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Loader2,
  Trophy,
  X,
} from "lucide-react";

type QuizPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type QuizQuestion = {
  id: string;
  question: string;
  question_type: string;
  difficulty: string | null;
  options: string[] | null;
  concept_id: string | null;
};

type QuizSession = {
  id: string;
  projectId: string;
  projectName: string;
  learningGoal: string | null;
  status: string;
};

type AnswerResult = {
  id: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  explanation: string;
};

type MasteryResult = {
  oldScore: number;
  newScore: number;
  confidence: number;
  trend: string;
};

type QuizProgress = {
  answered: number;
  total: number;
  complete: boolean;
  score: number | null;
};

export default function QuizPage({
  params,
}: QuizPageProps) {
  const { projectId } = use(params);

  /*
   * IMPORTANT:
   * Prevent React Strict Mode from creating
   * two quizzes during development.
   */
  const startedRef = useRef(false);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [session, setSession] =
    useState<QuizSession | null>(null);

  const [questions, setQuestions] =
    useState<QuizQuestion[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState<string | null>(null);

  const [answerResult, setAnswerResult] =
    useState<AnswerResult | null>(null);

  const [masteryResult, setMasteryResult] =
    useState<MasteryResult | null>(null);

  const [progress, setProgress] =
    useState<QuizProgress | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    startQuiz();

    return () => {
      abortControllerRef.current?.abort();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function startQuiz() {
    /*
     * Never start two quiz requests.
     */
    if (starting) {
      return;
    }

    /*
     * Cancel any previous request.
     */
    abortControllerRef.current?.abort();

    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    try {
      setStarting(true);
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/quiz",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId,
          }),
          signal:
            controller.signal,
          cache: "no-store",
        }
      );

      if (!response.ok) {
        let data: {
          error?: string;
        } = {};

        try {
          data = await response.json();
        } catch {
          // Ignore JSON parsing error.
        }

        throw new Error(
          data.error ??
            `Quiz creation failed (${response.status}).`
        );
      }

      const data =
        await response.json();

      if (
        !data.quizSession ||
        !Array.isArray(
          data.questions
        )
      ) {
        throw new Error(
          "Quiz API returned an invalid response."
        );
      }

      if (
        data.questions.length === 0
      ) {
        throw new Error(
          "No quiz questions were generated from your learning materials."
        );
      }

      setSession(
        data.quizSession
      );

      setQuestions(
        data.questions
      );

      setCurrentIndex(0);

      setSelectedAnswer(null);

      setAnswerResult(null);

      setMasteryResult(null);

      setProgress({
        answered: 0,
        total:
          data.questions.length,
        complete: false,
        score: null,
      });
    } catch (err) {
      /*
       * Abort is expected when the component
       * is unmounted.
       */
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        return;
      }

      if (
        err instanceof Error &&
        err.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Quiz page error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not start quiz."
      );
    } finally {
      if (
        abortControllerRef.current ===
        controller
      ) {
        abortControllerRef.current =
          null;
      }

      setStarting(false);
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (
      !session ||
      !currentQuestion ||
      !selectedAnswer ||
      submitting ||
      answerResult
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response =
        await fetch(
          "/api/quiz/answer",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              quizSessionId:
                session.id,
              questionId:
                currentQuestion.id,
              answer:
                selectedAnswer,
            }),
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not submit answer."
        );
      }

      setAnswerResult(
        data.answer
      );

      setMasteryResult(
        data.mastery ?? null
      );

      setProgress(
        data.progress
      );
    } catch (err) {
      console.error(
        "Quiz answer error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not submit answer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (
      currentIndex >=
      questions.length - 1
    ) {
      return;
    }

    setCurrentIndex(
      (previous) =>
        previous + 1
    );

    setSelectedAnswer(null);
    setAnswerResult(null);
    setMasteryResult(null);
  }

  const currentQuestion =
    questions[currentIndex];

  const isComplete =
    progress?.complete === true;

  const progressPercent =
    questions.length > 0
      ? ((currentIndex + 1) /
          questions.length) *
        100
      : 0;

  /*
   * ----------------------------------------
   * Loading
   * ----------------------------------------
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-24 rounded bg-muted" />

            <div className="h-10 w-72 rounded bg-muted" />

            <div className="h-4 w-56 rounded bg-muted" />

            <div className="rounded-3xl border p-8">
              <div className="h-5 w-32 rounded bg-muted" />

              <div className="mt-6 h-8 w-3/4 rounded bg-muted" />

              <div className="mt-8 space-y-3">
                <div className="h-16 rounded-2xl bg-muted" />
                <div className="h-16 rounded-2xl bg-muted" />
                <div className="h-16 rounded-2xl bg-muted" />
                <div className="h-16 rounded-2xl bg-muted" />
              </div>

              <div className="mt-8 flex justify-end">
                <div className="h-11 w-32 rounded-xl bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------
   * Error
   * ----------------------------------------
   */

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>

          <div className="mt-10 rounded-3xl border border-destructive/30 bg-destructive/5 p-8">
            <div className="flex items-start gap-3">
              <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

              <div>
                <h1 className="font-semibold">
                  Quiz could not be created
                </h1>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                startedRef.current =
                  false;

                startQuiz();
              }}
              disabled={starting}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------
   * No questions
   * ----------------------------------------
   */

  if (!currentQuestion || !session) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>

          <div className="mt-10 rounded-3xl border p-10 text-center">
            <CircleHelp className="mx-auto h-8 w-8 text-muted-foreground" />

            <h1 className="mt-4 text-xl font-semibold">
              No quiz questions available
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Upload and process learning
              materials before starting a
              quiz.
            </p>

            <Link
              href={`/projects/${projectId}/materials`}
              className="mt-6 inline-flex rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
            >
              View materials
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------
   * Completed
   * ----------------------------------------
   */

  if (isComplete) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>

          <div className="mt-10 rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-muted">
              <Trophy className="h-6 w-6" />
            </div>

            <p className="mt-6 text-sm font-medium text-muted-foreground">
              Quiz completed
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {session.projectName}
            </h1>

            <div className="mt-8">
              <p className="text-6xl font-semibold tracking-tight">
                {progress?.score ??
                  0}
                %
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Final score
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-5">
                <p className="text-2xl font-semibold">
                  {progress?.answered ??
                    0}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Questions answered
                </p>
              </div>

              <div className="rounded-2xl border p-5">
                <p className="text-2xl font-semibold">
                  {progress?.total ??
                    questions.length}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Total questions
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  startedRef.current =
                    false;

                  setSession(null);
                  setQuestions([]);
                  setProgress(null);
                  setCurrentIndex(0);
                  setError(null);

                  startQuiz();
                }}
                disabled={starting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {starting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Take another quiz
              </button>

              <Link
                href={`/projects/${projectId}/mastery`}
                className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-medium transition hover:bg-muted"
              >
                View mastery
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------
   * Quiz
   * ----------------------------------------
   */

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>

          <header className="mt-8">
            <p className="text-sm font-medium text-muted-foreground">
              Quiz
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {session.projectName}
            </h1>

            {session.learningGoal && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {session.learningGoal}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Link
                href={`/projects/${projectId}/quiz`}
                className="rounded-xl border px-5 py-3 text-sm font-medium transition hover:bg-muted"
              >
                Multiple choice
              </Link>

              <Link
                href={`/projects/${projectId}/quiz/open-ended`}
                className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
              >
                Open-ended test
              </Link>
            </div>
          </header>
        
        </header>

        <div className="mt-10">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Question{" "}
              {currentIndex + 1} of{" "}
              {questions.length}
            </span>

            <span className="text-muted-foreground">
              {progress?.answered ??
                0}{" "}
              answered
            </span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>

        <section className="mt-8 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
            {currentQuestion.difficulty ??
              "medium"}
          </span>

          <h2 className="mt-6 text-xl font-semibold leading-8 tracking-tight sm:text-2xl">
            {currentQuestion.question}
          </h2>

          <div className="mt-8 space-y-3">
            {(currentQuestion.options ??
              []).map(
              (option, index) => {
                const isSelected =
                  selectedAnswer ===
                  option;

                const submitted =
                  answerResult !==
                  null;

                const isCorrectSelection =
                  submitted &&
                  isSelected &&
                  answerResult.isCorrect;

                const isWrongSelection =
                  submitted &&
                  isSelected &&
                  !answerResult.isCorrect;

                return (
                  <button
                    key={`${currentQuestion.id}-${option}`}
                    type="button"
                    disabled={
                      submitted ||
                      submitting
                    }
                    onClick={() =>
                      setSelectedAnswer(
                        option
                      )
                    }
                    className={[
                      "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      !submitted &&
                      isSelected
                        ? "border-foreground bg-muted"
                        : "",
                      !submitted &&
                      !isSelected
                        ? "hover:bg-muted/60"
                        : "",
                      isCorrectSelection
                        ? "border-green-500/40 bg-green-500/5"
                        : "",
                      isWrongSelection
                        ? "border-destructive/40 bg-destructive/5"
                        : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                        isSelected &&
                        !submitted
                          ? "border-foreground bg-foreground text-background"
                          : "",
                      ].join(" ")}
                    >
                      {String.fromCharCode(
                        65 + index
                      )}
                    </span>

                    <span className="flex-1 text-sm leading-6">
                      {option}
                    </span>

                    {isCorrectSelection && (
                      <Check className="h-5 w-5 shrink-0 text-green-600" />
                    )}

                    {isWrongSelection && (
                      <X className="h-5 w-5 shrink-0 text-destructive" />
                    )}
                  </button>
                );
              }
            )}
          </div>

          {!answerResult && (
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                disabled={
                  !selectedAnswer ||
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

                Submit answer
              </button>
            </div>
          )}

          {answerResult && (
            <div className="mt-8">
              <div
                className={[
                  "rounded-2xl border p-5",
                  answerResult.isCorrect
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-destructive/30 bg-destructive/5",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  {answerResult.isCorrect ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-destructive" />
                  )}

                  <p className="font-semibold">
                    {answerResult.isCorrect
                      ? "Correct"
                      : "Incorrect"}
                  </p>
                </div>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {answerResult.explanation}
                </p>
              </div>

              {masteryResult && (
                <div className="mt-4 rounded-2xl border p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Mastery
                      </p>

                      <p className="mt-1 font-semibold">
                        Concept mastery
                      </p>
                    </div>

                    <p className="text-lg font-semibold">
                      {Math.round(
                        masteryResult.oldScore
                      )}
                      %
                      <span className="mx-2 text-muted-foreground">
                        →
                      </span>
                      {Math.round(
                        masteryResult.newScore
                      )}
                      %
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          masteryResult.newScore
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs capitalize text-muted-foreground">
                    Trend:{" "}
                    {masteryResult.trend}
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                {currentIndex <
                questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={
                      nextQuestion
                    }
                    className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
                  >
                    Next question
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProgress(
                        (previous) =>
                          previous
                            ? {
                                ...previous,
                                complete:
                                  true,
                              }
                            : previous
                      );
                    }}
                    className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
                  >
                    View results
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}