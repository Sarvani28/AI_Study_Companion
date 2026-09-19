import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  updateConceptMastery,
} from "@/lib/mastery/update-mastery";

import {
  evaluateOpenEndedAnswer,
} from "@/lib/quiz/evaluate-open-ended";

type RequestBody = {
  projectId?: string;
  questionId?: string;
  answer?: string;
  quizSessionId?: string;
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
     * 2. Parse
     * ------------------------------------------
     */

    const body =
      (await request.json()) as RequestBody;

    const projectId =
      body.projectId?.trim();

    const questionId =
      body.questionId?.trim();

    const answer =
      body.answer?.trim();

    const quizSessionId =
      body.quizSessionId?.trim();

    if (
      !projectId ||
      !questionId ||
      !answer
    ) {
      return NextResponse.json(
        {
          error:
            "projectId, questionId and answer are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ------------------------------------------
     * 3. Validate answer size
     * ------------------------------------------
     */

    if (
      answer.length < 3
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a more complete answer.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      answer.length > 8000
    ) {
      return NextResponse.json(
        {
          error:
            "Answer is too long. Keep it under 8000 characters.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ------------------------------------------
     * 4. Verify project
     * ------------------------------------------
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
     * 5. Verify session if supplied
     * ------------------------------------------
     */

    if (
      quizSessionId
    ) {
      const {
        data: session,
        error:
          sessionError,
      } =
        await supabase
          .from(
            "quiz_sessions"
          )
          .select(
            "id, project_id, user_id, status"
          )
          .eq(
            "id",
            quizSessionId
          )
          .eq(
            "project_id",
            projectId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        return NextResponse.json(
          {
            error:
              "Quiz session not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        session.status !==
        "active"
      ) {
        return NextResponse.json(
          {
            error:
              "This assessment is no longer active.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * ------------------------------------------
     * 6. Evaluate with Ollama
     * ------------------------------------------
     */

    const result =
      await evaluateOpenEndedAnswer({
        projectId,
        questionId,
        answer,
        userId:
          user.id,
      });

    const evaluation =
      result.evaluation;

    /*
     * ------------------------------------------
     * 7. Save answer
     * ------------------------------------------
     */

    const {
      data: savedAnswer,
      error:
        answerError,
    } =
      await supabase
        .from("quiz_answers")
        .insert({
          quiz_question_id:
            questionId,

          user_id:
            user.id,

          answer,

          is_correct:
            evaluation.correct,

          score:
            Number(
              (
                evaluation.score *
                100
              ).toFixed(2)
            ),

          feedback:
            evaluation.feedback,

          evaluated_at:
            new Date().toISOString(),
        })
        .select(
          "id, is_correct, score, feedback, evaluated_at"
        )
        .single();

    if (answerError) {
      throw answerError;
    }

    /*
     * ------------------------------------------
     * 8. Update mastery
     * ------------------------------------------
     */

    const masteryUpdates =
    result.question.conceptId
        ? await updateConceptMastery({
            userId: user.id,
            projectId,
            conceptId:
            result.question
                .conceptId,
            assessmentScore:
            evaluation.score * 100,
            source:
            "open_ended",
        })
        : null;

    /*
     * ------------------------------------------
     * 9. Activity event
     * ------------------------------------------
     */

    await supabase
      .from(
        "activity_events"
      )
      .insert({
        user_id:
          user.id,

        project_id:
          projectId,

        event_type:
          "QUESTION_ANSWERED",

        metadata: {
          questionId,

          questionType:
            "open_ended",

          score:
            evaluation.score,

          correct:
            evaluation.correct,

          conceptsCovered:
            evaluation.concepts_covered,

          missingConcepts:
            evaluation.missing_concepts,
        },
      });

    /*
     * ------------------------------------------
     * 10. AI observability
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
          "open_ended_evaluation",

        model:
          process.env.OLLAMA_CHAT_MODEL ??
          "llama3.2:latest",

        prompt_version:
          "open-ended-evaluation-v1",

        latency_ms:
          Date.now() -
          startedAt,

        success:
          true,
      });

    /*
     * ------------------------------------------
     * 11. Complete session
     * ------------------------------------------
     */

    if (
      quizSessionId
    ) {
      await supabase
        .from(
          "quiz_sessions"
        )
        .update({
          status:
            "completed",

          score:
            Number(
              (
                evaluation.score *
                100
              ).toFixed(2)
            ),

          completed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          quizSessionId
        )
        .eq(
          "user_id",
          user.id
        );

      await supabase
        .from(
          "activity_events"
        )
        .insert({
          user_id:
            user.id,

          project_id:
            projectId,

          event_type:
            "QUIZ_COMPLETED",

          metadata: {
            quizSessionId,

            score:
              evaluation.score *
              100,

            questionType:
              "open_ended",
          },
        });
    }

    return NextResponse.json({
      evaluation: {
        score:
          evaluation.score,

        percentage:
          Math.round(
            evaluation.score *
              100
          ),

        understanding:
          evaluation.understanding,

        correct:
          evaluation.correct,

        conceptsCovered:
          evaluation.concepts_covered,

        missingConcepts:
          evaluation.missing_concepts,

        feedback:
          evaluation.feedback,
      },

      answer: {
        id:
          savedAnswer.id,

        isCorrect:
          savedAnswer.is_correct,

        score:
          savedAnswer.score,

        feedback:
          savedAnswer.feedback,
      },

      mastery:
        masteryUpdates,
    });
  } catch (error) {
    console.error(
      "Open-ended evaluation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not evaluate answer.",
      },
      {
        status: 500,
      }
    );
  }
}

async function updateOpenEndedMastery({
  supabase,
  userId,
  projectId,
  questionConceptId,
  score,
  conceptsCovered,
  missingConcepts,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;

  userId: string;
  projectId: string;
  questionConceptId:
    | string
    | null;

  score: number;

  conceptsCovered: string[];

  missingConcepts: string[];
}) {
  /*
   * Load all project concepts so
   * evaluator names can be safely
   * mapped to database IDs.
   */

  const {
    data: concepts,
    error: conceptsError,
  } =
    await supabase
      .from("concepts")
      .select(
        "id, name"
      )
      .eq(
        "project_id",
        projectId
      );

  if (conceptsError) {
    throw conceptsError;
  }

  const relevantNames =
    new Set(
      [
        ...conceptsCovered,
        ...missingConcepts,
      ].map(
        (name) =>
          name
            .trim()
            .toLowerCase()
      )
    );

  /*
   * Always include the question's
   * actual concept.
   */
  if (
    questionConceptId
  ) {
    const questionConcept =
      concepts?.find(
        (concept) =>
          concept.id ===
          questionConceptId
      );

    if (questionConcept) {
      relevantNames.add(
        questionConcept.name
          .trim()
          .toLowerCase()
      );
    }
  }

  const relevantConcepts =
    (concepts ?? []).filter(
      (concept) =>
        relevantNames.has(
          concept.name
            .trim()
            .toLowerCase()
        ) ||
        concept.id ===
          questionConceptId
    );

  const updates: Array<{
    conceptId: string;
    concept: string;
    oldScore: number;
    newScore: number;
    trend: string;
  }> = [];

  /*
   * Score is 0 → 1.
   * Mastery uses 0 → 100.
   */
  const assessmentScore =
    score * 100;

  for (
    const concept of
      relevantConcepts
  ) {
    const {
      data: existing,
      error: readError,
    } =
      await supabase
        .from(
          "concept_mastery"
        )
        .select(
          `
            id,
            mastery_score,
            confidence,
            attempt_count,
            correct_count
          `
        )
        .eq(
          "project_id",
          projectId
        )
        .eq(
          "concept_id",
          concept.id
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (readError) {
      throw readError;
    }

    const oldScore =
      Number(
        existing?.mastery_score ??
          0
      );

    /*
     * Same mastery model used by
     * Stage 33:
     *
     * old * .7 + newScore * .3
     */
    const newScore =
      oldScore * 0.7 +
      assessmentScore * 0.3;

    const oldAttempts =
      Number(
        existing?.attempt_count ??
          0
      );

    const oldCorrect =
      Number(
        existing?.correct_count ??
          0
      );

    const attemptCount =
      oldAttempts + 1;

    const correctCount =
      oldCorrect +
      (score >= 0.7 ? 1 : 0);

    const confidence =
      Math.min(
        100,
        Number(
          existing?.confidence ??
            0
        ) + 8
      );

    let trend =
      "stable";

    if (
      newScore >
      oldScore + 5
    ) {
      trend =
        "improving";
    } else if (
      newScore <
      oldScore - 5
    ) {
      trend =
        "needs_attention";
    }

    const payload = {
      project_id:
        projectId,

      concept_id:
        concept.id,

      user_id:
        userId,

      mastery_score:
        Number(
          newScore.toFixed(
            2
          )
        ),

      confidence:
        Number(
          confidence.toFixed(
            2
          )
        ),

      attempt_count:
        attemptCount,

      correct_count:
        correctCount,

      last_assessed_at:
        new Date().toISOString(),

      trend,

      updated_at:
        new Date().toISOString(),
    };

    if (existing) {
      const {
        error: updateError,
      } =
        await supabase
          .from(
            "concept_mastery"
          )
          .update(payload)
          .eq(
            "id",
            existing.id
          )
          .eq(
            "user_id",
            userId
          );

      if (updateError) {
        throw updateError;
      }
    } else {
      const {
        error: insertError,
      } =
        await supabase
          .from(
            "concept_mastery"
          )
          .insert(payload);

      if (insertError) {
        throw insertError;
      }
    }

    updates.push({
      conceptId:
        concept.id,

      concept:
        concept.name,

      oldScore,

      newScore,

      trend,
    });

    await supabase
      .from(
        "activity_events"
      )
      .insert({
        user_id:
          userId,

        project_id:
          projectId,

        event_type:
          "MASTERY_UPDATED",

        metadata: {
          conceptId:
            concept.id,

          concept:
            concept.name,

          oldScore,

          newScore,

          assessmentScore,

          openEnded:
            true,
        },
      });
  }

  return updates;
}