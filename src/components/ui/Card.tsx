'use client';

import React, { ReactNode, forwardRef, HTMLAttributes } from 'react';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'ghost' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant style */
  variant?: CardVariant;
  /** Padding size */
  padding?: CardPadding;
  /** Enable hover effects */
  hoverable?: boolean;
  /** Enable click interaction */
  clickable?: boolean;
  /** Additional class name */
  className?: string;
  /** Children */
  children: ReactNode;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Action buttons/elements */
  action?: ReactNode;
  /** Icon to display */
  icon?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Children */
  children?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional class name */
  className?: string;
  /** Children */
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional class name */
  className?: string;
  /** Children */
  children: ReactNode;
  /** Align content */
  align?: 'left' | 'center' | 'right' | 'between';
}

export interface CardImageProps {
  /** Image source */
  src: string;
  /** Alt text */
  alt: string;
  /** Aspect ratio */
  aspectRatio?: 'video' | 'square' | 'auto';
  /** Object fit */
  objectFit?: 'cover' | 'contain' | 'fill';
  /** Additional class name */
  className?: string;
}

// ============================================
// VARIANT STYLES
// ============================================

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card border border-border',
  outlined: 'bg-transparent border-2 border-border',
  elevated: 'bg-card shadow-lg border border-border',
  ghost: 'bg-transparent',
  gradient: 'bg-gradient-to-br from-card via-card to-muted border border-border',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

const aspectRatioStyles: Record<string, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  auto: '',
};

const footerAlignStyles: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

// ============================================
// CARD COMPONENT
// ============================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-xl transition-all duration-200';
    const hoverStyles = hoverable
      ? 'hover:shadow-lg hover:-translate-y-1 hover:border-primary/30'
      : '';
    const clickStyles = clickable
      ? 'cursor-pointer active:scale-[0.99]'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${clickStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// CARD HEADER
// ============================================

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, icon, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start gap-4 mb-4 ${className}`}
        {...props}
      >
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {children}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================
// CARD BODY
// ============================================

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// ============================================
// CARD FOOTER
// ============================================

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, align = 'right', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center gap-3 mt-4 pt-4 border-t border-border ${footerAlignStyles[align]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ============================================
// CARD IMAGE
// ============================================

export const CardImage: React.FC<CardImageProps> = ({
  src,
  alt,
  aspectRatio = 'video',
  objectFit = 'cover',
  className = '',
}) => {
  const objectFitStyles = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
  };

  return (
    <div className={`overflow-hidden rounded-t-xl ${aspectRatioStyles[aspectRatio]} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={objectFitStyles[objectFit]}
        loading="lazy"
      />
    </div>
  );
};

// ============================================
// STATS CARD VARIANT
// ============================================

export interface StatsCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Optional trend indicator */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Optional icon */
  icon?: ReactNode;
  /** Card variant */
  variant?: CardVariant;
  /** Additional class name */
  className?: string;
}

export function StatsCard({
  label,
  value,
  trend,
  icon,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  return (
    <Card variant={variant} className={`${className}`}>
      <CardHeader
        title={label}
        icon={icon}
        action={
          trend && (
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )
        }
      />
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </Card>
  );
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default Card;