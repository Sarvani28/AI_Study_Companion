import {
  CheckCircle2,
  FileText,
  MessageCircle,
} from "lucide-react";

type Activity = {
  id: string;
  eventType: string;
  createdAt: string;
};

type RecentActivityProps = {
  activities: Activity[];
};

function formatEventType(eventType: string) {
  switch (eventType) {
    case "QUIZ_COMPLETED":
      return "Quiz completed";

    case "TUTOR_MESSAGE":
      return "Tutor question asked";

    case "MATERIAL_PROCESSED":
      return "Material processed";

    case "MATERIAL_UPLOADED":
      return "Material uploaded";

    case "QUESTION_ANSWERED":
      return "Question answered";

    case "QUIZ_STARTED":
      return "Quiz started";

    case "MASTERY_UPDATED":
      return "Mastery updated";

    case "RECOMMENDATION_CREATED":
      return "Recommendation created";

    default:
      return eventType
        .toLowerCase()
        .replaceAll("_", " ");
  }
}

function ActivityIcon({
  eventType,
}: {
  eventType: string;
}) {
  if (
    eventType === "QUIZ_COMPLETED" ||
    eventType === "QUESTION_ANSWERED"
  ) {
    return (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    );
  }

  if (
    eventType === "MATERIAL_PROCESSED" ||
    eventType === "MATERIAL_UPLOADED"
  ) {
    return (
      <FileText className="h-4 w-4 text-blue-600" />
    );
  }

  return (
    <MessageCircle className="h-4 w-4 text-indigo-600" />
  );
}

export function RecentActivity({
  activities,
}: RecentActivityProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">
        Recent activity
      </h2>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm font-medium text-gray-700">
            No activity yet
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-400">
            Your quizzes, tutor questions, and processed
            materials will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-gray-100">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                <ActivityIcon
                  eventType={activity.eventType}
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium capitalize text-gray-800">
                  {formatEventType(
                    activity.eventType
                  )}
                </p>

                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(
                    activity.createdAt
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}