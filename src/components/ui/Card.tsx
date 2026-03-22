'use client';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        border rounded-lg p-4
        bg-white dark:bg-zinc-900
        border-zinc-200 dark:border-zinc-800
        shadow-sm dark:shadow-none
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props}>{children}</div>;
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`
        border-b pb-3 mb-3
        border-zinc-200 dark:border-zinc-800
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`
        text-lg font-semibold
        text-zinc-900 dark:text-zinc-100
        ${className}
      `}
      {...props}
    >
      {children}
    </h3>
  );
}
