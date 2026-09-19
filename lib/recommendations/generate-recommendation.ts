import { createClient } from "@/lib/supabase/server";
import {
  detectRepeatedMistakes,
} from "@/lib/recommendations/detect-repeated-mistakes";

type WeakConcept = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
};

type RecommendationResult = {
  id: string;
  conceptId: string | null;
  title: string;
  description: string;
  action: string;
  priority: number;
};

export async function generateRecommendation(
  userId: string,
  projectId: string
): Promise<RecommendationResult | null> {
  const supabase = await createClient();

  /*
   * ------------------------------------------
   * 1. Find weakest concepts
   * ------------------------------------------
   */

  const {
    data: masteryRows,
    error: masteryError,
  } = await supabase
    .from("concept_mastery")
    .select(`
      concept_id,
      mastery_score,
      concepts (
        id,
        name
      )
    `)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("mastery_score", {
      ascending: true,
    })
    .limit(5);

  if (masteryError) {
    throw masteryError;
  }

  if (!masteryRows?.length) {
    return null;
  }

  const weakConcepts: WeakConcept[] =
    masteryRows.map((row) => {
      const concept = Array.isArray(row.concepts)
        ? row.concepts[0]
        : row.concepts;

      return {
        conceptId: row.concept_id,
        conceptName:
          concept?.name ?? "Unknown concept",
        masteryScore: Number(
          row.mastery_score
        ),
      };
    });

  /*
   * The weakest concept is the first concept
   * because the query is ordered by mastery
   * ascending.
   */

  const weakest = weakConcepts[0];

  /*
   * ------------------------------------------
   * 2. Detect repeated mistakes
   * ------------------------------------------
   */

  const repeatedMistakes =
    await detectRepeatedMistakes(
      userId,
      projectId
    );

  /*
   * Find repeated mistakes specifically
   * associated with the weakest concept.
   */

  const repeatedMistake =
    repeatedMistakes.find(
      (item) =>
        item.conceptId ===
        weakest.conceptId
    );

  /*
   * ------------------------------------------
   * 3. Calculate recommendation priority
   * ------------------------------------------
   *
   * Lower mastery = higher priority.
   *
   * Repeated mistakes add additional priority.
   */

  const repeatedMistakeBonus =
    repeatedMistake
      ? repeatedMistake.mistakeCount * 5
      : 0;

  const priority =
    Math.max(
      1,
      Math.round(
        100 -
          weakest.masteryScore +
          repeatedMistakeBonus
      )
    );

  /*
   * ------------------------------------------
   * 4. Build recommendation title
   * ------------------------------------------
   */

  const title =
    `Review ${weakest.conceptName}`;

  /*
   * ------------------------------------------
   * 5. Build recommendation description
   * ------------------------------------------
   */

  const description =
    repeatedMistake
      ? `Your recent answers suggest that you understand the purpose of ${weakest.conceptName}, but you have difficulty applying it. You have struggled with this concept in ${repeatedMistake.mistakeCount} recent questions.`
      : `Your current mastery of ${weakest.conceptName} is ${Math.round(weakest.masteryScore)}%. A focused review can help strengthen this concept.`;

  /*
   * ------------------------------------------
   * 6. Build recommended action
   * ------------------------------------------
   */

  const action =
    repeatedMistake
      ? "Review the worked examples and take a targeted 3-question assessment."
      : "Review the relevant material and take a short assessment.";

  /*
   * ------------------------------------------
   * 7. Check for existing active
   *    recommendation
   * ------------------------------------------
   *
   * We don't want to create the same active
   * recommendation every time the quiz ends.
   */

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("recommendations")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("concept_id", weakest.conceptId)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return null;
  }

  /*
   * ------------------------------------------
   * 8. Determine recommendation type
   * ------------------------------------------
   */

  const type =
    repeatedMistake
      ? "repeated_mistake"
      : "weak_concept";

  /*
   * ------------------------------------------
   * 9. Save recommendation
   * ------------------------------------------
   */

  const {
    data: recommendation,
    error: recommendationError,
  } = await supabase
    .from("recommendations")
    .insert({
      user_id: userId,

      project_id: projectId,

      concept_id:
        weakest.conceptId,

      type,

      title,

      description,

      action,

      priority,

      status: "active",
    })
    .select()
    .single();

  if (recommendationError) {
    throw recommendationError;
  }

  /*
   * ------------------------------------------
   * 10. Record activity event
   * ------------------------------------------
   */

  const { error: activityError } =
    await supabase
      .from("activity_events")
      .insert({
        user_id: userId,

        project_id: projectId,

        event_type:
          "RECOMMENDATION_CREATED",

        metadata: {
          recommendationId:
            recommendation.id,

          conceptId:
            weakest.conceptId,

          concept:
            weakest.conceptName,

          mastery:
            weakest.masteryScore,

          repeatedMistakes:
            repeatedMistake
              ?.mistakeCount ?? 0,

          pattern:
            repeatedMistake
              ?.pattern ?? null,

          priority,

          type,
        },
      });

  if (activityError) {
    console.error(
      "Failed to record recommendation activity:",
      activityError
    );
  }

  /*
   * ------------------------------------------
   * 11. Return recommendation
   * ------------------------------------------
   */

  return {
    id: recommendation.id,

    conceptId:
      recommendation.concept_id,

    title:
      recommendation.title,

    description:
      recommendation.description,

    action:
      recommendation.action,

    priority:
      recommendation.priority,
  };
}