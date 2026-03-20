/**
 * Team Member Type Definitions
 */

import type { UnifiedTeamMember, MemberCategory } from '@/types/members';

/**
 * Team Member - 使用统一类型
 */
export type TeamMember = Omit<UnifiedTeamMember, 'category'> & {
  category: MemberCategory;
};

/**
 * 协作项目类型
 */
export interface CollaborationItem {
  key: string;
  color: string;
  emoji: string;
}

/**
 * 团队统计类型
 */
export interface TeamStats {
  members: string;
  coverage: string;
  support: string;
}

export type TeamMemberCategory = TeamMember['category'];
