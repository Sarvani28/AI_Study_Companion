"use client";

import {
  AlertCircle,
  Clock3,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { MaterialStatusBadge } from "./material-status-badge";

type MaterialStatus =
  | "queued"
  | "processing"
  | "ready"
  | "failed";

type Material = {
  id: string;
  filename: string;
  mime_type: string;
  status: MaterialStatus;
  page_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type MaterialCardProps = {
  material: Material;
  onDeleted: (materialId: string) => void;
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${
      diffMinutes === 1 ? "" : "s"
    } ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString();
}

function getProgress(status: MaterialStatus) {
  switch (status) {
    case "queued":
      return 10;
    case "processing":
      return 65;
    case "ready":
      return 100;
    case "failed":
      return 100;
    default:
      return 0;
  }
}

export function MaterialCard({
  material,
  onDeleted,
}: MaterialCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${material.filename}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/materials/${material.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete material.",
        );
      }

      onDeleted(material.id);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to delete material.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const progress = getProgress(material.status);

  return (
    <article className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
            {material.status === "processing" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-medium">
              {material.filename}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              PDF document
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete ${material.filename}`}
          className="rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-destructive group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <MaterialStatusBadge status={material.status} />

        {material.page_count ? (
          <span className="text-sm text-muted-foreground">
            {material.page_count}{" "}
            {material.page_count === 1 ? "page" : "pages"}
          </span>
        ) : null}
      </div>

      {material.status === "processing" ||
      material.status === "queued" ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {material.status === "queued"
              ? "Waiting to be processed..."
              : "Extracting and indexing document..."}
          </p>
        </div>
      ) : null}

      {material.status === "ready" ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          Processed {formatRelativeTime(material.updated_at)}
        </p>
      ) : null}

      {material.status === "failed" ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />

            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Processing failed
              </p>

              {material.error_message ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {material.error_message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}