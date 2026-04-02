/**
 * Real-time Dashboard Example
 *
 * Demonstrates the complete real-time notification system including:
 * - Real-time notifications panel
 * - Task update feeds
 * - Connection status monitoring
 */

'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { NotificationPanel } from '@/components/realtime/NotificationPanel'
import { TaskUpdateFeed } from '@/components/realtime/TaskUpdateFeed'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Bell, Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function RealtimeDashboardExample() {
  // All hooks must be called at the top level
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>('project-1')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  // Skip SSR
  if (!isMounted) {
    return null
  }

  // Mock user ID - in production this would come from authentication
  const userId = 'user-123'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
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
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-700">
              <Wifi className="h-4 w-4 text-green-500" />
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
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
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
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Task Updates */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Task Updates Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Project:
                    </label>
                    <select
                      value={selectedProject || ''}
                      onChange={e => setSelectedProject(e.target.value || null)}
                      className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
                      onChange={e => setSelectedTask(e.target.value || null)}
                      className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-700">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">1,234</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Messages Sent</div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-700">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">5,678</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Messages Received
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-700">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">12</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Reconnections</div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-700">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">45m</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Connected For</div>
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
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        Project Alpha
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">5 users online</div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">Task #123</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">2 users online</div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-700">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        General Chat
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        12 users online
                      </div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
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
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconnect WebSocket
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Bell className="mr-2 h-4 w-4" />
                    Test Notification
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <WifiOff className="mr-2 h-4 w-4" />
                    Simulate Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
