"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-64">
        <Topbar />

        <div className="flex items-center border-b border-gray-200 bg-white px-5 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <span className="ml-3 text-sm font-semibold text-gray-900">
            StudyAI
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}