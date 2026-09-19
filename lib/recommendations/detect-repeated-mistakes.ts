import { createClient } from "@/lib/supabase/server";

export type RepeatedMistake = {
  conceptId: string;
  conceptName: string;
  mistakeCount: number;
  lastSeen: string;
  pattern: "application" | "knowledge" | "unknown";
};

export async function detectRepeatedMistakes(
  userId: string,
  projectId: string
): Promise<RepeatedMistake[]> {
  const supabase = await createClient();

  /*
   * Get questions connected to concepts.
   */

  const {
    data: questions,
    error: questionsError,
  } =
    await supabase
      .from("quiz_questions")
      .select(`
        id,
        concept_id,
        question,
        concepts (
          id,
          name
        )
      `)
      .eq("project_id", projectId)
      .not("concept_id", "is", null);

  if (questionsError) {
    throw questionsError;
  }

  if (!questions?.length) {
    return [];
  }

  const questionIds =
    questions.map(
      (question) =>
        question.id
    );

  /*
   * Get incorrect answers.
   */

  const {
    data: answers,
    error: answersError,
  } =
    await supabase
      .from("quiz_answers")
      .select(`
        quiz_question_id,
        answer,
        feedback,
        evaluated_at,
        created_at,
        is_correct
      `)
      .eq("user_id", userId)
      .eq("is_correct", false)
      .in(
        "quiz_question_id",
        questionIds
      )
      .order("created_at", {
        ascending: false,
      });

  if (answersError) {
    throw answersError;
  }

  const mistakeMap =
    new Map<
      string,
      {
        conceptId: string;
        conceptName: string;
        count: number;
        lastSeen: string;
        applicationSignals: number;
      }
    >();

  for (const answer of answers ?? []) {
    const question =
      questions.find(
        (item) =>
          item.id ===
          answer.quiz_question_id
      );

    if (
      !question?.concept_id
    ) {
      continue;
    }

    const concept =
      Array.isArray(
        question.concepts
      )
        ? question.concepts[0]
        : question.concepts;

    const existing =
      mistakeMap.get(
        question.concept_id
      );

    const feedback =
      answer.feedback
        ?.toLowerCase() ?? "";

    const answerText =
      answer.answer
        ?.toLowerCase() ?? "";

    const applicationSignal =
      feedback.includes(
        "apply"
      ) ||
      feedback.includes(
        "application"
      ) ||
      feedback.includes(
        "example"
      ) ||
      feedback.includes(
        "strategy"
      ) ||
      answerText.length > 0;

    if (existing) {
      existing.count += 1;

      existing.applicationSignals +=
        applicationSignal
          ? 1
          : 0;

      if (
        answer.created_at >
        existing.lastSeen
      ) {
        existing.lastSeen =
          answer.created_at;
      }
    } else {
      mistakeMap.set(
        question.concept_id,
        {
          conceptId:
            question.concept_id,

          conceptName:
            concept?.name ??
            "Unknown concept",

          count: 1,

          lastSeen:
            answer.created_at,

          applicationSignals:
            applicationSignal
              ? 1
              : 0,
        }
      );
    }
  }

  return Array.from(
    mistakeMap.values()
  )
    .filter(
      (mistake) =>
        mistake.count >= 2
    )
    .map((mistake) => ({
      conceptId:
        mistake.conceptId,

      conceptName:
        mistake.conceptName,

      mistakeCount:
        mistake.count,

      lastSeen:
        mistake.lastSeen,

      pattern:
        mistake.applicationSignals >
        0
          ? "application"
          : "unknown",
    }))
    .sort(
      (a, b) =>
        b.mistakeCount -
        a.mistakeCount
    );
}