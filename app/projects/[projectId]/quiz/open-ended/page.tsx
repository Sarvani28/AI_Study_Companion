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
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
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

function getDifficultyClasses(
  difficulty: string | null,
) {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";

    case "hard":
      return "border-rose-100 bg-rose-50 text-rose-700";

    default:
      return "border-indigo-100 bg-indigo-50 text-indigo-700";
  }
}

function getDifficultyLabel(
  difficulty: string | null,
) {
  if (!difficulty) {
    return "Medium";
  }

  return (
    difficulty.charAt(0).toUpperCase() +
    difficulty.slice(1)
  );
}

function getScoreMessage(
  percentage: number,
) {
  if (percentage >= 90) {
    return {
      title: "Excellent understanding",
      description:
        "Your explanation demonstrates a strong grasp of the concept.",
    };
  }

  if (percentage >= 75) {
    return {
      title: "Strong progress",
      description:
        "You understand most of the concept. A little refinement can make your explanation even stronger.",
    };
  }

  if (percentage >= 60) {
    return {
      title: "Good foundation",
      description:
        "You have the basic idea. Review the missing concepts and try another explanation.",
    };
  }

  return {
    title: "Keep practicing",
    description:
      "This is a useful opportunity to strengthen your understanding before moving forward.",
  };
}

export default function OpenEndedQuizPage({
  params,
}: PageProps) {
  const { projectId } = use(params);

  const started = useRef(false);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [answer, setAnswer] =
    useState("");

  const [evaluation, setEvaluation] =
    useState<Evaluation | null>(null);

  const [masteryUpdates, setMasteryUpdates] =
    useState<MasteryUpdate[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;

    void createQuestion();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /*
   * ----------------------------------------------------------
   * CREATE QUESTION
   * ----------------------------------------------------------
   */

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
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not create assessment.",
        );
      }

      setSession(
        data.quizSession,
      );

      setQuestion(
        data.question,
      );

      setAnswer("");
      setEvaluation(null);
      setMasteryUpdates([]);
    } catch (err) {
      console.error(
        "Open-ended quiz error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not create assessment.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ----------------------------------------------------------
   * SUBMIT ANSWER
   * ----------------------------------------------------------
   */

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
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not evaluate answer.",
        );
      }

      setEvaluation(
        data.evaluation,
      );

      setMasteryUpdates(
        data.mastery ?? [],
      );
    } catch (err) {
      console.error(
        "Open-ended evaluation error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not evaluate answer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fc]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

          <div className="animate-pulse">
            <div className="h-4 w-28 rounded bg-gray-200" />

            <div className="mt-8 h-4 w-40 rounded bg-gray-200" />

            <div className="mt-3 h-10 w-80 rounded-xl bg-gray-200" />

            <div className="mt-3 h-5 w-[30rem] max-w-full rounded bg-gray-100" />

            <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="h-7 w-28 rounded-full bg-gray-100" />

              <div className="mt-7 h-8 w-4/5 rounded-lg bg-gray-100" />

              <div className="mt-8 h-56 rounded-2xl bg-gray-100" />

              <div className="mt-6 ml-auto h-11 w-36 rounded-xl bg-gray-100" />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />

            Preparing your assessment...
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------------------------
   * ERROR
   * ----------------------------------------------------------
   */

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8fc]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

          <Link
            href={`/projects/${projectId}/quiz`}
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />

            Back to quiz
          </Link>

          <div className="mt-10 overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
            <div className="p-8 sm:p-10">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <CircleHelp className="h-6 w-6" />
              </div>

              <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-950">
                Assessment unavailable
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                {error}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void createQuestion()
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  <RotateCcw className="h-4 w-4" />

                  Try again
                </button>

                <Link
                  href={`/projects/${projectId}/materials`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4" />

                  Check materials
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------------------------
   * SAFETY
   * ----------------------------------------------------------
   */

  if (!question || !session) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * EVALUATION STATE
   * ----------------------------------------------------------
   */

  const scoreMessage =
    evaluation
      ? getScoreMessage(
          evaluation.percentage,
        )
      : null;

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header>
          <Link
            href={`/projects/${projectId}/quiz`}
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />

            Back to quiz
          </Link>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />

                AI Open-ended Assessment
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                {session.projectName}
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                Explain what you know
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Explain the concept in your own words.
                Your response will be evaluated against
                the knowledge in your learning project.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
              <Zap className="h-4 w-4 text-indigo-600" />

              <span className="text-xs font-semibold text-gray-600">
                Written response
              </span>
            </div>
          </div>

          {/* Assessment guidance */}

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Sparkles className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700">
                  Explain
                </p>

                <p className="text-[11px] text-gray-400">
                  Use your own words
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700">
                  Evaluate
                </p>

                <p className="text-[11px] text-gray-400">
                  Get AI feedback
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Target className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700">
                  Improve
                </p>

                <p className="text-[11px] text-gray-400">
                  Update your mastery
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* =====================================================
            MAIN CARD
        ====================================================== */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

          {/* Question */}

          <div className="border-b border-gray-100 px-6 py-7 sm:px-8 sm:py-8">

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <Target className="h-3.5 w-3.5" />

                Open ended
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getDifficultyClasses(
                  question.difficulty,
                )}`}
              >
                {getDifficultyLabel(
                  question.difficulty,
                )}
              </span>
            </div>

            <div className="mt-6 flex items-start gap-4">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-sm font-semibold text-white sm:flex">
                Q
              </div>

              <h2 className="max-w-3xl text-xl font-semibold leading-8 tracking-tight text-gray-950 sm:text-2xl sm:leading-9">
                {question.question}
              </h2>
            </div>
          </div>

          {/* ===================================================
              ANSWER AREA
          ==================================================== */}

          {!evaluation ? (
            <div className="px-6 py-7 sm:px-8 sm:py-8">

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="answer"
                    className="text-sm font-semibold text-gray-950"
                  >
                    Your explanation
                  </label>

                  <span className="text-xs font-medium text-gray-400">
                    {answer.length.toLocaleString()}
                    /8,000
                  </span>
                </div>

                <div className="relative mt-3">
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(event) => {
                      const value =
                        event.target.value.slice(
                          0,
                          8000,
                        );

                      setAnswer(value);
                    }}
                    placeholder="Start explaining the concept in your own words..."
                    rows={10}
                    disabled={submitting}
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-sm leading-7 text-gray-800 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {!answer && (
                    <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-2 text-xs text-gray-400">
                      <Sparkles className="h-3.5 w-3.5" />

                      Think through the idea before
                      writing your answer.
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Focus on reasoning, key ideas,
                    and relationships between concepts.
                  </span>

                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />

                    Your response is evaluated against
                    your project knowledge.
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock3 className="h-3.5 w-3.5" />

                  Take your time. Accuracy matters more
                  than speed.
                </div>

                <button
                  type="button"
                  disabled={
                    !answer.trim() ||
                    submitting
                  }
                  onClick={
                    submitAnswer
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Evaluating...
                    </>
                  ) : (
                    <>
                      Evaluate my answer

                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* =================================================
               RESULTS
            ================================================== */

            <div className="px-6 py-7 sm:px-8 sm:py-8">

              {/* Score hero */}

              <div
                className={[
                  "relative overflow-hidden rounded-2xl border p-6 sm:p-7",
                  evaluation.correct
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-amber-200 bg-amber-50/70",
                ].join(" ")}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/50 blur-3xl"
                />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-start gap-4">
                    <div
                      className={[
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                        evaluation.correct
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600",
                      ].join(" ")}
                    >
                      {evaluation.correct ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Target className="h-6 w-6" />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Assessment result
                      </p>

                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                        {scoreMessage?.title}
                      </h3>

                      <p className="mt-1 max-w-xl text-sm leading-6 text-gray-600">
                        {scoreMessage?.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="text-5xl font-semibold tracking-[-0.05em] text-gray-950">
                      {evaluation.percentage}%
                    </p>

                    <p className="mt-1 text-xs font-medium text-gray-400">
                      Assessment score
                    </p>
                  </div>
                </div>
              </div>

              {/* Your answer */}

              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Your response
                  </p>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {answer}
                </p>
              </div>

              {/* AI feedback */}

              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Sparkles className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                      AI feedback
                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-gray-950">
                      Understanding
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-gray-600">
                  {evaluation.understanding}
                </p>

                <div className="mt-5 rounded-xl bg-gray-50 px-4 py-4">
                  <p className="text-xs font-semibold text-gray-500">
                    Detailed feedback
                  </p>

                  <p className="mt-2 text-sm leading-7 text-gray-700">
                    {evaluation.feedback}
                  </p>
                </div>
              </div>

              {/* Concepts */}

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                {/* Covered */}

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                        Covered
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-gray-950">
                        Concepts you explained
                      </p>
                    </div>
                  </div>

                  {evaluation
                    .conceptsCovered
                    .length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {evaluation.conceptsCovered.map(
                        (concept) => (
                          <span
                            key={concept}
                            className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700"
                          >
                            {concept}
                          </span>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      No specific concepts were
                      identified.
                    </p>
                  )}
                </div>

                {/* Missing */}

                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Target className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-600">
                        Strengthen
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-gray-950">
                        Concepts to review
                      </p>
                    </div>
                  </div>

                  {evaluation
                    .missingConcepts
                    .length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {evaluation.missingConcepts.map(
                        (concept) => (
                          <span
                            key={concept}
                            className="rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-medium text-amber-700"
                          >
                            {concept}
                          </span>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      You covered the important
                      concepts in this response.
                    </p>
                  )}
                </div>
              </div>

              {/* Mastery updates */}

              {masteryUpdates.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        Learning progress
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-gray-950">
                        Mastery updated
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {masteryUpdates.map(
                      (update) => {
                        const newScore =
                          Math.min(
                            100,
                            Math.max(
                              0,
                              update.newScore,
                            ),
                          );

                        return (
                          <div
                            key={
                              update.conceptId
                            }
                            className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">
                                  {
                                    update.concept
                                  }
                                </p>

                                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium capitalize text-gray-400">
                                  <TrendingUp className="h-3.5 w-3.5" />

                                  {
                                    update.trend
                                  }
                                </p>
                              </div>

                              <p className="shrink-0 text-sm font-semibold text-gray-950">
                                {Math.round(
                                  update.oldScore,
                                )}
                                %

                                <span className="mx-2 text-gray-300">
                                  →
                                </span>

                                <span className="text-indigo-600">
                                  {Math.round(
                                    update.newScore,
                                  )}
                                  %
                                </span>
                              </p>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                                style={{
                                  width: `${newScore}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : null}

              {/* Actions */}

              <div className="mt-7 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
                <Link
                  href={`/projects/${projectId}/mastery`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Target className="h-4 w-4" />

                  View mastery
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    void createQuestion()
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  <Sparkles className="h-4 w-4" />

                  Try another question
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-gray-400">
          <Sparkles className="h-3.5 w-3.5" />

          Your answers help build a more accurate picture
          of your learning progress.
        </div>
      </div>
    </main>
  );
}