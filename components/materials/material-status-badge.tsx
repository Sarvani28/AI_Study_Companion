type MaterialStatus =
  | "queued"
  | "processing"
  | "ready"
  | "failed";

type MaterialStatusBadgeProps = {
  status: MaterialStatus;
};

const statusConfig: Record<
  MaterialStatus,
  {
    label: string;
    className: string;
  }
> = {
  queued: {
    label: "Queued",
    className:
      "border border-border bg-muted text-muted-foreground",
  },
  processing: {
    label: "Processing",
    className:
      "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  },
  ready: {
    label: "Ready",
    className:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    className:
      "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },
};

export function MaterialStatusBadge({
  status,
}: MaterialStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}