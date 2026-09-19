"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type CreateProjectDialogProps = {
  open: boolean;
  spaceId: string;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateProjectDialog({
  open,
  spaceId,
  onClose,
  onCreated,
}: CreateProjectDialogProps) {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [learningGoal, setLearningGoal] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedLearningGoal = learningGoal.trim();

    if (!trimmedName) {
      setError("Please enter a project name.");
      return;
    }

    if (trimmedName.length < 2) {
      setError(
        "Project name must be at least 2 characters."
      );
      return;
    }

    if (trimmedName.length > 100) {
      setError(
        "Project name must be 100 characters or less."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You must be logged in.");
        return;
      }

      /*
       * IMPORTANT:
       *
       * Before inserting the project, verify that this
       * space belongs to the authenticated user.
       */
      const { data: space, error: spaceError } =
        await supabase
          .from("spaces")
          .select("id")
          .eq("id", spaceId)
          .eq("user_id", user.id)
          .single();

      if (spaceError || !space) {
        setError(
          "You don't have permission to add a project to this space."
        );
        return;
      }

      const { error: projectError } = await supabase
        .from("projects")
        .insert({
          space_id: spaceId,
          user_id: user.id,
          name: trimmedName,
          description:
            trimmedDescription || null,
          learning_goal:
            trimmedLearningGoal || null,
        });

      if (projectError) {
        throw projectError;
      }

      setName("");
      setDescription("");
      setLearningGoal("");

      onCreated();
      onClose();
    } catch (error) {
      console.error(
        "Create project error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create the project."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-gray-950/30 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              Create a new project
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Define what you want to learn and track your
              progress over time.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          {/* Project name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Project name
            </label>

            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="RAG Fundamentals"
              disabled={loading}
              autoFocus
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10 disabled:bg-gray-50"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Description
            </label>

            <textarea
              id="project-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Understand retrieval augmented generation"
              rows={3}
              disabled={loading}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10 disabled:bg-gray-50"
            />
          </div>

          {/* Learning goal */}
          <div>
            <label
              htmlFor="learning-goal"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Learning goal
            </label>

            <textarea
              id="learning-goal"
              value={learningGoal}
              onChange={(event) =>
                setLearningGoal(event.target.value)
              }
              placeholder="Be able to design and implement a grounded RAG system."
              rows={3}
              disabled={loading}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10 disabled:bg-gray-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}