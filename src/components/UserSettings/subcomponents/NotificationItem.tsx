'use client';

import ToggleSwitch from '../ToggleSwitch';

interface NotificationItemProps {
  title?: string;
  label?: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

export function NotificationItem({ 
  title, 
  label,
  description, 
  checked, 
  onChange 
}: NotificationItemProps) {
  const displayTitle = title || label || '';
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <h4 className="font-medium text-zinc-900 dark:text-white">{displayTitle}</h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        label={displayTitle}
      />
    </div>
  );
}

export default NotificationItem;