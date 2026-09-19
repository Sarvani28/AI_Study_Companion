import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: projects,
    } =
      await supabase
        .from("projects")
        .select(
          "id, name"
        )
        .eq(
          "user_id",
          user.id
        );

    const projectIds =
      projects?.map(
        (project) =>
          project.id
      ) ?? [];

    if (
      projectIds.length ===
      0
    ) {
      return NextResponse.json({
        summary: {
          tutorMessages: 0,
          quizzes: 0,
          questions: 0,
          materials: 0,
          projects: 0,
        },

        activity: [],
      });
    }

    const {
      data: events,
    } =
      await supabase
        .from(
          "activity_events"
        )
        .select(
          "event_type, created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "project_id",
          projectIds
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    const {
      data: quizzes,
    } =
      await supabase
        .from(
          "quiz_sessions"
        )
        .select(
          "id, status, score, started_at, completed_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "project_id",
          projectIds
        );

    const {
      data: materials,
    } =
      await supabase
        .from("materials")
        .select(
          "id, status, created_at, updated_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "project_id",
          projectIds
        );

    const completedQuizzes =
      (
        quizzes ?? []
      ).filter(
        (quiz) =>
          quiz.status ===
          "completed"
      );

    const tutorMessages =
      (
        events ?? []
      ).filter(
        (event) =>
          event.event_type ===
          "TUTOR_MESSAGE"
      ).length;

    return NextResponse.json({
      summary: {
        tutorMessages,

        quizzes:
          completedQuizzes.length,

        questions:
          (
            events ?? []
          ).filter(
            (event) =>
              event.event_type ===
              "QUESTION_ANSWERED"
          ).length,

        materials:
          materials?.length ?? 0,

        projects:
          projects.length,
      },

      activity:
        (events ?? []).map(
          (
            event,
            index
          ) => ({
            index:
              index + 1,

            event:
              event.event_type,

            date:
              event.created_at,
          })
        ),
    });
  } catch (error) {
    console.error(
      "Global analytics error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load analytics.",
      },
      {
        status: 500,
      }
    );
  }
}