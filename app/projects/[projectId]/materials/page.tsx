"use client";

import {
  use,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MoreHorizontal,
  Upload,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/client";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type Project = {
  id: string;
  name: string;
};

type Material = {
  id: string;
  filename: string;
  mime_type: string;
  status:
    | "queued"
    | "processing"
    | "ready"
    | "failed";
  page_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function formatRelativeTime(
  dateString: string,
) {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs =
    now.getTime() - date.getTime();

  const diffMinutes = Math.floor(
    diffMs / (1000 * 60),
  );

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${
      diffMinutes === 1 ? "" : "s"
    } ago`;
  }

  const diffHours = Math.floor(
    diffMinutes / 60,
  );

  if (diffHours < 24) {
    return `${diffHours} hour${
      diffHours === 1 ? "" : "s"
    } ago`;
  }

  const diffDays = Math.floor(
    diffHours / 24,
  );

  if (diffDays < 7) {
    return `${diffDays} day${
      diffDays === 1 ? "" : "s"
    } ago`;
  }

  return date.toLocaleDateString();
}

function getStatusLabel(
  status: Material["status"],
) {
  switch (status) {
    case "queued":
      return "Queued";

    case "processing":
      return "Processing";

    case "ready":
      return "Ready";

    case "failed":
      return "Failed";
  }
}

function getStatusClasses(
  status: Material["status"],
) {
  switch (status) {
    case "queued":
      return "bg-gray-100 text-gray-600";

    case "processing":
      return "bg-indigo-50 text-indigo-700";

    case "ready":
      return "bg-emerald-50 text-emerald-700";

    case "failed":
      return "bg-red-50 text-red-700";
  }
}

function getProgress(
  status: Material["status"],
) {
  switch (status) {
    case "queued":
      return 15;

    case "processing":
      return 65;

    case "ready":
      return 100;

    case "failed":
      return 100;
  }
}

export default function MaterialsPage({
  params,
}: PageProps) {
  const { projectId } = use(params);

  /*
   * Hidden file input.
   */
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [project, setProject] =
    useState<Project | null>(null);

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ----------------------------------------------------------
   * LOAD PAGE
   * ----------------------------------------------------------
   */

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      /*
       * Load project.
       */

      const {
        data: projectData,
        error: projectError,
      } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (projectError) {
        throw projectError;
      }

      if (!projectData) {
        setError("Project not found.");
        return;
      }

      /*
       * Load materials.
       */

      const {
        data: materialData,
        error: materialError,
      } =
        await supabase
          .from("materials")
          .select(
            "id, filename, mime_type, status, page_count, error_message, created_at, updated_at",
          )
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (materialError) {
        throw materialError;
      }

      setProject(projectData);
      setMaterials(materialData ?? []);
    } catch (err) {
      console.error(
        "Materials page error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load materials.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [projectId]);

  /*
   * ----------------------------------------------------------
   * OPEN FILE PICKER
   * ----------------------------------------------------------
   */

  function openFilePicker() {
    if (uploading) {
      return;
    }

    fileInputRef.current?.click();
  }

  /*
   * ----------------------------------------------------------
   * HANDLE FILE SELECTION
   * ----------------------------------------------------------
   */

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Reset the input so selecting the same
     * file again still triggers change.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    /*
     * Validate PDF.
     */

    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setError(
        "Only PDF files are supported.",
      );

      return;
    }

    /*
     * 20 MB client-side check.
     */

    const maxSize =
      20 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "The PDF must be smaller than 20 MB.",
      );

      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "projectId",
        projectId,
      );

      formData.append(
        "file",
        file,
      );

      /*
       * Send file to backend.
       */

      const response =
        await fetch(
          "/api/materials",
          {
            method: "POST",
            body: formData,
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Upload failed.",
        );
      }

      /*
       * Reload materials immediately.
       */

      await loadPage();
    } catch (err) {
      console.error(
        "Upload error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload PDF.",
      );
    } finally {
      setUploading(false);
    }
  }

  /*
   * ----------------------------------------------------------
   * AUTO REFRESH
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const hasActiveMaterials =
      materials.some(
        (material) =>
          material.status === "queued" ||
          material.status ===
            "processing",
      );

    if (!hasActiveMaterials) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          loadPage();
        },
        5000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [materials]);

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="animate-pulse">
              <div className="h-4 w-28 rounded bg-gray-200" />

              <div className="mt-5 h-10 w-52 rounded bg-gray-200" />

              <div className="mt-3 h-5 w-80 rounded bg-gray-100" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />

              <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
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

  if (error && !project) {
    return (
      <AppShell>
        <main className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-gray-950">
              Unable to open materials
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {error}
            </p>

            <Link
              href="/spaces"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Back to spaces
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!project) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * COUNTS
   * ----------------------------------------------------------
   */

  const readyCount =
    materials.filter(
      (material) =>
        material.status === "ready",
    ).length;

  const processingCount =
    materials.filter(
      (material) =>
        material.status === "processing" ||
        material.status === "queued",
    ).length;

  const failedCount =
    materials.filter(
      (material) =>
        material.status === "failed",
    ).length;

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =====================================================
            HIDDEN FILE INPUT
        ====================================================== */}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* =====================================================
            HEADER
        ====================================================== */}

        <section className="border-b border-gray-200 pb-7">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to project
          </Link>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                {project.name}
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                Materials
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                Your project knowledge base.
                Upload PDFs and prepare them for
                grounded AI learning.
              </p>
            </div>

            <button
              type="button"
              onClick={openFilePicker}
              disabled={uploading}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />

                  Upload PDF
                </>
              )}
            </button>
          </div>
        </section>

        {/* =====================================================
            ERROR BANNER
        ====================================================== */}

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        ) : null}

        {/* =====================================================
            SUMMARY
        ====================================================== */}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Total materials
            </p>

            <p className="mt-1 text-2xl font-semibold text-gray-950">
              {materials.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Ready
            </p>

            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {readyCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Processing
            </p>

            <p className="mt-1 text-2xl font-semibold text-indigo-600">
              {processingCount}
            </p>
          </div>
        </section>

        {/* =====================================================
            DOCUMENTS
        ====================================================== */}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Your documents
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Documents available to this project's
                knowledge base.
              </p>
            </div>

            {failedCount > 0 ? (
              <span className="text-xs font-medium text-red-600">
                {failedCount} failed
              </span>
            ) : null}
          </div>

          {/* ===================================================
              EMPTY STATE
          ==================================================== */}

          {materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <FileText className="h-7 w-7 text-gray-500" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-gray-950">
                No materials yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Upload your first PDF to start
                building the knowledge base for{" "}
                <span className="font-medium text-gray-700">
                  {project.name}
                </span>
                .
              </p>

              <button
                type="button"
                onClick={openFilePicker}
                disabled={uploading}
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />

                    Upload your first PDF
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {materials.map(
                (material) => {
                  const progress =
                    getProgress(
                      material.status,
                    );

                  return (
                    <article
                      key={material.id}
                      className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                    >
                      {/* Card header */}

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              material.status ===
                              "ready"
                                ? "bg-emerald-50"
                                : material.status ===
                                    "failed"
                                  ? "bg-red-50"
                                  : "bg-gray-100"
                            }`}
                          >
                            {material.status ===
                            "processing" ? (
                              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                            ) : material.status ===
                              "ready" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : material.status ===
                              "failed" ? (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-gray-600" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-gray-950">
                              {material.filename}
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                              PDF
                              {material.page_count
                                ? ` · ${material.page_count} ${
                                    material.page_count ===
                                    1
                                      ? "page"
                                      : "pages"
                                  }`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100"
                          aria-label="Material options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Status */}

                      <div className="mt-5 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                            material.status,
                          )}`}
                        >
                          {getStatusLabel(
                            material.status,
                          )}
                        </span>

                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock3 className="h-3.5 w-3.5" />

                          {formatRelativeTime(
                            material.updated_at,
                          )}
                        </span>
                      </div>

                      {/* Queued */}

                      {material.status ===
                      "queued" ? (
                        <div className="mt-5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-gray-900 transition-all"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-gray-400">
                            Waiting to be processed...
                          </p>
                        </div>
                      ) : null}

                      {/* Processing */}

                      {material.status ===
                      "processing" ? (
                        <div className="mt-5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-gray-400">
                            Extracting and indexing
                            document...
                          </p>
                        </div>
                      ) : null}

                      {/* Ready */}

                      {material.status ===
                      "ready" ? (
                        <p className="mt-5 text-xs text-gray-500">
                          Document processed and
                          ready for grounded AI
                          Tutor conversations.
                        </p>
                      ) : null}

                      {/* Failed */}

                      {material.status ===
                      "failed" ? (
                        <div className="mt-5 rounded-xl bg-red-50 px-3 py-2.5">
                          <p className="text-xs leading-5 text-red-700">
                            {material.error_message ||
                              "Document processing failed."}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}