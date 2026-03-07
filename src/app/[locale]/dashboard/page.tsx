"use client";

import { useLocale } from "next-intl";
import { LazyProjectDashboard } from "@/components/LazyComponents";

export default function DashboardPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-8">
          {locale === "zh" ? "实时看板" : "Dashboard"}
        </h1>
        <LazyProjectDashboard />
      </div>
    </div>
  );
}
