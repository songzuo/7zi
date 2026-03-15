'use client';

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarVariant = 'circle' | 'rounded' | 'square';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Image source */
  src?: string;
  /** Alt text */
  alt?: string;
  /** Avatar size */
  size?: AvatarSize;
  /** Avatar variant */
  variant?: AvatarVariant;
  /** Fallback text (initials) */
  fallback?: string;
  /** Fallback icon */
  fallbackIcon?: ReactNode;
  /** Show status indicator */
  status?: 'online' | 'offline' | 'away' | 'busy';
  /** Badge content */
  badge?: string | number;
  /** Badge color */
  badgeColor?: 'red' | 'blue' | 'green' | 'yellow';
  /** Additional class name */
  className?: string;
}

// ============================================
// STYLES
// ============================================

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-1.5 h-1.5' },
  sm: { container: 'w-8 h-8', text: 'text-sm', status: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-base', status: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', text: 'text-lg', status: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', text: 'text-xl', status: 'w-3.5 h-3.5' },
  '2xl': { container: 'w-20 h-20', text: 'text-2xl', status: 'w-4 h-4' },
};

const variantStyles: Record<AvatarVariant, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
  square: 'rounded-none',
};

const statusStyles = {
  online: 'bg-green-500',
  offline: 'bg-zinc-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const badgeColorStyles = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  yellow: 'bg-yellow-500 text-white',
};

// ============================================
// COMPONENT
// ============================================

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = '',
      size = 'md',
      variant = 'circle',
      fallback,
      fallbackIcon,
      status,
      badge,
      badgeColor = 'red',
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeConfig = sizeStyles[size];
    
    // Generate initials from fallback text
    const initials = fallback
      ? fallback
          .split(' ')
          .map((word) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : null;

    return (
      <div ref={ref} className={`relative inline-flex ${className}`} {...props}>
        {/* Avatar Container */}
        <div
          className={`
            relative inline-flex items-center justify-center
            ${sizeConfig.container}
            ${variantStyles[variant]}
            bg-gradient-to-br from-cyan-400 to-purple-500
            text-white font-medium
            ${sizeConfig.text}
            overflow-hidden
          `.replace(/\s+/g, ' ').trim()}
        >
          {src ? (
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              sizes={`${parseInt(sizeConfig.container.split('w-')[1]) * 4}px`}
            />
          ) : fallbackIcon ? (
            fallbackIcon
          ) : initials ? (
            <span>{initials}</span>
          ) : (
            // Default icon
            <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>

        {/* Status Indicator */}
        {status && (
          <span
            className={`
              absolute bottom-0 right-0
              ${sizeConfig.status}
              ${statusStyles[status]}
              ring-2 ring-white dark:ring-zinc-900
              rounded-full
            `.replace(/\s+/g, ' ').trim()}
          />
        )}

        {/* Badge */}
        {badge !== undefined && (
          <span
            className={`
              absolute -top-1 -right-1
              min-w-[18px] h-[18px]
              px-1
              text-[10px] font-bold
              ${badgeColorStyles[badgeColor]}
              rounded-full
              flex items-center justify-center
            `.replace(/\s+/g, ' ').trim()}
          >
            {badge}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// ============================================
// AVATAR GROUP
// ============================================

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum avatars to show */
  max?: number;
  /** Avatar size */
  size?: AvatarSize;
  /** Children (Avatar elements) */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

export function AvatarGroup({
  max = 4,
  size = 'md',
  children,
  className = '',
  ...props
}: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={`flex items-center -space-x-2 ${className}`} {...props}>
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className="ring-2 ring-white dark:ring-zinc-900 rounded-full">
          {avatar}
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar
          size={size}
          fallback={`+${remainingCount}`}
          className="ring-2 ring-white dark:ring-zinc-900"
        />
      )}
    </div>
  );
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default Avatar;