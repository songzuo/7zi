'use client';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return <div className={`border rounded-lg p-4 ${className}`} {...props}>{children}</div>;
}

export function CardContent({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props}>{children}</div>;
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-b pb-3 mb-3 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-semibold ${className}`} {...props}>{children}</h3>;
}
