import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ContinueLearning } from "@/components/dashboard/continue-learning";
import { LearningStats } from "@/components/dashboard/learning-stats";
import { RecommendedNext } from "@/components/dashboard/recommended-next";
import { RecentActivity } from "@/components/dashboard/recent-activity";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .eq("user_id", user.id)
    .order("updated_at", {
      ascending: false,
    })
    .limit(1);

  const project = projects?.[0] ?? null;

  let mastery = 0;
  let quizzes = 0;
  let accuracy = 0;

  let recommendation: {
    title: string;
    description: string;
    action: string | null;
  } | null = null;

  if (project) {
    const { data: masteryRows } = await supabase
      .from("concept_mastery")
      .select("mastery_score")
      .eq("user_id", user.id)
      .eq("project_id", project.id);

    if (masteryRows && masteryRows.length > 0) {
      const total = masteryRows.reduce(
        (sum, row) => sum + Number(row.mastery_score || 0),
        0
      );

      mastery = Math.round(total / masteryRows.length);
    }

    const { count: quizCount } = await supabase
      .from("quiz_sessions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("status", "completed");

    quizzes = quizCount ?? 0;

    const { data: answers } = await supabase
      .from("quiz_answers")
      .select("is_correct")
      .eq("user_id", user.id);

    if (answers && answers.length > 0) {
      const correct = answers.filter(
        (answer) => answer.is_correct === true
      ).length;

      accuracy = Math.round(
        (correct / answers.length) * 100
      );
    }

    const { data: recommendations } = await supabase
      .from("recommendations")
      .select("title, description, action")
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .eq("status", "active")
      .order("priority", {
        ascending: false,
      })
      .limit(1);

    recommendation = recommendations?.[0] ?? null;
  }

  const { data: activities } = await supabase
    .from("activity_events")
    .select("id, event_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f7f8fc]">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="space-y-10">
            <DashboardHeader />

            <ContinueLearning
              project={project}
              mastery={mastery}
            />

            <LearningStats
              mastery={mastery}
              quizzes={quizzes}
              accuracy={accuracy}
            />

            <RecommendedNext
              recommendation={recommendation}
            />

            <RecentActivity
              activities={activities ?? []}
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}