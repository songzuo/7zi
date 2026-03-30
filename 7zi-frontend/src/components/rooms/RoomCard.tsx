/**
 * RoomCard 组件 - 房间卡片
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Card, CardBody, CardTitle, CardText, CardMeta, CardBadge } from '@/components/ui/Card';
import type { Room, RoomVisibility } from '@/lib/api/rooms/types';

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
  className?: string;
}

const visibilityColors = {
  public: { color: 'green' as const, icon: '🌐' },
  private: { color: 'red' as const, icon: '🔒' },
  unlisted: { color: 'gray' as const, icon: '🔗' },
};

const visibilityLabels: Record<RoomVisibility, string> = {
  public: '公开',
  private: '私有',
  unlisted: '不公开',
};

export const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, className }) => {
  const config = visibilityColors[room.visibility];

  return (
    <Card
      clickable={!!onClick}
      hoverable
      onClick={onClick}
      className={className}
    >
      <CardBody>
        <div className="flex items-start justify-between mb-2">
          <CardTitle size="md">{room.name}</CardTitle>
          <CardBadge color={config.color} variant="soft" size="sm">
            <span className="mr-1">{config.icon}</span>
            {visibilityLabels[room.visibility]}
          </CardBadge>
        </div>

        {room.description && (
          <CardText color="secondary" className="line-clamp-2">
            {room.description}
          </CardText>
        )}

        <CardMeta>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {room.participantCount}/{room.maxParticipants}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(room.updatedAt).toLocaleDateString()}
          </span>
        </CardMeta>

        {room.tags && room.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {room.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
            {room.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                +{room.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default RoomCard;
