"use client";

import { useLocale } from "next-intl";
import { LazyProjectDashboard } from "@/components/LazyComponents";

// Dashboard Skeleton 加载效果
function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 h-28"
          >
            <div className="h-8 w-16 bg-zinc-300 dark:bg-zinc-700 rounded mb-3" />
            <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 h-64" />
        <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 h-64" />
      </div>

      {/* Activity Skeleton */}
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 h-48" />
    </div>
  );
}

export default function DashboardPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-8">
          {locale === "zh" ? "实时看板" : "Dashboard"}
        </h1>
        <LazyProjectDashboard loading={<DashboardSkeleton />} />
      </div>
    </div>
  );
}
