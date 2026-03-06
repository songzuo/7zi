// Team member types
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
  status: 'online' | 'busy' | 'offline';
  specialty: string;
  avatar?: string;
  bio?: string;
  social?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
  };
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  progress: number;
  status: 'active' | 'completed' | 'paused' | 'planned';
  tasks: {
    total: number;
    completed: number;
  };
  team: string[];
  deadline: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  repository?: string;
}

// Activity log types
export interface ActivityLog {
  id: string;
  type: 'commit' | 'deploy' | 'issue' | 'meeting' | 'message' | 'task';
  message: string;
  user: string;
  time: string;
  emoji: string;
  metadata?: Record<string, any>;
}

// GitHub types
export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
      email?: string;
    };
  };
  html_url: string;
  author: {
    avatar_url?: string;
    login?: string;
    html_url?: string;
  } | null;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  updated_at: string;
  html_url: string;
  homepage: string | null;
  topics: string[];
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    latency?: number;
    model?: string;
    tokens?: number;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
}

// UI Component types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'file';
  placeholder?: string;
  required?: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | null;
  };
  options?: Array<{ label: string; value: string }>;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  external?: boolean;
}

// SEO types
export interface SeoConfig {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}
