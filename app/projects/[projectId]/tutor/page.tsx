"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Lightbulb,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

type TutorCitation = {
  materialId: string;
  materialName: string;
  pageNumber: number | null;
  quote: string;
};

type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: TutorCitation[];
  grounded?: boolean;
  insufficientEvidence?: boolean;
};

type TutorResponse = {
  answer: string;
  grounded: boolean;
  insufficientEvidence: boolean;
  citations: TutorCitation[];
  conversationId?: string;
};

type TutorPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

const quickActions = [
  {
    label: "Explain simply",
    icon: Lightbulb,
    prompt:
      "Explain this topic simply, as if you were teaching a beginner. Use only my uploaded study materials.",
  },
  {
    label: "Give an example",
    icon: BookOpen,
    prompt:
      "Give me a clear example that helps me understand this topic. Use only my uploaded study materials.",
  },
  {
    label: "Test me",
    icon: Target,
    prompt:
      "Test my understanding of this topic with a short question based only on my uploaded study materials.",
  },
  {
    label: "Revision guidance",
    icon: Sparkles,
    prompt:
      "Give me revision guidance for this topic based only on my uploaded study materials. Focus on what I should understand and remember.",
  },
];

function FormattedAnswer({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

function CitationCard({ citation }: { citation: TutorCitation }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <FileText className="h-4 w-4 text-slate-600" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {citation.materialName}
          </p>

          {citation.pageNumber !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Page {citation.pageNumber}
            </p>
          )}

          {citation.quote && (
            <p className="mt-3 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-500">
              “{citation.quote}”
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TutorPage({ params }: TutorPageProps) {
  const { projectId } = use(params);

  const [projectName, setProjectName] = useState("AI Tutor");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadProject() {
      try {
        setIsProjectLoading(true);

        const response = await fetch(`/api/projects/${projectId}`);

        if (!response.ok) {
          throw new Error("Failed to load project.");
        }

        const data = await response.json();

        if (data.project?.name) {
          setProjectName(data.project.name);
        }
      } catch {
        // Keep the page usable even if the project endpoint
        // is not available yet.
        setProjectName("AI Tutor");
      } finally {
        setIsProjectLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  function submitQuestion(text: string) {
    const trimmedQuestion = text.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    setQuestion("");
    setError(null);
    setIsLoading(true);

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);

    void sendQuestion(trimmedQuestion);
  }

  async function sendQuestion(text: string) {
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          question: text,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Something went wrong while asking the tutor."
        );
      }

      const tutorResponse = data as TutorResponse;

      if (tutorResponse.conversationId) {
        setConversationId(tutorResponse.conversationId);
      }

      const assistantMessage: TutorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: tutorResponse.answer,
        citations: tutorResponse.citations ?? [],
        grounded: tutorResponse.grounded,
        insufficientEvidence: tutorResponse.insufficientEvidence,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while asking the tutor.";

      setError(message);
    } finally {
      setIsLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(question);
  }

  function handleTextareaKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(question);
    }
  }

  function handleQuickAction(prompt: string) {
    submitQuestion(prompt);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/projects/${projectId}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Back to project"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>

                  <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                    AI Tutor
                  </h1>
                </div>

                <p className="mt-1 truncate pl-10 text-xs text-slate-500">
                  {isProjectLoading ? "Loading project..." : projectName}
                </p>
              </div>
            </div>

            <Link
              href={`/projects/${projectId}/materials`}
              className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:flex"
            >
              <FileText className="h-4 w-4" />
              Materials
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex-1 py-8">
          {/* Intro */}
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <Sparkles className="h-5 w-5 text-slate-700" />
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
                  Learn from your materials
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  Ask questions about your project. The tutor uses your
                  uploaded study materials and provides sources when there is
                  enough evidence.
                </p>
              </div>

              {/* Quick actions */}
              <div className="mt-8">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Quick actions
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => handleQuickAction(action.prompt)}
                        disabled={isLoading}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition group-hover:bg-slate-200">
                          <Icon className="h-4 w-4 text-slate-600" />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {action.label}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            Ask the tutor
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Empty state hint */}
              <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white/60 p-5">
                <div className="flex gap-3">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Ask questions about your knowledge base
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      For example: “Explain retrieval augmented generation”
                      or “What are the main components of the architecture?”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversation */}
          {messages.length > 0 && (
            <div className="mx-auto max-w-3xl space-y-8">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={isUser ? "flex justify-end" : "flex gap-3"}
                  >
                    {!isUser && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}

                    <div
                      className={
                        isUser
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
                          : "min-w-0 flex-1"
                      }
                    >
                      {isUser ? (
                        <p>{message.content}</p>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              AI Tutor
                            </span>

                            {message.grounded &&
                              !message.insufficientEvidence && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Grounded
                                </span>
                              )}
                          </div>

                          <FormattedAnswer content={message.content} />

                          {/* Insufficient evidence */}
                          {message.insufficientEvidence && (
                            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                              <div className="flex gap-3">
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                                <div>
                                  <p className="text-sm font-medium text-amber-900">
                                    Not enough evidence
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-amber-800">
                                    I could not find enough information in this
                                    project&apos;s uploaded materials to answer
                                    that confidently.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sources */}
                          {message.citations &&
                            message.citations.length > 0 && (
                              <div className="mt-6">
                                <div className="mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-slate-500" />

                                  <h3 className="text-sm font-semibold text-slate-900">
                                    Sources
                                  </h3>
                                </div>

                                <div className="space-y-3">
                                  {message.citations.map((citation, index) => (
                                    <CitationCard
                                      key={`${citation.materialId}-${citation.pageNumber}-${index}`}
                                      citation={citation}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />

                    <p className="text-sm text-slate-500">
                      Searching your materials...
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto mb-4 w-full max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

              <div>
                <p className="text-sm font-medium text-red-900">
                  Something went wrong
                </p>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="sticky bottom-0 bg-slate-50 pb-5 pt-3">
          <div className="mx-auto max-w-3xl">
            {/* Quick actions during conversation */}
            {messages.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleQuickAction(action.prompt)}
                      disabled={isLoading}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  disabled={isLoading}
                  rows={3}
                  maxLength={4000}
                  placeholder="Ask about your materials..."
                  className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="flex items-center justify-between border-t border-slate-100 px-2 pt-2">
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Press Enter to send · Shift + Enter for a new line
                  </p>

                  <p className="text-xs text-slate-400 sm:hidden">
                    {question.length}/4000
                  </p>

                  <button
                    type="submit"
                    disabled={!question.trim() || isLoading}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Thinking</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              The tutor answers from your project materials and may say when
              there is insufficient evidence.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}