"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Brain,
  ChevronDown,
  FileText,
  FolderKanban,
  Gauge,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const workspaceItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Spaces",
    href: "/spaces",
    icon: FolderKanban,
  },
];

const projectItems = [
  {
    label: "Overview",
    path: "",
    icon: Gauge,
  },
  {
    label: "Materials",
    path: "/materials",
    icon: FileText,
  },
  {
    label: "AI Tutor",
    path: "/tutor",
    icon: MessageCircle,
  },
  {
    label: "Quiz",
    path: "/quiz",
    icon: Target,
  },
  {
    label: "Mastery",
    path: "/mastery",
    icon: Brain,
  },
  {
    label: "Growth",
    path: "/growth",
    icon: BarChart3,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
];

const SELECTED_PROJECT_KEY =
  "studyai:selected-project-id";

export function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  /*
   * Project ID detected from the current URL.
   *
   * Examples:
   *
   * /projects/123
   * /projects/123/materials
   * /projects/123/tutor
   */
  const projectMatch = pathname.match(
    /^\/projects\/([^/]+)/
  );

  const routeProjectId = projectMatch?.[1] ?? null;

  /*
   * Keep a project ID in local state as well.
   *
   * This allows the sidebar to remember the last selected
   * project when the user navigates back to /spaces.
   */
  const [storedProjectId, setStoredProjectId] =
    useState<string | null>(null);

  /*
   * Read the previously selected project.
   */
  useEffect(() => {
    const savedProjectId = window.localStorage.getItem(
      SELECTED_PROJECT_KEY
    );

    if (savedProjectId) {
      setStoredProjectId(savedProjectId);
    }
  }, []);

  /*
   * Whenever the user visits a project route, save that
   * project as the current project.
   */
  useEffect(() => {
    if (!routeProjectId) {
      return;
    }

    window.localStorage.setItem(
      SELECTED_PROJECT_KEY,
      routeProjectId
    );

    setStoredProjectId(routeProjectId);
  }, [routeProjectId]);

  /*
   * Prefer the project from the URL.
   *
   * If we are on /spaces, fall back to the last project
   * the user opened.
   */
  const currentProjectId =
    routeProjectId ?? storedProjectId;

  /*
   * Determine whether we are actually inside a project
   * route.
   */
  const isProjectRoute = Boolean(routeProjectId);

  /*
   * Workspace active state.
   */
  function isWorkspaceActive(href: string) {
    if (href === "/spaces") {
      return (
        pathname === "/spaces" ||
        pathname.startsWith("/spaces/")
      );
    }

    return pathname === href;
  }

  /*
   * Project navigation active state.
   */
  function isProjectItemActive(path: string) {
    if (!routeProjectId) {
      return false;
    }

    const basePath = `/projects/${routeProjectId}`;

    /*
     * Overview
     */
    if (path === "") {
      return pathname === basePath;
    }

    /*
     * Nested project pages.
     *
     * Example:
     *
     * /projects/123/materials
     * /projects/123/materials/something
     */
    const itemPath = `${basePath}${path}`;

    return (
      pathname === itemPath ||
      pathname.startsWith(`${itemPath}/`)
    );
  }

  /*
   * Build the destination for project navigation.
   *
   * If a project is selected:
   *
   *   /projects/:id/materials
   *
   * If no project is selected:
   *
   *   /spaces
   *
   * This makes the navigation clickable instead of
   * rendering disabled buttons.
   */
  function getProjectHref(path: string) {
    if (currentProjectId) {
      return `/projects/${currentProjectId}${path}`;
    }

    return "/spaces";
  }

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  return (
    <>
      {/* =========================================================
          MOBILE BACKDROP
      ========================================================== */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-gray-950/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =========================================================
          SIDEBAR
      ========================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* =======================================================
            BRAND
        ======================================================== */}
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-white">
              <Sparkles className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight text-gray-950">
                StudyAI
              </p>

              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
                Learning OS
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* =======================================================
            NAVIGATION
        ======================================================== */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          {/* =====================================================
              WORKSPACE
          ====================================================== */}
          <section>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
              Workspace
            </p>

            <nav className="mt-3 space-y-1">
              {workspaceItems.map((item) => {
                const Icon = item.icon;

                const active = isWorkspaceActive(
                  item.href
                );

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  >
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>

          {/* =====================================================
              DIVIDER
          ====================================================== */}
          <div className="my-6 h-px bg-gray-100" />

          {/* =====================================================
              CURRENT PROJECT
          ====================================================== */}
          <section>
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                Current project
              </p>

              <ChevronDown
                className="h-3.5 w-3.5 text-gray-300"
                strokeWidth={1.8}
              />
            </div>

            {/* ===================================================
                PROJECT CARD
            ==================================================== */}
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {currentProjectId ? (
                <Link
                  href={`/projects/${currentProjectId}`}
                  onClick={onClose}
                  className="group flex items-center gap-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                    <GraduationCap className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900 group-hover:text-indigo-700">
                      Current Project
                    </p>

                    <p className="truncate text-[10px] text-gray-400">
                      {isProjectRoute
                        ? "In progress"
                        : "Recently selected"}
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/spaces"
                  onClick={onClose}
                  className="group flex items-center gap-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                    <FolderKanban className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900 group-hover:text-indigo-700">
                      No project selected
                    </p>

                    <p className="truncate text-[10px] text-gray-400">
                      Choose a project
                    </p>
                  </div>
                </Link>
              )}
            </div>

            {/* ===================================================
                PROJECT NAVIGATION
            ==================================================== */}
            <nav className="mt-3 space-y-1">
              {projectItems.map((item) => {
                const Icon = item.icon;

                const href = getProjectHref(
                  item.path
                );

                const active =
                  isProjectItemActive(item.path);

                /*
                 * If there is no project, the navigation still
                 * works, but takes the user to /spaces.
                 */
                if (!currentProjectId) {
                  return (
                    <Link
                      key={item.label}
                      href="/spaces"
                      onClick={onClose}
                      className="flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
                    >
                      <Icon
                        className="h-4 w-4"
                        strokeWidth={1.8}
                      />

                      <span>{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={onClose}
                    className={`flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* ===================================================
                HELPER TEXT
            ==================================================== */}
            {!currentProjectId && (
              <p className="mt-3 px-3 text-[11px] leading-5 text-gray-400">
                Open a project to use its learning tools.
              </p>
            )}
          </section>
        </div>

        {/* =========================================================
            FOOTER
        ========================================================== */}
        <div className="border-t border-gray-100 p-3">
          {/* Settings */}
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
              pathname === "/settings"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <Settings
              className="h-4 w-4"
              strokeWidth={1.8}
            />

            <span>Settings</span>
          </Link>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut
              className="h-4 w-4"
              strokeWidth={1.8}
            />

            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}