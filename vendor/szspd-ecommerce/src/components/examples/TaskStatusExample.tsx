/**
 * Example: Using useTaskStatusUpdates in a component
 *
 * This example demonstrates how to monitor task status updates
 * using the WebSocket hook.
 */

'use client'

import { useTaskStatusUpdates } from '@/hooks/useWebSocket'
import { WebSocketStatusIndicator } from '@/components/websocket/WebSocketStatusIndicator'

export function TaskStatusExample({ taskId }: { taskId: string }) {
  const { state, taskUpdates, getTaskStatus } = useTaskStatusUpdates()

  const taskStatus = getTaskStatus(taskId)

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      {/* Connection Status */}
      <div className="mb-4">
        <WebSocketStatusIndicator detailed={false} />
      </div>

      {/* Task Status Display */}
      <h2 className="mb-4 text-xl font-bold">Task Monitor</h2>

      {taskStatus ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-600">Task ID:</span>
            <span className="font-mono text-sm">{taskStatus.taskId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Status:</span>
            <span>{taskStatus.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">State:</span>
            <span
              className={`rounded px-2 py-1 text-sm ${
                taskStatus.state === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : taskStatus.state === 'running'
                    ? 'bg-blue-100 text-blue-800'
                    : taskStatus.state === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-zinc-100 text-zinc-800'
              }`}
            >
              {taskStatus.state}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Last Update:</span>
            <span>{new Date(taskStatus.timestamp).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p className="text-zinc-500">Waiting for task updates...</p>
      )}
    </div>
  )
}
