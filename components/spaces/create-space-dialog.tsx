"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type CreateSpaceDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateSpaceDialog({
  open,
  onClose,
  onCreated,
}: CreateSpaceDialogProps) {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Please enter a space name.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Space name must be at least 2 characters.");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Space name must be 100 characters or less.");
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
        setError("You must be logged in to create a space.");
        return;
      }

      const { error: insertError } = await supabase
        .from("spaces")
        .insert({
          user_id: user.id,
          name: trimmedName,
          description: trimmedDescription || null,
        });

      if (insertError) {
        throw insertError;
      }

      setName("");
      setDescription("");

      onCreated();
      onClose();
    } catch (error) {
      console.error("Create space error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create the space."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Create a new space
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a workspace for a subject or learning goal.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="space-name"
              className="mb-2 block text-sm font-medium"
            >
              Space name
            </label>

            <input
              id="space-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="AI Engineering"
              disabled={loading}
              autoFocus
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <div>
            <label
              htmlFor="space-description"
              className="mb-2 block text-sm font-medium"
            >
              Description
            </label>

            <textarea
              id="space-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Learn AI engineering fundamentals and build practical projects."
              disabled={loading}
              rows={4}
              className="w-full resize-none rounded-lg border bg-background px-3 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-lg border px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}