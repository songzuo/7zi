/**
 * Real-time Dashboard Example
 *
 * Demonstrates the complete real-time notification system including:
 * - Real-time notifications panel
 * - Task update feeds
 * - Connection status monitoring
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { NotificationPanel } from '@/components/realtime/NotificationPanel';
import { TaskUpdateFeed } from '@/components/realtime/TaskUpdateFeed';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Bell, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function RealtimeDashboardExample() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>('project-1');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Mock user ID - in production this would come from authentication
  const userId = 'user-123';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Real-time Dashboard
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              WebSocket-powered notifications and updates
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full">
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Connected
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* Notification Panel */}
              {showNotifications && (
                <NotificationPanel
                  userId={userId}
                  position="top-right"
                  enableSound={true}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Task Updates */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Updates Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Project:
                    </label>
                    <select
                      value={selectedProject || ''}
                      onChange={(e) => setSelectedProject(e.target.value || null)}
                      className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">All Projects</option>
                      <option value="project-1">Project Alpha</option>
                      <option value="project-2">Project Beta</option>
                      <option value="project-3">Project Gamma</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Task:
                    </label>
                    <select
                      value={selectedTask || ''}
                      onChange={(e) => setSelectedTask(e.target.value || null)}
                      className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">All Tasks</option>
                      <option value="task-1">Task 1: Design Homepage</option>
                      <option value="task-2">Task 2: Implement API</option>
                      <option value="task-3">Task 3: Write Tests</option>
                    </select>
                  </div>
                </div>

                <TaskUpdateFeed
                  projectId={selectedProject || undefined}
                  taskId={selectedTask || undefined}
                  userId={userId}
                  maxUpdates={10}
                />
              </CardContent>
            </Card>

            {/* WebSocket Stats */}
            <Card>
              <CardHeader>
                <CardTitle>WebSocket Statistics</CardTitle>
                  Real-time connection metrics
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      1,234
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Messages Sent
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      5,678
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Messages Received
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      12
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Reconnections
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      45m
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Connected For
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity */}
          <div className="space-y-6">
            {/* Active Rooms */}
            <Card>
              <CardHeader>
                <CardTitle>Active Rooms</CardTitle>
                  Rooms you&apos;re currently connected to
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        Project Alpha
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        5 users online
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        Task #123
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        2 users online
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        General Chat
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        12 users online
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                  Common real-time operations
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect WebSocket
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    Test Notification
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <WifiOff className="w-4 h-4 mr-2" />
                    Simulate Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
