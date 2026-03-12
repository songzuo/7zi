/**
 * Assignment sidebar section component
 */

interface AssignmentSectionProps {
  onAssign: (memberId: string) => Promise<void>;
}

export function AssignmentSection({ onAssign }: AssignmentSectionProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">智能分配</h3>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        基于任务类型和AI成员专长，系统会自动推荐最适合的执行者。
      </div>
      <button
        onClick={() => onAssign('executor')}
        className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all"
      >
        分配给 Executor
      </button>
    </div>
  );
}
