import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { MasteryOverview } from "@/components/projects/mastery-overview";
import { ProjectOverviewHeader } from "@/components/projects/project-overview-header";
import { ProjectOverviewStats } from "@/components/projects/project-overview-stats";
import { RecentActivity } from "@/components/projects/recent-activity";
import { RecommendedNext } from "@/components/projects/recommended-next";
import { createClient } from "@/lib/supabase/server";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { projectId } = await params;

  const supabase = await createClient();

  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  /*
   * ============================================================
   * PROJECT
   * ============================================================
   */

  const { data: project } = await supabase
    .from("projects")
    .select(
      `
        id,
        space_id,
        name,
        description,
        learning_goal
      `
    )
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    notFound();
  }

  /*
   * ============================================================
   * SPACE
   * ============================================================
   */

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("id", project.space_id)
    .eq("user_id", user.id)
    .single();

  if (!space) {
    notFound();
  }

  /*
   * ============================================================
   * MATERIAL COUNT
   * ============================================================
   */

  const { count: materialCount } =
    await supabase
      .from("materials")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("project_id", projectId)
      .eq("user_id", user.id);

  /*
   * ============================================================
   * QUIZ SESSIONS
   * ============================================================
   */

  const { data: quizSessions } =
    await supabase
      .from("quiz_sessions")
      .select(
        "id, score, status, completed_at"
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id);

  const completedQuizzes =
    (quizSessions ?? []).filter(
      (quiz) =>
        quiz.status === "completed"
    );

  /*
   * Average quiz score.
   */

  const scoredQuizzes =
    completedQuizzes.filter(
      (quiz) =>
        quiz.score !== null &&
        quiz.score !== undefined
    );

  const quizScore =
    scoredQuizzes.length > 0
      ? Math.round(
          scoredQuizzes.reduce(
            (sum, quiz) =>
              sum +
              Number(
                quiz.score ?? 0
              ),
            0
          ) /
            scoredQuizzes.length
        )
      : 0;

  /*
   * ============================================================
   * QUIZ ANSWER ACCURACY
   * ============================================================
   */

  const { data: quizQuestions } =
    await supabase
      .from("quiz_questions")
      .select("id, quiz_session_id")
      .eq(
        "project_id",
        projectId
      );

  const quizQuestionIds =
    (quizQuestions ?? []).map(
      (question) => question.id
    );

  let accuracy = 0;

  if (quizQuestionIds.length > 0) {
    const { data: quizAnswers } =
      await supabase
        .from("quiz_answers")
        .select(
          "id, quiz_question_id, is_correct, score"
        )
        .in(
          "quiz_question_id",
          quizQuestionIds
        )
        .eq(
          "user_id",
          user.id
        );

    const answered =
      quizAnswers ?? [];

    if (answered.length > 0) {
      const correct =
        answered.filter(
          (answer) =>
            answer.is_correct === true
        ).length;

      accuracy = Math.round(
        (correct /
          answered.length) *
          100
      );
    }
  }

  /*
   * ============================================================
   * CONCEPT MASTERY
   * ============================================================
   */

  const { data: masteryRows } =
    await supabase
      .from("concept_mastery")
      .select(
        `
          id,
          concept_id,
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
        "user_id",
        user.id
      )
      .order(
        "mastery_score",
        {
          ascending: false,
        }
      );

  const conceptIds =
    (masteryRows ?? []).map(
      (row) => row.concept_id
    );

  let concepts: {
    id: string;
    name: string;
    mastery: number;
  }[] = [];

  if (conceptIds.length > 0) {
    const { data: conceptRows } =
      await supabase
        .from("concepts")
        .select(
          "id, name"
        )
        .in(
          "id",
          conceptIds
        );

    const conceptMap = new Map(
      (conceptRows ?? []).map(
        (concept) => [
          concept.id,
          concept.name,
        ]
      )
    );

    concepts =
      (masteryRows ?? []).map(
        (row) => ({
          id: row.id,
          name:
            conceptMap.get(
              row.concept_id
            ) ??
            "Unknown concept",
          mastery: Math.round(
            Number(
              row.mastery_score ?? 0
            )
          ),
        })
      );
  }

  /*
   * Overall mastery.
   */

  const overallMastery =
    concepts.length > 0
      ? Math.round(
          concepts.reduce(
            (sum, concept) =>
              sum +
              concept.mastery,
            0
          ) /
            concepts.length
        )
      : 0;

  /*
   * ============================================================
   * RECOMMENDATION
   * ============================================================
   */

  const { data: recommendation } =
    await supabase
      .from("recommendations")
      .select(
        `
          id,
          title,
          description,
          action,
          priority
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
      .eq(
        "status",
        "active"
      )
      .order(
        "priority",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  /*
   * ============================================================
   * RECENT ACTIVITY
   * ============================================================
   */

  const { data: activityRows } =
    await supabase
      .from("activity_events")
      .select(
        "id, event_type, created_at"
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
          ascending: false,
        }
      )
      .limit(5);

  const activities =
    (activityRows ?? []).map(
      (activity) => ({
        id: activity.id,
        eventType:
          activity.event_type,
        createdAt:
          activity.created_at,
      })
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">

          {/* ====================================================
              HEADER
          ===================================================== */}

          <ProjectOverviewHeader
            projectId={project.id}
            spaceId={space.id}
            spaceName={space.name}
            projectName={project.name}
            description={
              project.description
            }
          />

          {/* ====================================================
              OVERALL MASTERY
          ===================================================== */}

          <MasteryOverview
            overallMastery={
              overallMastery
            }
            concepts={concepts}
          />

          {/* ====================================================
              STATS
          ===================================================== */}

          <ProjectOverviewStats
            materialCount={
              materialCount ?? 0
            }
            quizScore={
              quizScore
            }
            accuracy={
              accuracy
            }
          />

          {/* ====================================================
              LOWER GRID
          ===================================================== */}

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Recommendation */}
            <RecommendedNext
              projectId={
                project.id
              }
              title={
                recommendation?.title ??
                null
              }
              description={
                recommendation?.description ??
                null
              }
              action={
                recommendation?.action ??
                null
              }
            />

            {/* Activity */}
            <RecentActivity
              activities={
                activities
              }
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}