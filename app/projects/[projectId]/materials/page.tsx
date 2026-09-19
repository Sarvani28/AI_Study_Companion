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
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
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

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();

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
      return "border-gray-200 bg-gray-50 text-gray-600";

    case "processing":
      return "border-indigo-100 bg-indigo-50 text-indigo-700";

    case "ready":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";

    case "failed":
      return "border-red-100 bg-red-50 text-red-700";
  }
}

function getProgress(
  status: Material["status"],
) {
  switch (status) {
    case "queued":
      return 20;

    case "processing":
      return 65;

    case "ready":
      return 100;

    case "failed":
      return 100;
  }
}

function getFileIconClasses(
  status: Material["status"],
) {
  switch (status) {
    case "ready":
      return "bg-emerald-50 text-emerald-600";

    case "processing":
      return "bg-indigo-50 text-indigo-600";

    case "failed":
      return "bg-red-50 text-red-600";

    default:
      return "bg-gray-100 text-gray-500";
  }
}

export default function MaterialsPage({
  params,
}: PageProps) {
  const { projectId } = use(params);

  /*
   * ----------------------------------------------------------
   * FILE INPUT
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   * Keep this input permanently mounted.
   * Do NOT place it inside the empty-state conditional.
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

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Material | null>(null);

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
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

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

      const {
        data: materialData,
        error: materialError,
      } = await supabase
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
    void loadPage();
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

    const input = fileInputRef.current;

    if (!input) {
      setError(
        "The file picker is not ready yet. Please try again.",
      );
      return;
    }

    /*
     * Reset first so selecting the same PDF again
     * still triggers onChange.
     */
    input.value = "";

    input.click();
  }

  /*
   * ----------------------------------------------------------
   * HANDLE FILE
   * ----------------------------------------------------------
   */

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Reset immediately.
     * This also allows selecting the same file again.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setError(
        "Only PDF files are supported.",
      );
      return;
    }

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

      const response =
        await fetch(
          "/api/materials",
          {
            method: "POST",
            body: formData,
          },
        );

      let result: {
        error?: string;
        material?: Material;
      } = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Upload failed (${response.status}).`,
        );
      }

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
   * DELETE MATERIAL
   * ----------------------------------------------------------
   */

  async function deleteMaterial() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingId(deleteTarget.id);
      setError("");
      setOpenMenuId(null);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const {
        error: deleteError,
      } = await supabase
        .from("materials")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setMaterials(
        (currentMaterials) =>
          currentMaterials.filter(
            (item) =>
              item.id !==
              deleteTarget.id,
          ),
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        "Delete material error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete material.",
      );
    } finally {
      setDeletingId(null);
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
          material.status ===
            "queued" ||
          material.status ===
            "processing",
      );

    if (!hasActiveMaterials) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadPage();
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
   * CLOSE MENU OUTSIDE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    function handleDocumentClick() {
      setOpenMenuId(null);
    }

    if (openMenuId) {
      document.addEventListener(
        "click",
        handleDocumentClick,
      );
    }

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick,
      );
    };
  }, [openMenuId]);

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

            <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />

              <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
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
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
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
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
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
        material.status ===
          "processing" ||
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
      {/* ------------------------------------------------
          PERMANENT HIDDEN FILE INPUT
          ------------------------------------------------ */}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      <main className="min-h-screen bg-[#f7f8fc]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

          {/* =================================================
              TOP NAVIGATION
          ================================================= */}

          <Link
            href={`/projects/${projectId}`}
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />

            Back to project
          </Link>

          {/* =================================================
              HERO
          ================================================= */}

          <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-violet-100/50 blur-3xl"
              />

              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />

                    Project knowledge base
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    {project.name}
                  </p>

                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-gray-950 sm:text-4xl">
                    Your materials
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                    Upload study documents and turn
                    them into a grounded knowledge
                    base for your AI Tutor.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={uploading}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 text-sm font-semibold text-white shadow-lg shadow-gray-950/10 transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
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
            </div>
          </section>

          {/* =================================================
              ERROR
          ================================================= */}

          {error ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

              <p className="text-sm leading-5 text-red-700">
                {error}
              </p>
            </div>
          ) : null}

          {/* =================================================
              STATS
          ================================================= */}

          <section className="mt-6 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Total materials
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
              </div>

              <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">
                {materials.length}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Documents in this project
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Ready
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>

              <p className="mt-4 text-3xl font-semibold tracking-tight text-emerald-600">
                {readyCount}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Available to the AI Tutor
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Processing
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  <Loader2 className="h-4 w-4 text-indigo-600" />
                </div>
              </div>

              <p className="mt-4 text-3xl font-semibold tracking-tight text-indigo-600">
                {processingCount}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Being prepared for learning
              </p>
            </div>

          </section>

          {/* =================================================
              DOCUMENT SECTION
          ================================================= */}

          <section className="mt-10">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                  Your documents
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Documents available to this project's
                  knowledge base.
                </p>
              </div>

              {failedCount > 0 ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />

                  {failedCount} failed
                </span>
              ) : null}
            </div>

            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {materials.length === 0 ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-dashed border-gray-300 bg-white">

                <div className="relative px-6 py-16 text-center sm:px-10">

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-50 blur-3xl"
                  />

                  <div className="relative">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <FileText className="h-7 w-7" />
                    </div>

                    <h3 className="mt-6 text-xl font-semibold tracking-tight text-gray-950">
                      Build your knowledge base
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                      Upload your first PDF and StudyAI
                      will prepare it for grounded
                      tutoring, quizzes, and learning
                      insights.
                    </p>

                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={uploading}
                      className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
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

                    <p className="mt-3 text-xs text-gray-400">
                      PDF files up to 20 MB
                    </p>

                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">

                {materials.map(
                  (material) => {
                    const progress =
                      getProgress(
                        material.status,
                      );

                    const isDeleting =
                      deletingId ===
                      material.id;

                    const isMenuOpen =
                      openMenuId ===
                      material.id;

                    return (
                      <article
                        key={material.id}
                        className="group relative overflow-visible rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                      >

                        {/* CARD TOP */}

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex min-w-0 items-start gap-4">

                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${getFileIconClasses(
                                material.status,
                              )}`}
                            >
                              {material.status ===
                              "processing" ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : material.status ===
                                "ready" ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : material.status ===
                                "failed" ? (
                                <AlertCircle className="h-5 w-5" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0">

                              <h3 className="truncate text-sm font-semibold text-gray-950">
                                {material.filename}
                              </h3>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">

                                <span>PDF</span>

                                {material.page_count ? (
                                  <>
                                    <span>•</span>

                                    <span>
                                      {
                                        material.page_count
                                      }{" "}
                                      {material.page_count ===
                                      1
                                        ? "page"
                                        : "pages"}
                                    </span>
                                  </>
                                ) : null}

                              </div>
                            </div>
                          </div>

                          {/* OPTIONS */}

                          <div
                            className="relative shrink-0"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              disabled={
                                isDeleting
                              }
                              aria-label="Material options"
                              aria-expanded={
                                isMenuOpen
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  isMenuOpen
                                    ? null
                                    : material.id,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </button>

                            {isMenuOpen ? (
                              <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">

                                <button
                                  type="button"
                                  disabled={
                                    isDeleting
                                  }
                                  onClick={() => {
                                    setOpenMenuId(
                                      null,
                                    );

                                    setDeleteTarget(
                                      material,
                                    );
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />

                                  Delete material
                                </button>

                              </div>
                            ) : null}
                          </div>

                        </div>

                        {/* STATUS */}

                        <div className="mt-5 flex items-center justify-between gap-3">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              material.status,
                            )}`}
                          >

                            {material.status ===
                            "ready" ? (
                              <Check className="h-3 w-3" />
                            ) : material.status ===
                              "processing" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : material.status ===
                              "failed" ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Clock3 className="h-3 w-3" />
                            )}

                            {getStatusLabel(
                              material.status,
                            )}

                          </span>

                          <span className="flex items-center gap-1.5 text-xs text-gray-400">

                            <Clock3 className="h-3.5 w-3.5" />

                            {formatRelativeTime(
                              material.updated_at,
                            )}

                          </span>

                        </div>

                        {/* QUEUED */}

                        {material.status ===
                        "queued" ? (
                          <div className="mt-5">

                            <div className="flex items-center justify-between text-xs">

                              <span className="text-gray-400">
                                Waiting to process
                              </span>

                              <span className="font-medium text-gray-500">
                                {progress}%
                              </span>

                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gray-800 transition-all duration-500"
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                          </div>
                        ) : null}

                        {/* PROCESSING */}

                        {material.status ===
                        "processing" ? (
                          <div className="mt-5">

                            <div className="flex items-center justify-between text-xs">

                              <span className="text-gray-400">
                                Preparing document
                              </span>

                              <span className="font-medium text-indigo-600">
                                {progress}%
                              </span>

                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-50">
                              <div
                                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                            <p className="mt-2 text-xs text-gray-400">
                              Extracting, chunking and
                              indexing document...
                            </p>

                          </div>
                        ) : null}

                        {/* READY */}

                        {material.status ===
                        "ready" ? (
                          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3">

                            <div className="flex items-start gap-2.5">

                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                              <p className="text-xs leading-5 text-emerald-800">
                                Document processed and
                                ready for grounded AI
                                Tutor conversations.
                              </p>

                            </div>

                          </div>
                        ) : null}

                        {/* FAILED */}

                        {material.status ===
                        "failed" ? (
                          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3">

                            <div className="flex items-start gap-2.5">

                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                              <p className="text-xs leading-5 text-red-700">
                                {material.error_message ||
                                  "Document processing failed."}
                              </p>

                            </div>

                          </div>
                        ) : null}

                      </article>
                    );
                  },
                )}

              </div>
            )}

          </section>
        </div>
      </main>

      {/* =====================================================
          DELETE CONFIRMATION
      ====================================================== */}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !deletingId
            ) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="p-7">

              <div className="flex items-start justify-between">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <button
                  type="button"
                  disabled={Boolean(
                    deletingId,
                  )}
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <h2 className="mt-6 text-xl font-semibold tracking-tight text-gray-950">
                Delete this material?
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                You are about to permanently delete{" "}
                <span className="font-semibold text-gray-800">
                  {deleteTarget.filename}
                </span>
                .
              </p>

              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs leading-5 text-red-700">
                  This action cannot be undone. The
                  document will no longer be available
                  to this project's knowledge base.
                </p>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-7 py-5">

              <button
                type="button"
                disabled={Boolean(
                  deletingId,
                )}
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(
                  deletingId,
                )}
                onClick={() => {
                  void deleteMaterial();
                }}
                className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />

                    Delete material
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      ) : null}

    </AppShell>
  );
}