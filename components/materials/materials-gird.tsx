"use client";

import { FileText } from "lucide-react";

import { MaterialCard } from "./material-card";

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

type MaterialsGridProps = {
  materials: Material[];
  onDeleted: (materialId: string) => void;
};

export function MaterialsGrid({
  materials,
  onDeleted,
}: MaterialsGridProps) {
  if (materials.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>

        <h2 className="mt-4 text-lg font-semibold">
          No materials yet
        </h2>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Upload a PDF to start building the knowledge base for
          this project.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  );
}