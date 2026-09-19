"use client";

import {
  use,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  BookOpen,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type Citation = {
  sourceId: string;
  materialId: string;
  filename: string;
  pageNumber: number | null;
  chunkId: string;
};

type TutorResponse = {
  answer: string;
  citations: Citation[];
  grounded: boolean;
};

export default function TutorPage({
  params,
}: PageProps) {
  const { projectId } = use(params);

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState<TutorResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function askTutor() {
    const trimmed =
      question.trim();

    if (!trimmed || loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAnswer(null);

      const response =
        await fetch(
          "/api/tutor",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              projectId,
              question:
                trimmed,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Tutor request failed.",
        );
      }

      setAnswer(data);

      setQuestion("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to ask tutor.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}

        <div className="border-b border-gray-200 pb-7">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to project
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
                AI Tutor
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Ask questions using your project's
                uploaded materials.
              </p>
            </div>
          </div>
        </div>

        {/* Question */}

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="question"
            className="text-sm font-semibold text-gray-950"
          >
            What would you like to understand?
          </label>

          <textarea
            id="question"
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" &&
                (event.metaKey ||
                  event.ctrlKey)
              ) {
                event.preventDefault();

                askTutor();
              }
            }}
            placeholder="Explain retrieval augmented generation..."
            rows={5}
            className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Answers are grounded in this project's
              materials.
            </p>

            <button
              type="button"
              onClick={askTutor}
              disabled={
                loading ||
                !question.trim()
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Thinking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />

                  Ask Tutor
                </>
              )}
            </button>
          </div>
        </section>

        {/* Error */}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Answer */}

        {answer ? (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <BookOpen className="h-4 w-4 text-indigo-600" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-950">
                  Tutor answer
                </h2>

                <p className="text-xs text-gray-400">
                  {answer.grounded
                    ? "Grounded in project materials"
                    : "Insufficient evidence"}
                </p>
              </div>
            </div>

            <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {answer.answer}
            </div>

            {answer.citations.length >
            0 ? (
              <div className="mt-8 border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-950">
                  Sources
                </h3>

                <div className="mt-3 space-y-2">
                  {answer.citations.map(
                    (citation) => (
                      <div
                        key={
                          citation.chunkId
                        }
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <p className="text-xs font-semibold text-gray-900">
                          {
                            citation.sourceId
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {
                            citation.filename
                          }

                          {citation.pageNumber
                            ? ` · Page ${citation.pageNumber}`
                            : ""}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}