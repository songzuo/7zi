'use client';

import { NotificationPreferences } from '../types';
import SectionCard from '../SectionCard';
import NotificationItem from '../subcomponents/NotificationItem';

interface NotificationsSectionProps {
  notifications: NotificationPreferences;
  onNotificationChange: (key: keyof NotificationPreferences) => void;
}

export function NotificationsSection({ 
  notifications, 
  onNotificationChange
}: NotificationsSectionProps) {
  return (
    <SectionCard title="通知偏好" icon="🔔">
      <div className="space-y-4">
        <NotificationItem
          label="邮件通知"
          description="接收重要更新和提醒邮件"
          checked={notifications.emailNotifications}
          onChange={() => onNotificationChange('emailNotifications')}
        />
        <NotificationItem
          label="推送通知"
          description="浏览器推送通知"
          checked={notifications.pushNotifications}
          onChange={() => onNotificationChange('pushNotifications')}
        />
        <NotificationItem
          label="营销邮件"
          description="接收产品更新和优惠信息"
          checked={notifications.marketingEmails}
          onChange={() => onNotificationChange('marketingEmails')}
        />
        <NotificationItem
          label="每周摘要"
          description="每周活动汇总邮件"
          checked={notifications.weeklyDigest}
          onChange={() => onNotificationChange('weeklyDigest')}
        />
        <NotificationItem
          label="@提及通知"
          description="当有人@您时收到通知"
          checked={notifications.mentionNotifications}
          onChange={() => onNotificationChange('mentionNotifications')}
        />
      </div>
    </SectionCard>
  );
}

export default NotificationsSection;