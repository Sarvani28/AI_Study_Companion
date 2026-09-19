import {
  CheckCircle2,
  MessageCircle,
  Upload,
} from "lucide-react";

type Activity = {
  id: string;
  event_type: string;
  created_at: string;
};

const icons = {
  QUIZ_COMPLETED: CheckCircle2,
  TUTOR_MESSAGE: MessageCircle,
  MATERIAL_UPLOADED: Upload,
};

function formatEvent(type: string) {
  switch (type) {
    case "QUIZ_COMPLETED":
      return "Completed quiz";

    case "TUTOR_MESSAGE":
      return "Asked Tutor";

    case "MATERIAL_UPLOADED":
      return "Uploaded material";

    default:
      return type
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function RecentActivity({
  activities,
}: {
  activities: Activity[];
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-400">
          Recent activity
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">
              No recent activity
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Your learning activity will appear here as you study.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => {
              const Icon =
                icons[activity.event_type as keyof typeof icons] ||
                CheckCircle2;

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50/70 sm:px-6"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEvent(activity.event_type)}
                    </p>
                  </div>

                  <time className="shrink-0 text-xs text-gray-400">
                    {formatTime(activity.created_at)}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}