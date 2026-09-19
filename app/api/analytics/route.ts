import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Authenticate the current user
    // --------------------------------------------------
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------
    // 2. Load projects owned by the current user
    // --------------------------------------------------
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id);

    if (projectsError) {
      console.error(
        "Global analytics projects error:",
        projectsError
      );

      return NextResponse.json(
        {
          error: "Could not load projects.",
        },
        {
          status: 500,
        }
      );
    }

    const projectIds =
      projects?.map((project) => project.id) ?? [];

    // --------------------------------------------------
    // 3. Return empty analytics if user has no projects
    // --------------------------------------------------
    if (projectIds.length === 0) {
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

    // --------------------------------------------------
    // 4. Load activity events
    // --------------------------------------------------
    const { data: events, error: eventsError } =
      await supabase
        .from("activity_events")
        .select("event_type, created_at")
        .eq("user_id", user.id)
        .in("project_id", projectIds)
        .order("created_at", {
          ascending: true,
        });

    if (eventsError) {
      console.error(
        "Global analytics activity error:",
        eventsError
      );

      return NextResponse.json(
        {
          error: "Could not load activity data.",
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 5. Load quiz sessions
    // --------------------------------------------------
    const { data: quizzes, error: quizzesError } =
      await supabase
        .from("quiz_sessions")
        .select(
          "id, status, score, started_at, completed_at"
        )
        .eq("user_id", user.id)
        .in("project_id", projectIds);

    if (quizzesError) {
      console.error(
        "Global analytics quizzes error:",
        quizzesError
      );

      return NextResponse.json(
        {
          error: "Could not load quiz data.",
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 6. Load materials
    // --------------------------------------------------
    const { data: materials, error: materialsError } =
      await supabase
        .from("materials")
        .select(
          "id, status, created_at, updated_at"
        )
        .eq("user_id", user.id)
        .in("project_id", projectIds);

    if (materialsError) {
      console.error(
        "Global analytics materials error:",
        materialsError
      );

      return NextResponse.json(
        {
          error: "Could not load material data.",
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 7. Calculate summary metrics
    // --------------------------------------------------
    const completedQuizzes = (quizzes ?? []).filter(
      (quiz) => quiz.status === "completed"
    );

    const tutorMessages = (events ?? []).filter(
      (event) =>
        event.event_type === "TUTOR_MESSAGE"
    ).length;

    const questionsAnswered = (events ?? []).filter(
      (event) =>
        event.event_type === "QUESTION_ANSWERED"
    ).length;

    // --------------------------------------------------
    // 8. Format activity timeline
    // --------------------------------------------------
    const activity = (events ?? []).map(
      (event, index) => ({
        index: index + 1,
        event: event.event_type,
        date: event.created_at,
      })
    );

    // --------------------------------------------------
    // 9. Return analytics response
    // --------------------------------------------------
    return NextResponse.json({
      summary: {
        tutorMessages,

        quizzes: completedQuizzes.length,

        questions: questionsAnswered,

        materials: materials?.length ?? 0,

        projects: projects.length,
      },

      activity,
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