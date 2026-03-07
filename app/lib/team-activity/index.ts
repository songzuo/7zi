/**
 * 团队活动追踪系统
 */

// 类型
export type {
  TeamActivity,
  TeamMember,
  ActivityStats,
  TeamActivityType,
  ActivityPriority,
  MemberRole,
  MemberStatus,
  TeamOverview,
  GetTeamActivitiesRequest,
  GetTeamActivitiesResponse,
  TeamActivityState,
  TeamActivityUpdateMessage,
} from './types';

// 常量
export {
  ACTIVITY_TYPE_CONFIG,
  MEMBER_ROLE_CONFIG,
  MEMBER_STATUS_CONFIG,
} from './types';

// Store
export {
  useTeamActivityStore,
  useOnlineMembers,
  useBusyMembers,
  useMemberActivities,
  useActivitiesByType,
  useHighPriorityActivities,
  useTodayActivities,
  useWeekActivities,
  useFilteredActivities,
  createActivityUpdateMessage,
  createMemberStatusUpdateMessage,
} from './store';

// Repository
export { teamActivityRepository } from './repository';

// 默认导出
import { teamActivityRepository } from './repository';
export default teamActivityRepository;
