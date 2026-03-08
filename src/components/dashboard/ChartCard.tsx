'use client';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}