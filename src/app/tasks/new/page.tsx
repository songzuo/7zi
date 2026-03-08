import React from 'react';
import TaskForm from '../components/TaskForm';

export default function NewTaskPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Task</h1>
      <TaskForm />
    </div>
  );
}