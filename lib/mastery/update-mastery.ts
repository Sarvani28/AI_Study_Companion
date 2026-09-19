import { createClient } from "@/lib/supabase/server";

/**
 * Calculate the new mastery score.
 *
 * Prototype formula:
 *
 * old mastery × 0.7
 * +
 * assessment score × 0.3
 */
export function calculateNewMastery(
  oldMastery: number,
  assessmentScore: number
): number {
  const safeOldMastery = Math.min(
    100,
    Math.max(0, oldMastery)
  );

  const safeAssessmentScore =
    Math.min(
      100,
      Math.max(0, assessmentScore)
    );

  const result =
    safeOldMastery * 0.7 +
    safeAssessmentScore * 0.3;

  return Number(
    result.toFixed(2)
  );
}

/**
 * Determine the mastery trend.
 *
 * Prototype rules:
 *
 * change > 5  => Improving
 * change < -5 => Needs Attention
 * otherwise   => Stable
 */
export function getMasteryTrend(
  change: number
):
  | "Improving"
  | "Stable"
  | "Needs Attention" {
  if (change > 5) {
    return "Improving";
  }

  if (change < -5) {
    return "Needs Attention";
  }

  return "Stable";
}

export type UpdateMasteryInput = {
  userId: string;
  projectId: string;
  conceptId: string;

  /**
   * Assessment score from 0 to 100.
   */
  assessmentScore: number;

  /**
   * Where this assessment came from.
   */
  source?:
    | "multiple_choice"
    | "open_ended"
    | "quiz"
    | "manual";
};

export type MasteryUpdateResult = {
  conceptId: string;
  conceptName: string;

  oldMastery: number;
  assessmentScore: number;
  newMastery: number;

  change: number;

  trend:
    | "Improving"
    | "Stable"
    | "Needs Attention";

  attemptCount: number;
  correctCount: number;
};

export async function updateConceptMastery(
  input: UpdateMasteryInput
): Promise<MasteryUpdateResult> {
  const supabase =
    await createClient();

  /*
   * ------------------------------------------
   * 1. Verify project ownership
   * ------------------------------------------
   */

  const {
    data: project,
    error: projectError,
  } =
    await supabase
      .from("projects")
      .select("id")
      .eq(
        "id",
        input.projectId
      )
      .eq(
        "user_id",
        input.userId
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
   * ------------------------------------------
   * 2. Load concept
   * ------------------------------------------
   */

  const {
    data: concept,
    error: conceptError,
  } =
    await supabase
      .from("concepts")
      .select(
        "id, name"
      )
      .eq(
        "id",
        input.conceptId
      )
      .eq(
        "project_id",
        input.projectId
      )
      .maybeSingle();

  if (conceptError) {
    throw conceptError;
  }

  if (!concept) {
    throw new Error(
      "Concept not found."
    );
  }

  /*
   * ------------------------------------------
   * 3. Load existing mastery
   * ------------------------------------------
   */

  const {
    data: existing,
    error: masteryError,
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
        input.userId
      )
      .eq(
        "project_id",
        input.projectId
      )
      .eq(
        "concept_id",
        input.conceptId
      )
      .maybeSingle();

  if (masteryError) {
    throw masteryError;
  }

  const oldMastery = Number(
    existing?.mastery_score ?? 0
  );

  const assessmentScore =
    Math.min(
      100,
      Math.max(
        0,
        input.assessmentScore
      )
    );

  /*
   * ------------------------------------------
   * 4. Calculate mastery
   * ------------------------------------------
   */

  const newMastery =
    calculateNewMastery(
      oldMastery,
      assessmentScore
    );

  const change =
    Number(
      (
        newMastery -
        oldMastery
      ).toFixed(2)
    );

  const trend =
    getMasteryTrend(
      change
    );

  /*
   * ------------------------------------------
   * 5. Update attempts
   * ------------------------------------------
   */

  const previousAttempts =
    Number(
      existing?.attempt_count ??
        0
    );

  const previousCorrect =
    Number(
      existing?.correct_count ??
        0
    );

  const attemptCount =
    previousAttempts + 1;

  const correctCount =
    previousCorrect +
    (assessmentScore >= 70
      ? 1
      : 0);

  /*
   * ------------------------------------------
   * 6. Confidence
   * ------------------------------------------
   */

  const previousConfidence =
    Number(
      existing?.confidence ?? 0
    );

  const confidence =
    Math.min(
      100,
      previousConfidence + 8
    );

  const masteryPayload = {
    user_id:
      input.userId,

    project_id:
      input.projectId,

    concept_id:
      input.conceptId,

    mastery_score:
      newMastery,

    confidence:
      Number(
        confidence.toFixed(2)
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

  /*
   * ------------------------------------------
   * 7. Save mastery
   * ------------------------------------------
   */

  if (existing) {
    const {
      error: updateError,
    } =
      await supabase
        .from(
          "concept_mastery"
        )
        .update(
          masteryPayload
        )
        .eq(
          "id",
          existing.id
        )
        .eq(
          "user_id",
          input.userId
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
        .insert(
          masteryPayload
        );

    if (insertError) {
      throw insertError;
    }
  }

  /*
   * ------------------------------------------
   * 8. Save mastery history
   * ------------------------------------------
   */

  const {
    error: historyError,
  } =
    await supabase
      .from(
        "mastery_history"
      )
      .insert({
        user_id:
          input.userId,

        project_id:
          input.projectId,

        concept_id:
          input.conceptId,

        old_mastery:
          oldMastery,

        assessment_score:
          assessmentScore,

        new_mastery:
          newMastery,

        change,

        trend,

        source:
          input.source ??
          "assessment",
      });

  if (historyError) {
    throw historyError;
  }

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
        input.userId,

      project_id:
        input.projectId,

      event_type:
        "MASTERY_UPDATED",

      metadata: {
        conceptId:
          input.conceptId,

        concept:
          concept.name,

        oldMastery,

        assessmentScore,

        newMastery,

        change,

        trend,

        source:
          input.source ??
          "assessment",
      },
    });

  return {
    conceptId:
      input.conceptId,

    conceptName:
      concept.name,

    oldMastery,

    assessmentScore,

    newMastery,

    change,

    trend,

    attemptCount,

    correctCount,
  };
}