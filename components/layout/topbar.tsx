"use client";

import {
  Bell,
  Search,
  Sparkles,
} from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 hidden h-16 border-b border-gray-200 bg-white/90 backdrop-blur lg:block">
      <div className="flex h-full items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="search"
              placeholder="Search your learning..."
              className="h-9 w-72 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 xl:flex">
            <Sparkles className="h-3.5 w-3.5" />
            AI learning companion
          </div>

          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
          </button>

          <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              A
            </div>

            <div className="hidden xl:block">
              <p className="text-xs font-semibold text-gray-900">
                Learner
              </p>

              <p className="text-[10px] text-gray-400">
                Personal account
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}