/**
 * Card 组件 - 卡片组件
 * 用于展示内容、图片、信息等
 */

import React from 'react';
import clsx from 'clsx';

export interface CardProps {
  /** 卡片内容 */
  children: React.ReactNode;
  /** 是否有阴影 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 是否可点击 */
  clickable?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, shadow = 'md', clickable = false, className, onClick, ...props }, ref) => {
    const shadowStyles = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    };
    
    const classes = clsx(
      'bg-white rounded-lg border border-gray-200',
      shadowStyles[shadow],
      clickable && 'cursor-pointer hover:shadow-lg transition-shadow duration-200',
      className
    );
    
    return (
      <div ref={ref} className={classes} onClick={onClick} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={clsx('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className }) => {
  return <div className={clsx('px-6 py-4', className)}>{children}</div>;
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={clsx('px-6 py-4 border-t border-gray-200 bg-gray-50', className)}>
      {children}
    </div>
  );
};

export interface CardImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const CardImage: React.FC<CardImageProps> = ({ src, alt, className }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={clsx('w-full h-48 object-cover', className)}
    />
  );
};

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return <h3 className={clsx('text-lg font-semibold text-gray-900', className)}>{children}</h3>;
};

export interface CardTextProps {
  children: React.ReactNode;
  className?: string;
}

export const CardText: React.FC<CardTextProps> = ({ children, className }) => {
  return <p className={clsx('text-gray-600 mt-2', className)}>{children}</p>;
};
