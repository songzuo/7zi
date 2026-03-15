// UI Components Index
// Export all reusable UI components

// Core Components
export { default as Button, IconButton, ButtonGroup } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps, ButtonGroupProps } from './Button';

export { default as Input, Textarea, Select } from './Input';
export type { InputProps, TextareaProps, SelectProps, InputSize, InputVariant } from './Input';

export { 
  default as Badge,
  StatusBadge,
  PriorityBadge,
  TypeBadge,
  DotBadge
} from './Badge';
export type { 
  BadgeProps, 
  BadgeVariant, 
  BadgeSize,
  StatusBadgeProps,
  PriorityBadgeProps,
  TypeBadgeProps,
  DotBadgeProps,
  StatusValue,
  PriorityValue,
  TypeValue
} from './Badge';
export { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG } from './Badge';

export { default as Avatar, AvatarGroup } from './Avatar';
export type { AvatarProps, AvatarSize, AvatarVariant, AvatarGroupProps } from './Avatar';

// Feedback Components
export { default as Loading } from './Loading';
export type { LoadingProps, LoadingVariant } from './Loading';

export { default as ErrorBoundary } from './ErrorBoundary';

export { default as Toast, ToastProvider, useToast } from './Toast';
export type { ToastType, Toast as ToastInterface } from './Toast';

// Layout Components
export { default as DataTable } from './DataTable';
export type { Column, DataTableProps, SortDirection } from './DataTable';

export { default as Modal, ModalButton } from './Modal';
export type { ModalProps, ModalSize, ModalButtonProps } from './Modal';

export { 
  default as Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardImage,
  StatsCard
} from './Card';
export type { 
  CardProps, 
  CardVariant, 
  CardPadding,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
  CardImageProps,
  StatsCardProps
} from './Card';
