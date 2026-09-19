import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  generateAdaptiveQuiz,
} from "@/lib/quiz/generate";

type QuizRequest = {
  projectId?: string;
  questionCount?: number;
};

export async function POST(
  request: Request
) {
  const startedAt =
    Date.now();

  const supabase =
    await createClient();

  try {
    /*
     * ------------------------------------------
     * 1. Authenticate
     * ------------------------------------------
     */

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
     * ------------------------------------------
     * 2. Parse request
     * ------------------------------------------
     */

    const body =
      (await request.json()) as QuizRequest;

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

    const requestedCount =
      Number(
        body.questionCount ??
          10
      );

    const questionCount =
      Math.min(
        10,
        Math.max(
          5,
          Number.isFinite(
            requestedCount
          )
            ? Math.floor(
                requestedCount
              )
            : 10
        )
      );

    /*
     * ------------------------------------------
     * 3. Verify project ownership
     * ------------------------------------------
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
     * ------------------------------------------
     * 4. Generate adaptive quiz
     * ------------------------------------------
     */

    const generated =
      await generateAdaptiveQuiz(
        projectId,
        user.id,
        questionCount
      );

    /*
     * ------------------------------------------
     * 5. Create quiz session
     * ------------------------------------------
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
        .select(
          "id, project_id, user_id, status, started_at"
        )
        .single();

    if (sessionError) {
      throw sessionError;
    }

    /*
     * ------------------------------------------
     * 6. Save generated questions
     * ------------------------------------------
     */

    const questionRows =
      generated.questions.map(
        (question) => ({
          quiz_session_id:
            session.id,

          project_id:
            projectId,

          concept_id:
            question.conceptId,

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
      data: savedQuestions,
      error:
        questionsError,
    } =
      await supabase
        .from("quiz_questions")
        .insert(
          questionRows
        )
        .select(
          `
            id,
            quiz_session_id,
            project_id,
            concept_id,
            question,
            question_type,
            difficulty,
            options
          `
        );

    if (questionsError) {
      /*
       * Clean up the session if
       * question creation fails.
       */
      await supabase
        .from("quiz_sessions")
        .delete()
        .eq(
          "id",
          session.id
        )
        .eq(
          "user_id",
          user.id
        );

      throw questionsError;
    }

    /*
     * ------------------------------------------
     * 7. Activity event
     * ------------------------------------------
     */

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
            savedQuestions?.length ??
            0,

          adaptive:
            true,

          adaptiveConcepts:
            generated.adaptiveConcepts
              .slice(0, 10)
              .map(
                (concept) => ({
                  conceptId:
                    concept.id,

                  concept:
                    concept.name,

                  mastery:
                    concept.masteryScore,

                  priority:
                    Number(
                      concept.priority.toFixed(
                        3
                      )
                    ),

                  weaknessScore:
                    Number(
                      concept.weaknessScore.toFixed(
                        3
                      )
                    ),

                  mistakeFrequency:
                    Number(
                      concept.mistakeFrequency.toFixed(
                        3
                      )
                    ),
                })
              ),

          allocations:
            generated.allocations,
        },
      });

    /*
     * ------------------------------------------
     * 8. AI observability
     * ------------------------------------------
     */

    await supabase
      .from("ai_requests")
      .insert({
        user_id:
          user.id,

        project_id:
          projectId,

        feature:
          "adaptive_quiz",

        model:
          process.env.OLLAMA_CHAT_MODEL ??
          "llama3.2:latest",

        prompt_version:
          "adaptive-quiz-v1",

        latency_ms:
          Date.now() -
          startedAt,

        success:
          true,
      });

    /*
     * ------------------------------------------
     * 9. Return frontend-safe response
     * ------------------------------------------
     */

    return NextResponse.json({
      quizSession: {
        id:
          session.id,

        projectId:
          project.id,

        projectName:
          project.name,

        learningGoal:
          project.learning_goal,

        status:
          session.status,
      },

      questions:
        savedQuestions ?? [],

      adaptive: {
        allocations:
          generated.allocations,

        concepts:
          generated.adaptiveConcepts
            .map(
              (concept) => ({
                id:
                  concept.id,

                name:
                  concept.name,

                masteryScore:
                  concept.masteryScore,

                priority:
                  concept.priority,

                weaknessScore:
                  concept.weaknessScore,

                mistakeFrequency:
                  concept.mistakeFrequency,

                recency:
                  concept.recency,

                assessmentNeed:
                  concept.assessmentNeed,

                goalImportance:
                  concept.goalImportance,
              })
            ),
      },
    });
  } catch (error) {
    console.error(
      "Adaptive quiz creation error:",
      error
    );

    /*
     * Record failure.
     */
    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("ai_requests")
          .insert({
            user_id:
              user.id,

            feature:
              "adaptive_quiz",

            model:
              process.env.OLLAMA_CHAT_MODEL ??
              "llama3.2:latest",

            prompt_version:
              "adaptive-quiz-v1",

            latency_ms:
              Date.now() -
              startedAt,

            success:
              false,

            error_message:
              error instanceof Error
                ? error.message
                : "Unknown error",
          });
      }
    } catch {
      // Do not hide the original error.
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create adaptive quiz.",
      },
      {
        status: 500,
      }
    );
  }
}