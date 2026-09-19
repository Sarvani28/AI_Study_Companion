import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type AnswerRequest = {
  quizSessionId?: string;
  questionId?: string;
  answer?: string;
};

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
      (await request.json()) as AnswerRequest;

    const quizSessionId =
      body.quizSessionId?.trim();

    const questionId =
      body.questionId?.trim();

    const answer =
      body.answer?.trim();

    if (
      !quizSessionId ||
      !questionId ||
      !answer
    ) {
      return NextResponse.json(
        {
          error:
            "quizSessionId, questionId and answer are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get active session.
     */
    const {
      data: session,
      error: sessionError,
    } =
      await supabase
        .from("quiz_sessions")
        .select(
          "id, project_id, status"
        )
        .eq(
          "id",
          quizSessionId
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
            "This quiz is no longer active.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get question.
     */
    const {
      data: question,
      error:
        questionError,
    } =
      await supabase
        .from("quiz_questions")
        .select(
          `
            id,
            quiz_session_id,
            project_id,
            concept_id,
            question,
            question_type,
            correct_answer,
            explanation,
            difficulty
          `
        )
        .eq(
          "id",
          questionId
        )
        .eq(
          "quiz_session_id",
          quizSessionId
        )
        .eq(
          "project_id",
          session.project_id
        )
        .maybeSingle();

    if (questionError) {
      throw questionError;
    }

    if (!question) {
      return NextResponse.json(
        {
          error:
            "Quiz question not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Prevent duplicate answers.
     */
    const {
      data: existingAnswer,
    } =
      await supabase
        .from("quiz_answers")
        .select("id")
        .eq(
          "quiz_question_id",
          questionId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (existingAnswer) {
      return NextResponse.json(
        {
          error:
            "This question has already been answered.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * MCQ evaluation is deterministic.
     *
     * The model is NOT involved in grading.
     */
    const isCorrect =
      normalizeAnswer(answer) ===
      normalizeAnswer(
        question.correct_answer ??
          ""
      );

    const score =
      isCorrect ? 100 : 0;

    /*
     * Store answer.
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
            isCorrect,

          score,

          feedback:
            isCorrect
              ? "Correct."
              : "Not quite. Review the explanation and the related material.",

          evaluated_at:
            new Date().toISOString(),
        })
        .select()
        .single();

    if (answerError) {
      throw answerError;
    }

    /*
     * Update mastery.
     */
    let mastery = null;

    if (question.concept_id) {
      mastery =
        await updateConceptMastery({
          supabase,
          userId: user.id,
          projectId:
            session.project_id,
          conceptId:
            question.concept_id,
          score,
          isCorrect,
        });
    }

    /*
     * Determine quiz progress.
     */
    const {
      data: questions,
      error:
        questionsError,
    } =
      await supabase
        .from("quiz_questions")
        .select("id")
        .eq(
          "quiz_session_id",
          quizSessionId
        );

    if (questionsError) {
      throw questionsError;
    }

    const questionIds =
      questions?.map(
        (item) => item.id
      ) ?? [];

    const {
      data: answers,
      error:
        answersError,
    } =
      await supabase
        .from("quiz_answers")
        .select(
          "quiz_question_id, score"
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "quiz_question_id",
          questionIds.length
            ? questionIds
            : [questionId]
        );

    if (answersError) {
      throw answersError;
    }

    const answeredCount =
      answers?.length ?? 0;

    const totalQuestions =
      questionIds.length;

    const isComplete =
      totalQuestions > 0 &&
      answeredCount >=
        totalQuestions;

    let finalScore:
      | number
      | null = null;

    if (isComplete) {
      const totalScore =
        (answers ?? []).reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.score ?? 0
            ),
          0
        );

      finalScore =
        Math.round(
          totalScore /
            totalQuestions
        );

      await supabase
        .from("quiz_sessions")
        .update({
          status:
            "completed",

          score:
            finalScore,

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
        .from("activity_events")
        .insert({
          user_id:
            user.id,

          project_id:
            session.project_id,

          event_type:
            "QUIZ_COMPLETED",

          metadata: {
            quizSessionId,
            score:
              finalScore,
            questionCount:
              totalQuestions,
          },
        });
    } else {
      await supabase
        .from("activity_events")
        .insert({
          user_id:
            user.id,

          project_id:
            session.project_id,

          event_type:
            "QUESTION_ANSWERED",

          metadata: {
            quizSessionId,
            questionId,
            isCorrect,
            score,
          },
        });
    }

    return NextResponse.json({
      answer: {
        id:
          savedAnswer.id,

        isCorrect,

        score,

        feedback:
          isCorrect
            ? "Correct!"
            : "Not quite.",

        explanation:
          question.explanation ??
          "Review the related material.",
      },

      mastery,

      progress: {
        answered:
          answeredCount,

        total:
          totalQuestions,

        complete:
          isComplete,

        score:
          finalScore,
      },
    });
  } catch (error) {
    console.error(
      "Quiz answer error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not submit answer.",
      },
      {
        status: 500,
      }
    );
  }
}

function normalizeAnswer(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function updateConceptMastery({
  supabase,
  userId,
  projectId,
  conceptId,
  score,
  isCorrect,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  userId: string;
  projectId: string;
  conceptId: string;
  score: number;
  isCorrect: boolean;
}) {
  const {
    data: existing,
    error:
      existingError,
  } =
    await supabase
      .from("concept_mastery")
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
        "user_id",
        userId
      )
      .eq(
        "project_id",
        projectId
      )
      .eq(
        "concept_id",
        conceptId
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const oldMastery =
    Number(
      existing?.mastery_score ?? 0
    );

  /*
   * PRD-style weighted mastery update:
   *
   * old × 0.7 + new score × 0.3
   */
  const newMastery =
    oldMastery * 0.7 +
    score * 0.3;

  const attemptCount =
    Number(
      existing?.attempt_count ?? 0
    ) + 1;

  const correctCount =
    Number(
      existing?.correct_count ?? 0
    ) +
    (isCorrect ? 1 : 0);

  const confidence =
    Math.min(
      100,
      attemptCount * 15
    );

  let trend =
    "stable";

  if (
    newMastery >
    oldMastery + 2
  ) {
    trend = "improving";
  } else if (
    newMastery <
    oldMastery - 2
  ) {
    trend = "declining";
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("concept_mastery")
      .upsert(
        {
          user_id:
            userId,

          project_id:
            projectId,

          concept_id:
            conceptId,

          mastery_score:
            Math.round(
              newMastery * 100
            ) / 100,

          confidence:
            Math.round(
              confidence * 100
            ) / 100,

          attempt_count:
            attemptCount,

          correct_count:
            correctCount,

          last_assessed_at:
            new Date().toISOString(),

          trend,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,project_id,concept_id",
        }
      )
      .select(
        `
          mastery_score,
          confidence,
          attempt_count,
          correct_count,
          trend
        `
      )
      .single();

  if (error) {
    throw error;
  }

  await supabase
    .from("activity_events")
    .insert({
      user_id:
        userId,

      project_id:
        projectId,

      event_type:
        "MASTERY_UPDATED",

      metadata: {
        conceptId,
        oldMastery,
        newMastery:
          data.mastery_score,
        score,
      },
    });

  return {
    oldScore:
      Math.round(
        oldMastery * 100
      ) / 100,

    newScore:
      Number(
        data.mastery_score
      ),

    confidence:
      Number(
        data.confidence
      ),

    trend:
      data.trend,
  };
}