"use client";

import {
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

type Material = {
  id: string;
  filename: string;
  mime_type: string;
  status: "queued" | "processing" | "ready" | "failed";
  page_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type UploadMaterialDialogProps = {
  projectId: string;
  onUploaded: (material: Material) => void;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function UploadMaterialDialog({
  projectId,
  onUploaded,
}: UploadMaterialDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setFile(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function close() {
    if (uploading) {
      return;
    }

    setOpen(false);
    reset();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are supported.");
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("PDF files must be 20 MB or smaller.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();

      formData.append("file", file);
      formData.append("projectId", projectId);

      const response = await fetch("/api/materials", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to upload material.",
        );
      }

      onUploaded(data.material);

      setOpen(false);
      reset();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload material.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        <Upload className="h-4 w-4" />
        Upload PDF
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-material-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="upload-material-title"
                  className="text-lg font-semibold"
                >
                  Upload PDF
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Add a document to this project knowledge base.
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={uploading}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="material-file"
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors hover:bg-muted/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>

                <p className="mt-4 text-sm font-medium">
                  Choose a PDF file
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum file size: 20 MB
                </p>

                <input
                  ref={inputRef}
                  id="material-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={uploading}
                />
              </label>

              {file ? (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    disabled={uploading}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={uploading}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      ) : null}
    </>
  );
}