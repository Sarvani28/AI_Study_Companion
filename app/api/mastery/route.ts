import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const projectId =
      searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        {
          error: "projectId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createClient();

    // Authentication
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

    // Verify project ownership
    const {
      data: project,
      error: projectError,
    } =
      await supabase
        .from("projects")
        .select(
          "id, name, learning_goal"
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
          error: "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Current mastery
    const {
      data: mastery,
      error: masteryError,
    } =
      await supabase
        .from("concept_mastery")
        .select(
          `
            id,
            concept_id,
            mastery_score,
            confidence,
            attempt_count,
            correct_count,
            last_assessed_at,
            trend,
            concepts (
              id,
              name,
              description
            )
          `
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
          "mastery_score",
          {
            ascending: true,
          }
        );

    if (masteryError) {
      throw masteryError;
    }

    // Mastery history
    const {
      data: history,
      error: historyError,
    } =
      await supabase
        .from("mastery_history")
        .select(
          `
            id,
            concept_id,
            old_mastery,
            assessment_score,
            new_mastery,
            change,
            trend,
            source,
            created_at,
            concepts (
              id,
              name
            )
          `
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
        )
        .limit(200);

    if (historyError) {
      throw historyError;
    }

    // Overall mastery
    const masteryScores =
      (mastery ?? []).map(
        (item) =>
          Number(
            item.mastery_score
          )
      );

    const overallMastery =
      masteryScores.length > 0
        ? masteryScores.reduce(
            (
              total,
              value
            ) =>
              total + value,
            0
          ) /
          masteryScores.length
        : 0;

    // Trend counts
    const trendCounts = {
      improving: 0,
      stable: 0,
      needsAttention: 0,
    };

    for (
      const item of mastery ?? []
    ) {
      if (
        item.trend ===
        "Improving"
      ) {
        trendCounts.improving++;
      } else if (
        item.trend ===
        "Needs Attention"
      ) {
        trendCounts.needsAttention++;
      } else {
        trendCounts.stable++;
      }
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        learningGoal:
          project.learning_goal,
      },

      overallMastery:
        Number(
          overallMastery.toFixed(1)
        ),

      mastery:
        (mastery ?? []).map(
          (item) => ({
            id: item.id,
            conceptId:
              item.concept_id,

            conceptName:
              Array.isArray(
                item.concepts
              )
                ? item.concepts[0]
                    ?.name ??
                  "Unknown concept"
                : item.concepts
                    ?.name ??
                  "Unknown concept",

            masteryScore:
              Number(
                item.mastery_score
              ),

            confidence:
              Number(
                item.confidence
              ),

            attemptCount:
              item.attempt_count,

            correctCount:
              item.correct_count,

            lastAssessedAt:
              item.last_assessed_at,

            trend:
              item.trend ??
              "Stable",
          })
        ),

      history:
        (history ?? []).map(
          (item) => ({
            id: item.id,

            conceptId:
              item.concept_id,

            conceptName:
              Array.isArray(
                item.concepts
              )
                ? item.concepts[0]
                    ?.name ??
                  "Unknown concept"
                : item.concepts
                    ?.name ??
                  "Unknown concept",

            oldMastery:
              Number(
                item.old_mastery
              ),

            assessmentScore:
              Number(
                item.assessment_score
              ),

            newMastery:
              Number(
                item.new_mastery
              ),

            change:
              Number(
                item.change
              ),

            trend:
              item.trend,

            source:
              item.source,

            createdAt:
              item.created_at,
          })
        ),

      trendCounts,
    });
  } catch (error) {
    console.error(
      "Mastery API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load mastery.",
      },
      {
        status: 500,
      }
    );
  }
}