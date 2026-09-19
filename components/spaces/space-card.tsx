"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  FolderKanban,
  MoreHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type SpaceCardProps = {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
  averageMastery: number;
  onDeleted?: (id: string) => void;
};

export function SpaceCard({
  id,
  name,
  description,
  projectCount,
  averageMastery,
  onDeleted,
}: SpaceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] =
    useState("");

  async function handleDelete() {
    if (deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      console.log(
        "[DELETE SPACE] Starting:",
        id,
      );

      const response = await fetch(
        `/api/spaces/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      console.log(
        "[DELETE SPACE] Response:",
        response.status,
        result,
      );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to delete this space.",
        );
      }

      console.log(
        "[DELETE SPACE] Success:",
        id,
      );

      setConfirmOpen(false);
      setMenuOpen(false);

      onDeleted?.(id);
    } catch (error) {
      console.error(
        "[DELETE SPACE] Error:",
        error,
      );

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this space.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="group relative">
        <Link
          href={`/spaces/${id}`}
          className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
              <Sparkles className="h-5 w-5 text-gray-700" />
            </div>

            <div className="h-9 w-9" />
          </div>

          <div className="mt-5">
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              {name}
            </h2>

            {description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                {description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                No description added.
              </p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FolderKanban className="h-3.5 w-3.5" />
                Projects
              </div>

              <p className="mt-1 text-lg font-semibold text-gray-950">
                {projectCount}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <p className="text-xs text-gray-500">
                Average mastery
              </p>

              <p className="mt-1 text-lg font-semibold text-gray-950">
                {averageMastery}%
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Open workspace</span>

            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </Link>

        {/* OPTIONS BUTTON */}
        <div className="absolute right-4 top-4 z-10">
          <button
            type="button"
            aria-label={`More options for ${name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              setMenuOpen(
                (current) => !current,
              );
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setMenuOpen(false);
                  setDeleteError("");
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete space
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              if (!deleting) {
                setConfirmOpen(false);
              }
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-space-${id}`}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-2xl"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <h2
                  id={`delete-space-${id}`}
                  className="mt-5 text-xl font-semibold tracking-tight text-gray-950"
                >
                  Delete this space?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  You are about to delete{" "}
                  <span className="font-semibold text-gray-800">
                    {name}
                  </span>
                  .
                  <br />
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                disabled={deleting}
                aria-label="Close"
                onClick={() =>
                  setConfirmOpen(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {deleteError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  setConfirmOpen(false)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  void handleDelete();
                }}
                className="h-11 min-w-[130px] rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete space"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}