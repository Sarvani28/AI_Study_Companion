import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
} from "lucide-react";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string | null;
  mastery: number;
  materialCount: number;
  quizCount: number;
  accuracy: number;
};

export function ProjectCard({
  id,
  name,
  description,
  mastery,
  materialCount,
  quizCount,
  accuracy,
}: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${id}`}
      className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-gray-950">
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

        <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-gray-500" />
      </div>

      {/* Mastery */}
      <div className="mt-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-400" />

            <span className="text-sm font-medium text-gray-600">
              Mastery
            </span>
          </div>

          <span className="text-sm font-semibold text-gray-950">
            {mastery}%
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{
              width: `${Math.min(Math.max(mastery, 0), 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-gray-400">
            <FileText className="h-3.5 w-3.5" />

            <span className="text-[11px]">
              Materials
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {materialCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-gray-400">
            <BookOpen className="h-3.5 w-3.5" />

            <span className="text-[11px]">
              Quizzes
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {quizCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-gray-400">
            <CheckCircle2 className="h-3.5 w-3.5" />

            <span className="text-[11px]">
              Accuracy
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {accuracy}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-sm font-medium text-gray-700 transition group-hover:text-gray-950">
        Open project →
      </div>
    </Link>
  );
}