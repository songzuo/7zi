import { ProfilePage } from '../../components/ProfilePage';
import { getDefaultUserId } from '@/lib/users/default-user';

export const metadata = {
  title: '个人资料 - AI 团队管理系统',
  description: '查看和编辑您的个人资料信息',
};

// 使用默认用户ID（实际项目中应从认证系统获取）
const userId = getDefaultUserId();

export default function ProfilePageRoute() {
  // 在实际应用中，这里应该从 session/auth 获取用户ID
  return <ProfilePage userId={userId} />;
}