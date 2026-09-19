"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog";
import { SpacesGrid } from "@/components/spaces/spaces-grid";
import { createClient } from "@/lib/supabase/client";

type Space = {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
  averageMastery: number;
};

type Project = {
  id: string;
  space_id: string;
};

type MasteryRow = {
  project_id: string;
  mastery_score: number | string;
};

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // --------------------------------------------------
      // STEP 1:
      // Get the currently authenticated user
      // --------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You must be logged in to view your spaces.");
        setSpaces([]);
        return;
      }

      // --------------------------------------------------
      // STEP 2:
      // Get spaces belonging to the current user
      // --------------------------------------------------

      const { data: spacesData, error: spacesError } =
        await supabase
          .from("spaces")
          .select("id, name, description")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (spacesError) {
        throw spacesError;
      }

      const safeSpaces = spacesData ?? [];

      // --------------------------------------------------
      // STEP 3:
      // Get projects belonging to the current user
      // --------------------------------------------------

      const { data: projectsData, error: projectsError } =
        await supabase
          .from("projects")
          .select("id, space_id")
          .eq("user_id", user.id);

      if (projectsError) {
        throw projectsError;
      }

      const projects: Project[] = projectsData ?? [];

      // --------------------------------------------------
      // STEP 4:
      // Get mastery records for the user's projects
      // --------------------------------------------------

      const projectIds = projects.map(
        (project) => project.id
      );

      let masteryRows: MasteryRow[] = [];

      if (projectIds.length > 0) {
        const {
          data: masteryData,
          error: masteryError,
        } = await supabase
          .from("concept_mastery")
          .select("project_id, mastery_score")
          .in("project_id", projectIds)
          .eq("user_id", user.id);

        if (masteryError) {
          throw masteryError;
        }

        masteryRows = masteryData ?? [];
      }

      // --------------------------------------------------
      // STEP 5:
      // Build the data required by our SpaceCard component
      // --------------------------------------------------

      const formattedSpaces: Space[] = safeSpaces.map(
        (space) => {
          // Find all projects belonging to this space
          const spaceProjects = projects.filter(
            (project) => project.space_id === space.id
          );

          // Get project IDs for this particular space
          const spaceProjectIds = new Set(
            spaceProjects.map((project) => project.id)
          );

          // Find mastery records belonging to this space
          const spaceMasteryRows = masteryRows.filter(
            (mastery) =>
              spaceProjectIds.has(mastery.project_id)
          );

          // Calculate average mastery
          const averageMastery =
            spaceMasteryRows.length > 0
              ? Math.round(
                  spaceMasteryRows.reduce(
                    (total, row) =>
                      total +
                      Number(row.mastery_score ?? 0),
                    0
                  ) / spaceMasteryRows.length
                )
              : 0;

          return {
            id: space.id,
            name: space.name,
            description: space.description,
            projectCount: spaceProjects.length,
            averageMastery,
          };
        }
      );

      setSpaces(formattedSpaces);
    } catch (error) {
      console.error("Load spaces error:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to load spaces.");
      }

      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // Load spaces when the page first opens
  // --------------------------------------------------

  useEffect(() => {
    void loadSpaces();
  }, [loadSpaces]);

  // --------------------------------------------------
  // Page UI
  // --------------------------------------------------

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">

          {/* -------------------------------------------
              PAGE HEADER
          -------------------------------------------- */}

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Workspace
              </p>

              <h1 className="text-3xl font-semibold tracking-tight">
                Your Spaces
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Organize your learning into focused workspaces.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background shadow-sm transition hover:opacity-90"
            >
              + New Space
            </button>
          </div>

          {/* -------------------------------------------
              ERROR MESSAGE
          -------------------------------------------- */}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* -------------------------------------------
              LOADING / SPACES
          -------------------------------------------- */}

          {loading ? (
            <SpacesLoading />
          ) : (
            <SpacesGrid spaces={spaces} />
          )}
        </div>
      </main>

      {/* ---------------------------------------------
          CREATE SPACE DIALOG
      ---------------------------------------------- */}

      <CreateSpaceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          void loadSpaces();
        }}
      />
    </AppShell>
  );
}

// ----------------------------------------------------
// Loading skeleton
// ----------------------------------------------------

function SpacesLoading() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border bg-muted/30"
        />
      ))}
    </div>
  );
}