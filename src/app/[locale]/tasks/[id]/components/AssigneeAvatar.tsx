/**
 * Assignee avatar component
 */

interface AssigneeAvatarProps {
  name: string;
}

export function AssigneeAvatar({ name }: AssigneeAvatarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-medium">
        {name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">已分配</div>
      </div>
    </div>
  );
}
