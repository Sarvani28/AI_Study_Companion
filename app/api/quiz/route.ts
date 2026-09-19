import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  generateProjectQuiz,
} from "@/lib/quiz/generate";

export async function POST(
  request: Request
) {
  const supabase =
    await createClient();

  try {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

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

    const body =
      (await request.json()) as {
        projectId?: string;
      };

    const projectId =
      body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId is required.",
        },
        {
          status: 400,
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
          "id, name, learning_goal"
        )
        .eq(
          "id",
          projectId
        )
        .eq(
          "user_id",
          user.id
        )
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
     * Create quiz session first.
     */
    const {
      data: session,
      error: sessionError,
    } =
      await supabase
        .from("quiz_sessions")
        .insert({
          project_id:
            projectId,
          user_id:
            user.id,
          status:
            "active",
        })
        .select()
        .single();

    if (sessionError) {
      throw sessionError;
    }

    try {
      /*
       * Generate grounded questions.
       */
      const questions =
        await generateProjectQuiz(
          projectId,
          user.id,
          10
        );

      /*
       * Get/create concepts.
       */
      const conceptIds =
        new Map<string, string>();

      for (const question of questions) {
        const {
          data: concept,
          error:
            conceptError,
        } =
          await supabase
            .from("concepts")
            .upsert(
              {
                project_id:
                  projectId,
                name:
                  question.concept,
              },
              {
                onConflict:
                  "project_id,name",
              }
            )
            .select("id")
            .single();

        if (conceptError) {
          throw conceptError;
        }

        if (concept) {
          conceptIds.set(
            question.concept,
            concept.id
          );
        }
      }

      /*
       * Store questions.
       */
      const rows =
        questions.map(
          (question) => ({
            quiz_session_id:
              session.id,

            project_id:
              projectId,

            concept_id:
              conceptIds.get(
                question.concept
              ) ?? null,

            question:
              question.question,

            question_type:
              "multiple_choice",

            difficulty:
              question.difficulty,

            options:
              question.options,

            correct_answer:
              question.correctAnswer,

            explanation:
              question.explanation,
          })
        );

      const {
        data:
          insertedQuestions,
        error:
          questionError,
      } =
        await supabase
          .from("quiz_questions")
          .insert(rows)
          .select(
            `
              id,
              question,
              question_type,
              difficulty,
              options,
              concept_id
            `
          );

      if (questionError) {
        throw questionError;
      }

      await supabase
        .from("activity_events")
        .insert({
          user_id:
            user.id,
          project_id:
            projectId,
          event_type:
            "QUIZ_STARTED",
          metadata: {
            quizSessionId:
              session.id,
            questionCount:
              insertedQuestions?.length ??
              0,
          },
        });

      return NextResponse.json(
        {
          quizSession: {
            id: session.id,
            projectId,
            projectName:
              project.name,
            learningGoal:
              project.learning_goal,
            status:
              "active",
          },

          questions:
            insertedQuestions ??
            [],
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      /*
       * If question generation fails,
       * don't leave an active broken quiz.
       */
      await supabase
        .from("quiz_sessions")
        .update({
          status: "failed",
        })
        .eq(
          "id",
          session.id
        )
        .eq(
          "user_id",
          user.id
        );

      throw error;
    }
  } catch (error) {
  console.error(
    "Quiz creation error:",
    error
  );

  const message =
    error instanceof Error
      ? error.message
      : "Could not create quiz.";

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: 500,
    }
  );
}
}
