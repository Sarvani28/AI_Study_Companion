"use client";

import {
  use,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

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

function difficultyLabel(
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

function difficultyClasses(
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

function getLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function getScoreMessage(score: number) {
  if (score >= 90) {
    return {
      title: "Excellent work",
      description:
        "You demonstrated strong understanding across this quiz.",
    };
  }

  if (score >= 75) {
    return {
      title: "Great progress",
      description:
        "You have a solid understanding with a few areas to strengthen.",
    };
  }

  if (score >= 60) {
    return {
      title: "Good foundation",
      description:
        "You are making progress. A little more practice can strengthen your mastery.",
    };
  }

  return {
    title: "Keep building",
    description:
      "Use the feedback from this quiz to focus your next learning session.",
  };
}

export default function QuizPage({
  params,
}: QuizPageProps) {
  const { projectId } = use(params);

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

  /*
   * ----------------------------------------------------------
   * START QUIZ
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    void startQuiz();

    return () => {
      abortControllerRef.current?.abort();
    };

    // Intentionally start only once per project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function startQuiz() {
    if (starting) {
      return;
    }

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
          signal: controller.signal,
          cache: "no-store",
        },
      );

      if (!response.ok) {
        let data: {
          error?: string;
        } = {};

        try {
          data = await response.json();
        } catch {
          // Ignore malformed JSON.
        }

        throw new Error(
          data.error ??
            `Quiz creation failed (${response.status}).`,
        );
      }

      const data =
        await response.json();

      if (
        !data.quizSession ||
        !Array.isArray(data.questions)
      ) {
        throw new Error(
          "Quiz API returned an invalid response.",
        );
      }

      if (data.questions.length === 0) {
        throw new Error(
          "No quiz questions were generated from your learning materials.",
        );
      }

      setSession(data.quizSession);
      setQuestions(data.questions);

      setCurrentIndex(0);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setMasteryResult(null);

      setProgress({
        answered: 0,
        total: data.questions.length,
        complete: false,
        score: null,
      });
    } catch (err) {
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
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not start quiz.",
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

  /*
   * ----------------------------------------------------------
   * SUBMIT ANSWER
   * ----------------------------------------------------------
   */

  async function submitAnswer() {
    const currentQuestion =
      questions[currentIndex];

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
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not submit answer.",
        );
      }

      setAnswerResult(
        data.answer,
      );

      setMasteryResult(
        data.mastery ?? null,
      );

      setProgress(
        data.progress,
      );
    } catch (err) {
      console.error(
        "Quiz answer error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not submit answer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ----------------------------------------------------------
   * NEXT QUESTION
   * ----------------------------------------------------------
   */

  function nextQuestion() {
    if (
      currentIndex >=
      questions.length - 1
    ) {
      setProgress(
        (previous) =>
          previous
            ? {
                ...previous,
                complete: true,
              }
            : previous,
      );

      return;
    }

    setCurrentIndex(
      (previous) =>
        previous + 1,
    );

    setSelectedAnswer(null);
    setAnswerResult(null);
    setMasteryResult(null);
  }

  /*
   * ----------------------------------------------------------
   * RESTART
   * ----------------------------------------------------------
   */

  function restartQuiz() {
    startedRef.current = false;

    setSession(null);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setMasteryResult(null);
    setProgress(null);
    setError(null);

    startedRef.current = true;

    void startQuiz();
  }

  const currentQuestion =
    questions[currentIndex];

  const isComplete =
    progress?.complete === true;

  const questionNumber =
    currentIndex + 1;

  const totalQuestions =
    questions.length;

  const progressPercent =
    totalQuestions > 0
      ? (questionNumber /
          totalQuestions) *
        100
      : 0;

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f7f8fc]">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-28 rounded bg-gray-200" />

              <div className="h-10 w-72 rounded-xl bg-gray-200" />

              <div className="h-5 w-96 max-w-full rounded bg-gray-100" />

              <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white p-8">
                <div className="h-7 w-24 rounded-full bg-gray-100" />

                <div className="mt-8 h-8 w-3/4 rounded-lg bg-gray-100" />

                <div className="mt-8 space-y-3">
                  {Array.from({
                    length: 4,
                  }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 rounded-2xl bg-gray-100"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  /*
   * ----------------------------------------------------------
   * ERROR
   * ----------------------------------------------------------
   */

  if (error) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f7f8fc]">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
            >
              <ArrowLeft className="h-4 w-4" />

              Back to project
            </Link>

            <div className="mt-10 overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
              <div className="p-8 sm:p-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <CircleHelp className="h-6 w-6" />
                </div>

                <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-950">
                  Quiz could not be created
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                  {error}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      startedRef.current =
                        false;

                      void startQuiz();
                    }}
                    disabled={starting}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}

                    Try again
                  </button>

                  <Link
                    href={`/projects/${projectId}/materials`}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Check materials
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  /*
   * ----------------------------------------------------------
   * EMPTY
   * ----------------------------------------------------------
   */

  if (!currentQuestion || !session) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f7f8fc]">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-950"
            >
              <ArrowLeft className="h-4 w-4" />

              Back to project
            </Link>

            <div className="mt-10 rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CircleHelp className="h-7 w-7" />
              </div>

              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
                No quiz questions available
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Upload and process learning
                materials before starting a quiz.
              </p>

              <Link
                href={`/projects/${projectId}/materials`}
                className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600"
              >
                View materials
              </Link>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  /*
   * ----------------------------------------------------------
   * COMPLETED
   * ----------------------------------------------------------
   */

  if (isComplete) {
    const score =
      progress?.score ?? 0;

    const scoreMessage =
      getScoreMessage(score);

    return (
      <AppShell>
        <main className="min-h-screen bg-[#f7f8fc]">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
            >
              <ArrowLeft className="h-4 w-4" />

              Back to project
            </Link>

            <div className="relative mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-violet-100/50 blur-3xl"
              />

              <div className="relative p-8 text-center sm:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Trophy className="h-7 w-7" />
                </div>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Quiz completed
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                  {scoreMessage.title}
                </h1>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
                  {scoreMessage.description}
                </p>

                <div className="mt-9">
                  <p className="text-7xl font-semibold tracking-[-0.06em] text-gray-950">
                    {score}%
                  </p>

                  <p className="mt-2 text-sm font-medium text-gray-400">
                    Final score
                  </p>
                </div>

                <div className="mx-auto mt-9 grid max-w-xl gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                    <p className="text-2xl font-semibold text-gray-950">
                      {progress?.answered ??
                        0}
                    </p>

                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Questions answered
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                    <p className="text-2xl font-semibold text-gray-950">
                      {progress?.total ??
                        questions.length}
                    </p>

                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Total questions
                    </p>
                  </div>
                </div>

                <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={restartQuiz}
                    disabled={starting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}

                    Take another quiz
                  </button>

                  <Link
                    href={`/projects/${projectId}/mastery`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Target className="h-4 w-4" />

                    View mastery
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  /*
   * ----------------------------------------------------------
   * QUIZ
   * ----------------------------------------------------------
   */

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f7f8fc]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

          {/* HEADER */}

          <header>
            <Link
              href={`/projects/${projectId}`}
              className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />

              Back to project
            </Link>

            <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />

                  AI Practice
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  {session.projectName}
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                  Knowledge check
                </h1>

                {session.learningGoal ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    {session.learningGoal}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    Test your understanding and strengthen
                    your mastery.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
                <Zap className="h-4 w-4 text-indigo-600" />

                <span className="text-sm font-semibold text-gray-700">
                  {progress?.answered ?? 0}
                  /
                  {totalQuestions}
                </span>

                <span className="text-xs text-gray-400">
                  answered
                </span>
              </div>
            </div>

            {/* MODE SWITCH */}

            <div className="mt-7 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <Link
                href={`/projects/${projectId}/quiz`}
                className="rounded-lg bg-gray-950 px-4 py-2 text-xs font-semibold text-white"
              >
                Multiple choice
              </Link>

              <Link
                href={`/projects/${projectId}/quiz/open-ended`}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
              >
                Open-ended
              </Link>
            </div>
          </header>

          {/* PROGRESS */}

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-950">
                  Question {questionNumber}
                  <span className="font-normal text-gray-400">
                    {" "}
                    of {totalQuestions}
                  </span>
                </p>
              </div>

              <p className="text-xs font-medium text-gray-400">
                {Math.round(progressPercent)}%
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </section>

          {/* QUESTION CARD */}

          <section className="mt-7 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

            {/* Question header */}

            <div className="border-b border-gray-100 px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${difficultyClasses(
                    currentQuestion.difficulty,
                  )}`}
                >
                  {difficultyLabel(
                    currentQuestion.difficulty,
                  )}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
                  <CircleHelp className="h-3.5 w-3.5" />

                  Multiple choice
                </span>
              </div>

              <h2 className="mt-6 max-w-3xl text-xl font-semibold leading-8 tracking-tight text-gray-950 sm:text-2xl sm:leading-9">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Answers */}

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="space-y-3">
                {(
                  currentQuestion.options ??
                  []
                ).map(
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
                            option,
                          )
                        }
                        className={[
                          "group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                          !submitted &&
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 shadow-sm"
                            : "",
                          !submitted &&
                          !isSelected
                            ? "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                            : "",
                          isCorrectSelection
                            ? "border-emerald-300 bg-emerald-50"
                            : "",
                          isWrongSelection
                            ? "border-red-300 bg-red-50"
                            : "",
                          submitted &&
                          !isSelected
                            ? "cursor-default"
                            : "",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition",
                            isSelected &&
                            !submitted
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "",
                            !isSelected &&
                            !submitted
                              ? "border-gray-200 bg-gray-50 text-gray-500 group-hover:border-gray-300 group-hover:bg-white"
                              : "",
                            isCorrectSelection
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "",
                            isWrongSelection
                              ? "border-red-600 bg-red-600 text-white"
                              : "",
                          ].join(" ")}
                        >
                          {getLetter(index)}
                        </span>

                        <span className="flex-1 text-sm font-medium leading-6 text-gray-700">
                          {option}
                        </span>

                        {isCorrectSelection ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        ) : null}

                        {isWrongSelection ? (
                          <X className="h-5 w-5 shrink-0 text-red-600" />
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>

              {/* Submit */}

              {!answerResult ? (
                <div className="mt-8 flex items-center justify-between gap-4 border-t border-gray-100 pt-6">
                  <p className="hidden text-xs text-gray-400 sm:block">
                    Select an answer before submitting.
                  </p>

                  <button
                    type="button"
                    disabled={
                      !selectedAnswer ||
                      submitting
                    }
                    onClick={
                      submitAnswer
                    }
                    className="ml-auto inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Checking...
                      </>
                    ) : (
                      <>
                        Submit answer

                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {/* FEEDBACK */}

              {answerResult ? (
                <div className="mt-8 border-t border-gray-100 pt-7">

                  {/* Result */}

                  <div
                    className={[
                      "rounded-2xl border p-5",
                      answerResult.isCorrect
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          answerResult.isCorrect
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600",
                        ].join(" ")}
                      >
                        {answerResult.isCorrect ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <p
                          className={[
                            "font-semibold",
                            answerResult.isCorrect
                              ? "text-emerald-800"
                              : "text-red-800",
                          ].join(" ")}
                        >
                          {answerResult.isCorrect
                            ? "Correct answer"
                            : "Not quite"}
                        </p>

                        <p
                          className={[
                            "mt-1 text-sm leading-6",
                            answerResult.isCorrect
                              ? "text-emerald-700"
                              : "text-red-700",
                          ].join(" ")}
                        >
                          {answerResult.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mastery */}

                  {masteryResult ? (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Target className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Mastery update
                            </p>

                            <p className="mt-1 text-sm font-semibold text-gray-950">
                              Your concept progress
                            </p>
                          </div>
                        </div>

                        <p className="text-lg font-semibold text-gray-950">
                          {Math.round(
                            masteryResult.oldScore,
                          )}
                          %
                          <span className="mx-2 text-gray-300">
                            →
                          </span>
                          <span className="text-indigo-600">
                            {Math.round(
                              masteryResult.newScore,
                            )}
                            %
                          </span>
                        </p>
                      </div>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                masteryResult.newScore,
                              ),
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          Previous mastery
                        </span>

                        <span className="font-semibold capitalize text-gray-600">
                          {masteryResult.trend}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Next */}

                  <div className="mt-6 flex justify-end">
                    {currentIndex <
                    questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={
                          nextQuestion
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                      >
                        Next question

                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          nextQuestion
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                      >
                        View results

                        <Trophy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* FOOTER HELP */}

          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center sm:flex-row">
            <Clock3 className="h-3.5 w-3.5 text-gray-400" />

            <p className="text-xs text-gray-400">
              Take your time. Focus on understanding
              rather than speed.
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}