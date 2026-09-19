import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { projectId } =
      await context.params;

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

    /*
     * Verify project.
     */

    const {
      data: project,
      error: projectError,
    } =
      await supabase
        .from("projects")
        .select(
          "id, name"
        )
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Materials
     */

    const {
      data: materials,
    } =
      await supabase
        .from("materials")
        .select(
          "id, filename, status, created_at, updated_at"
        )
        .eq(
          "project_id",
          projectId
        )
        .eq(
          "user_id",
          user.id
        );

    /*
     * Quiz sessions
     */

    const {
      data: quizSessions,
    } =
      await supabase
        .from("quiz_sessions")
        .select(
          "id, score, status, started_at, completed_at"
        )
        .eq(
          "project_id",
          projectId
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "started_at",
          {
            ascending: true,
          }
        );

    /*
     * Quiz questions
     */

    const {
      data: quizQuestions,
    } =
      await supabase
        .from("quiz_questions")
        .select(
          "id, quiz_session_id"
        )
        .eq(
          "project_id",
          projectId
        );

    /*
     * Answers
     */

    const questionIds =
      quizQuestions?.map(
        (question) =>
          question.id
      ) ?? [];

    let answers: Array<{
      quiz_question_id: string;
      is_correct: boolean | null;
    }> = [];

    if (
      questionIds.length > 0
    ) {
      const {
        data,
      } =
        await supabase
          .from(
            "quiz_answers"
          )
          .select(
            "quiz_question_id, is_correct"
          )
          .eq(
            "user_id",
            user.id
          )
          .in(
            "quiz_question_id",
            questionIds
          );

      answers = data ?? [];
    }

    /*
     * Mastery history
     */

    const {
      data: masteryHistory,
    } =
      await supabase
        .from(
          "mastery_history"
        )
        .select(`
          new_mastery,
          created_at,
          concepts (
            name
          )
        `)
        .eq(
          "project_id",
          projectId
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    /*
     * Activity events
     */

    const {
      data: activityEvents,
    } =
      await supabase
        .from(
          "activity_events"
        )
        .select(
          "event_type, created_at"
        )
        .eq(
          "project_id",
          projectId
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    /*
     * ------------------------------------------
     * Summary
     * ------------------------------------------
     */

    const completedQuizzes =
      (
        quizSessions ?? []
      ).filter(
        (quiz) =>
          quiz.status ===
          "completed"
      );

    const scores =
      completedQuizzes
        .map(
          (quiz) =>
            Number(
              quiz.score ?? 0
            )
        );

    const quizAccuracy =
      scores.length > 0
        ? scores.reduce(
            (
              total,
              score
            ) =>
              total + score,
            0
          ) /
          scores.length
        : 0;

    const correctAnswers =
      answers.filter(
        (answer) =>
          answer.is_correct ===
          true
      ).length;

    const answeredQuestions =
      answers.length;

    const questionAccuracy =
      answeredQuestions > 0
        ? (correctAnswers /
            answeredQuestions) *
          100
        : 0;

    const tutorMessages =
      (
        activityEvents ?? []
      ).filter(
        (event) =>
          event.event_type ===
          "TUTOR_MESSAGE"
      ).length;

    /*
     * ------------------------------------------
     * Mastery chart
     * ------------------------------------------
     */

    const masteryChart =
      (
        masteryHistory ?? []
      ).map(
        (
          item,
          index
        ) => {
          const concept =
            Array.isArray(
              item.concepts
            )
              ? item.concepts[0]
              : item.concepts;

          return {
            index:
              index + 1,

            mastery:
              Number(
                item.new_mastery
              ),

            concept:
              concept?.name ??
              "Concept",

            date:
              item.created_at,
          };
        }
      );

    /*
     * ------------------------------------------
     * Quiz accuracy chart
     * ------------------------------------------
     */

    const quizAccuracyChart =
      completedQuizzes.map(
        (
          quiz,
          index
        ) => ({
          index:
            index + 1,

          accuracy:
            Number(
              quiz.score ?? 0
            ),

          date:
            quiz.completed_at ??
            quiz.started_at,
        })
      );

    /*
     * ------------------------------------------
     * Tutor activity
     * ------------------------------------------
     */

    const tutorActivity =
      (
        activityEvents ?? []
      )
        .filter(
          (event) =>
            event.event_type ===
            "TUTOR_MESSAGE"
        )
        .map(
          (
            event,
            index
          ) => ({
            index:
              index + 1,

            date:
              event.created_at,

            messages:
              index + 1,
          })
        );

    /*
     * ------------------------------------------
     * Material processing
     * ------------------------------------------
     */

    const materialProcessing =
      (
        materials ?? []
      ).map(
        (material) => ({
          filename:
            material.filename,

          status:
            material.status,

          createdAt:
            material.created_at,

          updatedAt:
            material.updated_at,
        })
      );

    return NextResponse.json({
      project,

      summary: {
        tutorMessages,
        quizzes:
          completedQuizzes.length,
        questions:
          answeredQuestions,
        quizAccuracy:
          Number(
            quizAccuracy.toFixed(
              1
            )
          ),
        questionAccuracy:
          Number(
            questionAccuracy.toFixed(
              1
            )
          ),
        materials:
          materials?.length ?? 0,
      },

      masteryChart,

      quizAccuracyChart,

      tutorActivity,

      materialProcessing,
    });
  } catch (error) {
    console.error(
      "Project analytics error:",
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