"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  description: string | null;
  mastery: number;
  materialCount: number;
  quizCount: number;
  accuracy: number;
};

type Space = {
  id: string;
  name: string;
  description: string | null;
};

type SpacePageProps = {
  params: Promise<{
    spaceId: string;
  }>;
};

export default function SpacePage({
  params,
}: SpacePageProps) {
  /*
   * Next.js provides dynamic route params as a Promise
   * in your current version.
   *
   * React's use() unwraps that Promise.
   */
  const { spaceId } = use(params);

  const supabase = createClient();

  const [space, setSpace] = useState<Space | null>(
    null
  );

  const [projects, setProjects] = useState<Project[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [error, setError] = useState("");

  async function loadSpace() {
    setLoading(true);
    setError("");

    try {
      /*
       * ========================================================
       * GET CURRENT AUTHENTICATED USER
       * ========================================================
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      /*
       * ========================================================
       * LOAD SPACE
       * ========================================================
       *
       * We check BOTH:
       *
       * id = spaceId
       * user_id = current user
       *
       * This prevents users from loading another user's space.
       */

      const {
        data: spaceData,
        error: spaceError,
      } = await supabase
        .from("spaces")
        .select(
          "id, name, description"
        )
        .eq("id", spaceId)
        .eq("user_id", user.id)
        .single();

      if (spaceError) {
        console.error(
          "Space query error:",
          spaceError
        );

        setError(
          "Unable to load this space."
        );

        return;
      }

      if (!spaceData) {
        setError(
          "Space not found or you don't have access to it."
        );

        return;
      }

      setSpace(spaceData);

      /*
       * ========================================================
       * LOAD PROJECTS
       * ========================================================
       */

      const {
        data: projectsData,
        error: projectsError,
      } = await supabase
        .from("projects")
        .select(
          "id, name, description, learning_goal"
        )
        .eq("space_id", spaceId)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (projectsError) {
        throw projectsError;
      }

      const rawProjects =
        projectsData ?? [];

      /*
       * If the space doesn't contain projects,
       * we can stop here.
       */

      if (rawProjects.length === 0) {
        setProjects([]);
        return;
      }

      /*
       * ========================================================
       * PROJECT IDS
       * ========================================================
       */

      const projectIds =
        rawProjects.map(
          (project) => project.id
        );

      /*
       * ========================================================
       * LOAD MATERIALS
       * ========================================================
       */

      const {
        data: materialsData,
        error: materialsError,
      } = await supabase
        .from("materials")
        .select(
          "id, project_id"
        )
        .in(
          "project_id",
          projectIds
        )
        .eq(
          "user_id",
          user.id
        );

      if (materialsError) {
        throw materialsError;
      }

      /*
       * ========================================================
       * LOAD QUIZ SESSIONS
       * ========================================================
       */

      const {
        data: quizSessionsData,
        error: quizSessionsError,
      } = await supabase
        .from("quiz_sessions")
        .select(
          "id, project_id, score, status"
        )
        .in(
          "project_id",
          projectIds
        )
        .eq(
          "user_id",
          user.id
        );

      if (quizSessionsError) {
        throw quizSessionsError;
      }

      /*
       * ========================================================
       * LOAD CONCEPT MASTERY
       * ========================================================
       */

      const {
        data: masteryData,
        error: masteryError,
      } = await supabase
        .from("concept_mastery")
        .select(
          "project_id, mastery_score"
        )
        .in(
          "project_id",
          projectIds
        )
        .eq(
          "user_id",
          user.id
        );

      if (masteryError) {
        throw masteryError;
      }

      /*
       * ========================================================
       * BUILD PROJECT CARD DATA
       * ========================================================
       */

      const formattedProjects: Project[] =
        rawProjects.map(
          (project) => {
            /*
             * -----------------------------------------------
             * MATERIAL COUNT
             * -----------------------------------------------
             */

            const materialCount =
              (materialsData ?? []).filter(
                (material) =>
                  material.project_id ===
                  project.id
              ).length;

            /*
             * -----------------------------------------------
             * QUIZ SESSIONS
             * -----------------------------------------------
             */

            const projectQuizSessions =
              (
                quizSessionsData ?? []
              ).filter(
                (quiz) =>
                  quiz.project_id ===
                  project.id
              );

            /*
             * Only completed quizzes
             * count toward the displayed quiz count.
             */

            const completedQuizzes =
              projectQuizSessions.filter(
                (quiz) =>
                  quiz.status ===
                  "completed"
              );

            const quizCount =
              completedQuizzes.length;

            /*
             * -----------------------------------------------
             * QUIZ ACCURACY
             * -----------------------------------------------
             */

            const scoredQuizzes =
              completedQuizzes.filter(
                (quiz) =>
                  quiz.score !== null &&
                  quiz.score !== undefined
              );

            const accuracy =
              scoredQuizzes.length > 0
                ? Math.round(
                    scoredQuizzes.reduce(
                      (
                        sum,
                        quiz
                      ) =>
                        sum +
                        Number(
                          quiz.score ??
                            0
                        ),
                      0
                    ) /
                      scoredQuizzes.length
                  )
                : 0;

            /*
             * -----------------------------------------------
             * MASTERY
             * -----------------------------------------------
             */

            const projectMastery =
              (
                masteryData ?? []
              ).filter(
                (mastery) =>
                  mastery.project_id ===
                  project.id
              );

            const mastery =
              projectMastery.length > 0
                ? Math.round(
                    projectMastery.reduce(
                      (
                        sum,
                        item
                      ) =>
                        sum +
                        Number(
                          item.mastery_score ??
                            0
                        ),
                      0
                    ) /
                      projectMastery.length
                  )
                : 0;

            return {
              id: project.id,
              name: project.name,
              description:
                project.description,
              mastery,
              materialCount,
              quizCount,
              accuracy,
            };
          }
        );

      setProjects(
        formattedProjects
      );
    } catch (error) {
      console.error(
        "Load space error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load the space."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==========================================================
   * LOAD WHEN SPACE ID CHANGES
   * ==========================================================
   */

  useEffect(() => {
    loadSpace();
  }, [spaceId]);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">

          {/* ==================================================
              BACK TO SPACES
          =================================================== */}

          <Link
            href="/spaces"
            className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Spaces
          </Link>

          {/* ==================================================
              SPACE HEADER
          =================================================== */}

          {space && (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="mb-2 text-sm font-medium text-gray-400">
                  Learning Space
                </p>

                <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
                  {space.name}
                </h1>

                {space.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    {space.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setDialogOpen(true)
                }
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
              >
                + New Project
              </button>
            </div>
          )}

          {/* ==================================================
              ERROR
          =================================================== */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ==================================================
              PROJECTS
          =================================================== */}

          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">
                Projects
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Build focused learning experiences
                inside this space.
              </p>
            </div>

            {loading ? (
              <ProjectsLoading />
            ) : (
              <ProjectsGrid
                projects={projects}
              />
            )}
          </section>
        </div>
      </main>

      {/* ======================================================
          CREATE PROJECT DIALOG
      ======================================================= */}

      {space && (
        <CreateProjectDialog
          open={dialogOpen}
          spaceId={space.id}
          onClose={() =>
            setDialogOpen(false)
          }
          onCreated={loadSpace}
        />
      )}
    </AppShell>
  );
}

/*
 * ============================================================
 * LOADING SKELETON
 * ============================================================
 */

function ProjectsLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({
        length: 2,
      }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-gray-50"
        />
      ))}
    </div>
  );
}