/**
 * Type definitions
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}
