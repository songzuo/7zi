/**
 * Task status badge component
 */

import type { TaskStatus, TaskPriority, TaskType } from '@/lib/types/task-types';
import { getStatusColor, getPriorityColor, getTypeColor } from '../utils/styles';
import { getStatusLabel, getPriorityLabel, getTypeLabel } from '../utils/format';

interface TaskBadgesProps {
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
}

export function TaskBadges({ status, priority, type }: TaskBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {getStatusLabel(status)}
      </span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
        {getPriorityLabel(priority)}
      </span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(type)}`}>
        {getTypeLabel(type)}
      </span>
    </div>
  );
}
