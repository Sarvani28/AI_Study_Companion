import { createClient } from "@/lib/supabase/server";

export type AdaptiveConcept = {
  id: string;
  name: string;
  description: string | null;

  masteryScore: number;

  weaknessScore: number;
  mistakeFrequency: number;
  recency: number;
  assessmentNeed: number;
  goalImportance: number;

  priority: number;

  attemptCount: number;
  correctCount: number;

  lastAssessedAt: string | null;
  lastMistakeAt: string | null;
};

export type QuestionAllocation = {
  conceptId: string;
  conceptName: string;
  priority: number;
  questionCount: number;
};

function clamp(
  value: number,
  min = 0,
  max = 1
) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function daysSince(
  date: string | null
): number | null {
  if (!date) {
    return null;
  }

  const timestamp =
    new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const difference =
    Date.now() - timestamp;

  return Math.max(
    0,
    difference /
      (1000 * 60 * 60 * 24)
  );
}

/**
 * Calculate how recently a concept
 * was assessed.
 *
 * A very recent assessment gets
 * a higher score.
 */
function calculateRecency(
  lastAssessedAt: string | null
): number {
  const days =
    daysSince(lastAssessedAt);

  if (days === null) {
    return 0.5;
  }

  /*
   * Full recency at day 0.
   * Approaches zero after 30 days.
   */
  return clamp(
    1 - days / 30
  );
}

/**
 * Calculate how recently the learner
 * made a mistake on this concept.
 *
 * A recent failure increases priority.
 */
function calculateMistakeRecency(
  lastMistakeAt: string | null
): number {
  const days =
    daysSince(lastMistakeAt);

  if (days === null) {
    return 0;
  }

  return clamp(
    1 - days / 30
  );
}

/**
 * Learning goal importance.
 *
 * We use a deterministic signal:
 * if the concept appears in the learning
 * goal, it receives higher importance.
 *
 * Otherwise it gets a moderate baseline
 * rather than being completely ignored.
 */
function calculateGoalImportance(
  conceptName: string,
  learningGoal: string | null
): number {
  if (!learningGoal?.trim()) {
    return 0.25;
  }

  const normalizedGoal =
    learningGoal.toLowerCase();

  const normalizedConcept =
    conceptName.toLowerCase();

  if (
    normalizedGoal.includes(
      normalizedConcept
    )
  ) {
    return 1;
  }

  const conceptWords =
    normalizedConcept
      .split(/\s+/)
      .filter(
        (word) => word.length >= 4
      );

  if (
    conceptWords.length === 0
  ) {
    return 0.25;
  }

  const matches =
    conceptWords.filter(
      (word) =>
        normalizedGoal.includes(
          word
        )
    ).length;

  return clamp(
    matches /
      conceptWords.length
  );
}

export async function calculateAdaptivePriorities(
  projectId: string,
  userId: string
): Promise<AdaptiveConcept[]> {
  const supabase =
    await createClient();

  /*
   * --------------------------------------------------
   * 1. Load project + learning goal
   * --------------------------------------------------
   */

  const {
    data: project,
    error: projectError,
  } =
    await supabase
      .from("projects")
      .select(
        "id, learning_goal"
      )
      .eq(
        "id",
        projectId
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!project) {
    throw new Error(
      "Project not found."
    );
  }

  /*
   * --------------------------------------------------
   * 2. Load concepts
   * --------------------------------------------------
   */

  const {
    data: concepts,
    error: conceptsError,
  } =
    await supabase
      .from("concepts")
      .select(
        "id, name, description"
      )
      .eq(
        "project_id",
        projectId
      )
      .order(
        "name",
        {
          ascending: true,
        }
      );

  if (conceptsError) {
    throw conceptsError;
  }

  /*
   * --------------------------------------------------
   * 3. Load mastery
   * --------------------------------------------------
   */

  const {
    data: masteryRows,
    error: masteryError,
  } =
    await supabase
      .from("concept_mastery")
      .select(
        `
          concept_id,
          mastery_score,
          attempt_count,
          correct_count,
          last_assessed_at
        `
      )
      .eq(
        "project_id",
        projectId
      )
      .eq(
        "user_id",
        userId
      );

  if (masteryError) {
    throw masteryError;
  }

  /*
   * --------------------------------------------------
   * 4. Load recent answers
   * --------------------------------------------------
   */

  const {
    data: recentAnswers,
    error: answersError,
  } =
    await supabase
      .from("quiz_answers")
      .select(
        `
          id,
          answer,
          is_correct,
          score,
          created_at,
          quiz_question_id,
          quiz_questions!inner (
            concept_id,
            project_id
          )
        `
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "quiz_questions.project_id",
        projectId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(100);

  if (answersError) {
    throw answersError;
  }

  /*
   * --------------------------------------------------
   * 5. Build maps
   * --------------------------------------------------
   */

  const masteryMap =
    new Map<
      string,
      {
        masteryScore: number;
        attemptCount: number;
        correctCount: number;
        lastAssessedAt:
          | string
          | null;
      }
    >();

  for (
    const row of masteryRows ??
    []
  ) {
    masteryMap.set(
      row.concept_id,
      {
        masteryScore:
          Number(
            row.mastery_score ??
              0
          ),
        attemptCount:
          Number(
            row.attempt_count ??
              0
          ),
        correctCount:
          Number(
            row.correct_count ??
              0
          ),
        lastAssessedAt:
          row.last_assessed_at,
      }
    );
  }

  const answerMap =
    new Map<
      string,
      {
        attempts: number;
        mistakes: number;
        lastMistakeAt:
          | string
          | null;
      }
    >();

  for (
    const answer of recentAnswers ??
    []
  ) {
    const quizQuestion =
      Array.isArray(
        answer.quiz_questions
      )
        ? answer.quiz_questions[0]
        : answer.quiz_questions;

    const conceptId =
      quizQuestion?.concept_id;

    if (!conceptId) {
      continue;
    }

    const existing =
      answerMap.get(
        conceptId
      ) ?? {
        attempts: 0,
        mistakes: 0,
        lastMistakeAt: null,
      };

    existing.attempts += 1;

    if (
      answer.is_correct ===
      false
    ) {
      existing.mistakes += 1;

      if (
        !existing.lastMistakeAt
      ) {
        existing.lastMistakeAt =
          answer.created_at;
      }
    }

    answerMap.set(
      conceptId,
      existing
    );
  }

  /*
   * --------------------------------------------------
   * 6. Calculate adaptive priority
   * --------------------------------------------------
   *
   * PRD formula:
   *
   * weaknessScore       * 0.35
   * mistakeFrequency    * 0.25
   * recency             * 0.15
   * assessmentNeed      * 0.15
   * goalImportance      * 0.10
   */

  const adaptiveConcepts: AdaptiveConcept[] =
    (concepts ?? []).map(
      (concept) => {
        const mastery =
          masteryMap.get(
            concept.id
          );

        const answers =
          answerMap.get(
            concept.id
          );

        const masteryScore =
          mastery?.masteryScore ??
          0;

        /*
         * Low mastery = high weakness.
         */
        const weaknessScore =
          clamp(
            1 -
              masteryScore /
                100
          );

        /*
         * Recent incorrect answers
         * divided by recent attempts.
         */
        const mistakeFrequency =
          answers &&
          answers.attempts > 0
            ? clamp(
                answers.mistakes /
                  answers.attempts
              )
            : 0;

        /*
         * Recent activity.
         *
         * We consider both assessment
         * recency and mistake recency.
         */
        const assessmentRecency =
          calculateRecency(
            mastery
              ?.lastAssessedAt ??
              null
          );

        const mistakeRecency =
          calculateMistakeRecency(
            answers
              ?.lastMistakeAt ??
              null
          );

        const recency =
          Math.max(
            assessmentRecency,
            mistakeRecency
          );

        /*
         * If there is no assessment history,
         * we need assessment.
         */
        const assessmentNeed =
          mastery &&
          mastery.attemptCount > 0
            ? clamp(
                1 -
                  masteryScore /
                    100
              )
            : 1;

        const goalImportance =
          calculateGoalImportance(
            concept.name,
            project.learning_goal
          );

        const priority =
          weaknessScore * 0.35 +
          mistakeFrequency * 0.25 +
          recency * 0.15 +
          assessmentNeed * 0.15 +
          goalImportance * 0.10;

        return {
          id: concept.id,
          name: concept.name,
          description:
            concept.description,

          masteryScore,

          weaknessScore,
          mistakeFrequency,
          recency,
          assessmentNeed,
          goalImportance,

          priority,

          attemptCount:
            mastery
              ?.attemptCount ?? 0,

          correctCount:
            mastery
              ?.correctCount ?? 0,

          lastAssessedAt:
            mastery
              ?.lastAssessedAt ??
            null,

          lastMistakeAt:
            answers
              ?.lastMistakeAt ??
            null,
        };
      }
    );

  /*
   * Highest priority first.
   */
  return adaptiveConcepts.sort(
    (a, b) =>
      b.priority -
      a.priority
  );
}

/**
 * Allocate quiz questions.
 *
 * Higher priority concepts receive
 * more questions.
 */
export function allocateQuestions(
  concepts: AdaptiveConcept[],
  totalQuestions = 10
): QuestionAllocation[] {
  if (
    concepts.length === 0 ||
    totalQuestions <= 0
  ) {
    return [];
  }

  /*
   * Only use concepts that actually
   * need assessment.
   *
   * Keep a reasonable number so a
   * 10-question quiz doesn't attempt
   * to cover 30 concepts.
   */
  const selected =
    concepts.slice(
      0,
      Math.min(
        concepts.length,
        totalQuestions
      )
    );

  /*
   * Every selected concept gets
   * at least one question.
   */
  const allocation = selected.map(
    (concept) => ({
      conceptId:
        concept.id,
      conceptName:
        concept.name,
      priority:
        concept.priority,
      questionCount: 1,
    })
  );

  let remaining =
    totalQuestions -
    allocation.length;

  /*
   * Give remaining questions to
   * concepts according to priority.
   */
  while (
    remaining > 0
  ) {
    const target =
      allocation.reduce(
        (
          best,
          current
        ) =>
          current.priority >
          best.priority
            ? current
            : best
      );

    target.questionCount += 1;

    /*
     * Slightly reduce its effective
     * priority so the same concept
     * doesn't receive every question.
     */
    target.priority *= 0.82;

    remaining -= 1;
  }

  /*
   * Restore actual priority ordering
   * for display/debugging.
   */
  return allocation.sort(
    (a, b) =>
      b.questionCount -
      a.questionCount
  );
}