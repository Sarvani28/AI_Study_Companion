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
     * ------------------------------------------
     * 2. Verify session
     * ------------------------------------------
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
     * ------------------------------------------
     * 3. Load question
     * ------------------------------------------
     */

    const {
      data: question,
      error: questionError,
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
            correct_answer,
            explanation
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
     * ------------------------------------------
     * 4. Evaluate
     * ------------------------------------------
     */

    const isCorrect =
      answer.trim() ===
      question.correct_answer.trim();

    const score =
      isCorrect ? 100 : 0;

    /*
     * ------------------------------------------
     * 5. Save answer
     * ------------------------------------------
     */

    const {
      data: savedAnswer,
      error: answerError,
    } =
      await supabase
        .from("quiz_answers")
        .insert({
          quiz_question_id:
            question.id,

          user_id:
            user.id,

          answer,

          is_correct:
            isCorrect,

          score,

          feedback:
            isCorrect
              ? "Correct answer."
              : "Review this concept and try another targeted question.",

          evaluated_at:
            new Date().toISOString(),
        })
        .select(
          "id, is_correct, score, feedback"
        )
        .single();

    if (answerError) {
      throw answerError;
    }

    /*
     * ------------------------------------------
     * 6. Update concept mastery
     * ------------------------------------------
     */

    let masteryResult:
      | {
          oldScore: number;
          newScore: number;
          confidence: number;
          trend: string;
        }
      | null = null;

    if (
      question.concept_id
    ) {
      const {
        data: existingMastery,
        error:
          masteryReadError,
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
            "project_id",
            session.project_id
          )
          .eq(
            "concept_id",
            question.concept_id
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (masteryReadError) {
        throw masteryReadError;
      }

      const oldScore =
        Number(
          existingMastery
            ?.mastery_score ??
            0
        );

      const oldConfidence =
        Number(
          existingMastery
            ?.confidence ??
            0
        );

      const oldAttempts =
        Number(
          existingMastery
            ?.attempt_count ??
            0
        );

      const oldCorrect =
        Number(
          existingMastery
            ?.correct_count ??
            0
        );

      /*
       * PRD prototype mastery update:
       *
       * old * .7 + score * .3
       */
      const newScore =
        oldScore * 0.7 +
        score * 0.3;

      const attemptCount =
        oldAttempts + 1;

      const correctCount =
        oldCorrect +
        (isCorrect ? 1 : 0);

      /*
       * Confidence gradually increases
       * with evidence.
       */
      const confidence =
        Math.min(
          100,
          oldConfidence +
            8
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

      if (
        existingMastery
      ) {
        const {
          error:
            masteryUpdateError,
        } =
          await supabase
            .from(
              "concept_mastery"
            )
            .update({
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
            })
            .eq(
              "id",
              existingMastery.id
            )
            .eq(
              "user_id",
              user.id
            );

        if (
          masteryUpdateError
        ) {
          throw masteryUpdateError;
        }
      } else {
        const {
          error:
            masteryInsertError,
        } =
          await supabase
            .from(
              "concept_mastery"
            )
            .insert({
              project_id:
                session.project_id,

              concept_id:
                question.concept_id,

              user_id:
                user.id,

              mastery_score:
                Number(
                  newScore.toFixed(
                    2
                  )
                ),

              confidence:
                confidence,

              attempt_count:
                1,

              correct_count:
                isCorrect
                  ? 1
                  : 0,

              last_assessed_at:
                new Date().toISOString(),

              trend,
            });

        if (
          masteryInsertError
        ) {
          throw masteryInsertError;
        }
      }

      masteryResult = {
        oldScore,
        newScore,
        confidence,
        trend,
      };

      /*
       * ------------------------------------------
       * Mastery event
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
            session.project_id,

          event_type:
            "MASTERY_UPDATED",

          metadata: {
            conceptId:
              question.concept_id,

            oldScore,

            newScore,

            score,

            isCorrect,
          },
        });
    }

    /*
     * ------------------------------------------
     * 7. Question answered event
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
          session.project_id,

        event_type:
          "QUESTION_ANSWERED",

        metadata: {
          quizSessionId,
          questionId,
          conceptId:
            question.concept_id,
          isCorrect,
          score,
        },
      });

    /*
     * ------------------------------------------
     * 8. Progress
     * ------------------------------------------
     */

    const {
      data: answers,
      error:
        answersError,
    } =
      await supabase
        .from("quiz_answers")
        .select(
          `
            id,
            score,
            quiz_questions!inner (
              quiz_session_id
            )
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "quiz_questions.quiz_session_id",
          quizSessionId
        );

    if (answersError) {
      throw answersError;
    }

    const totalAnswers =
      answers?.length ?? 0;

    const totalScore =
      answers?.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.score ?? 0
          ),
        0
      ) ?? 0;

    const {
      count: totalQuestions,
    } =
      await supabase
        .from(
          "quiz_questions"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head: true,
          }
        )
        .eq(
          "quiz_session_id",
          quizSessionId
        );

    const complete =
      totalQuestions !==
        null &&
      totalQuestions > 0 &&
      totalAnswers >=
        totalQuestions;

    const averageScore =
      totalAnswers > 0
        ? totalScore /
          totalAnswers
        : 0;

    /*
     * ------------------------------------------
     * 9. Complete quiz
     * ------------------------------------------
     */

    if (complete) {
      await supabase
        .from(
          "quiz_sessions"
        )
        .update({
          status:
            "completed",

          score:
            Number(
              averageScore.toFixed(
                2
              )
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
            session.project_id,

          event_type:
            "QUIZ_COMPLETED",

          metadata: {
            quizSessionId,
            score:
              averageScore,
            totalQuestions,
          },
        });
    }

    return NextResponse.json({
      answer: {
        id:
          savedAnswer.id,

        isCorrect:
          savedAnswer.is_correct,

        score:
          savedAnswer.score,

        feedback:
          savedAnswer.feedback,

        explanation:
          question.explanation,
      },

      mastery:
        masteryResult,

      progress: {
        answered:
          totalAnswers,

        total:
          totalQuestions ??
          0,

        complete,

        score:
          Number(
            averageScore.toFixed(
              2
            )
          ),
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
            : "Could not submit quiz answer.",
      },
      {
        status: 500,
      }
    );
  }
}