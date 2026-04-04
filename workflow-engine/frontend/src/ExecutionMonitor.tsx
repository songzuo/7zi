import React, { useState, useEffect } from 'react';
import './ExecutionMonitor.css';

// ============ 类型定义 ============

interface ExecutionStatus {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  nodeExecutions: NodeExecution[];
  variables: Record<string, any>;
  checkpoints?: Array<{
    id: string;
    nodeId: string;
    timestamp: string;
    data?: Record<string, any>;
  }>;
  error?: {
    message: string;
    code?: string;
    timestamp: string;
  };
}

interface NodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: string;
  endTime?: string;
  input?: any;
  output?: any;
  retryCount: number;
  error?: {
    message: string;
    timestamp: string;
  };
}

interface ExecutionMonitorProps {
  executionId: string;
  onClose?: () => void;
}

// ============ 执行监控组件 ============

const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({ executionId, onClose }) => {
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // 轮询执行状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isMounted = true;
    const abortController = new AbortController();

    const fetchExecution = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}`, {
          signal: abortController.signal
        });
        if (!response.ok) throw new Error('Failed to fetch execution');
        
        const data = await response.json();
        
        // 检查组件是否仍然挂载
        if (!isMounted) return;
        
        setExecution(data.data);
        setLoading(false);

        // 如果执行完成，停止轮询
        if (['completed', 'failed', 'cancelled'].includes(data.data.status)) {
          clearInterval(intervalId);
        }
      } catch (err: any) {
        // 忽略由于取消导致的错误
        if (err.name === 'AbortError') return;
        
        if (!isMounted) return;
        
        setError(err.message);
        setLoading(false);
      }
    };

    fetchExecution();
    intervalId = setInterval(fetchExecution, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      abortController.abort();
    };
  }, [executionId]);

  // 控制执行
  const handlePause = async () => {
    try {
      await fetch(`/api/executions/${executionId}/pause`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to pause execution:', err);
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(`/api/executions/${executionId}/cancel`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  };

  const handleResume = async (checkpointId: string) => {
    try {
      await fetch(`/api/executions/${executionId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId }),
      });
    } catch (err) {
      console.error('Failed to resume execution:', err);
    }
  };

  if (loading) {
    return (
      <div className="execution-monitor loading">
        <div className="spinner"></div>
        <p>Loading execution status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="execution-monitor error">
        <p>❌ Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="execution-monitor empty">
        <p>No execution found</p>
      </div>
    );
  }

  return (
    <div className="execution-monitor">
      {/* 头部 */}
      <div className="monitor-header">
        <div className="header-left">
          <h2>Execution Monitor</h2>
          <span className={`status-badge ${execution.status}`}>
            {execution.status}
          </span>
        </div>
        <div className="header-right">
          {execution.status === 'running' && (
            <>
              <button className="btn btn-warning" onClick={handlePause}>
                ⏸️ Pause
              </button>
              <button className="btn btn-danger" onClick={handleCancel}>
                ✕ Cancel
              </button>
            </>
          )}
          {execution.status === 'paused' && execution.checkpoints?.[0]?.id && (
            <button className="btn btn-success" onClick={() => handleResume(execution.checkpoints?.[0]?.id as string)}>
              ▶️ Resume
            </button>
          )}
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose}>
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* 执行概览 */}
      <div className="monitor-overview">
        <div className="overview-card">
          <div className="card-label">Execution ID</div>
          <div className="card-value">{execution.id}</div>
        </div>
        <div className="overview-card">
          <div className="card-label">Started</div>
          <div className="card-value">{formatTime(execution.startTime)}</div>
        </div>
        {execution.endTime && (
          <div className="overview-card">
            <div className="card-label">Duration</div>
            <div className="card-value">
              {calculateDuration(execution.startTime, execution.endTime)}
            </div>
          </div>
        )}
        <div className="overview-card">
          <div className="card-label">Nodes</div>
          <div className="card-value">
            {execution.nodeExecutions.length} executed
          </div>
        </div>
      </div>

      {/* 错误信息 */}
      {execution.error && (
        <div className="monitor-error">
          <h3>❌ Execution Failed</h3>
          <p className="error-message">{execution.error.message}</p>
          <p className="error-time">{formatTime(execution.error.timestamp)}</p>
        </div>
      )}

      {/* 节点执行时间线 */}
      <div className="monitor-timeline">
        <h3>Execution Timeline</h3>
        <div className="timeline">
          {execution.nodeExecutions.map((nodeExec) => (
            <div
              key={nodeExec.nodeId}
              className={`timeline-item ${nodeExec.status} ${selectedNode === nodeExec.nodeId ? 'selected' : ''}`}
              onClick={() => setSelectedNode(nodeExec.nodeId)}
            >
              <div className="timeline-marker">
                {getStatusIcon(nodeExec.status)}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="node-id">{nodeExec.nodeId}</span>
                  <span className={`node-status ${nodeExec.status}`}>
                    {nodeExec.status}
                  </span>
                </div>
                <div className="timeline-time">
                  {formatTime(nodeExec.startTime)}
                  {nodeExec.endTime && ` - ${formatTime(nodeExec.endTime)}`}
                </div>
                {nodeExec.retryCount > 0 && (
                  <div className="timeline-retry">
                    Retries: {nodeExec.retryCount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 选中节点的详细信息 */}
      {selectedNode && (
        <div className="monitor-details">
          <div className="details-header">
            <h3>Node Details</h3>
            <button className="btn-close" onClick={() => setSelectedNode(null)}>
              ✕
            </button>
          </div>
          {(() => {
            const nodeExec = execution.nodeExecutions.find(n => n.nodeId === selectedNode);
            if (!nodeExec) return null;
            
            return (
              <div className="details-body">
                <div className="detail-section">
                  <h4>Status</h4>
                  <span className={`status-badge ${nodeExec.status}`}>
                    {nodeExec.status}
                  </span>
                </div>
                
                <div className="detail-section">
                  <h4>Input</h4>
                  <pre>{JSON.stringify(nodeExec.input, null, 2)}</pre>
                </div>
                
                {nodeExec.output && (
                  <div className="detail-section">
                    <h4>Output</h4>
                    <pre>{JSON.stringify(nodeExec.output, null, 2)}</pre>
                  </div>
                )}
                
                {nodeExec.error && (
                  <div className="detail-section error">
                    <h4>Error</h4>
                    <p>{nodeExec.error.message}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 变量查看器 */}
      <div className="monitor-variables">
        <h3>Runtime Variables</h3>
        <pre>{JSON.stringify(execution.variables, null, 2)}</pre>
      </div>
    </div>
  );
};

// ============ 辅助函数 ============

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '▶️';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'skipped': return '⏭️';
    default: return '❓';
  }
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

function calculateDuration(start: string, end: string): string {
  const duration = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default ExecutionMonitor;