import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowDesigner.css';

// ============ Workflow 类型定义 ============

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface Workflow {
  id?: string;
  name: string;
  version?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ============ 节点类型定义 ============

interface NodeData {
  label?: string;
  [key: string]: unknown;
}

interface StartNodeData extends NodeData {
  label: 'Start';
}

interface EndNodeData extends NodeData {
  label: 'End';
}

interface TaskNodeData extends NodeData {
  label: string;
  action: string;
  params: Record<string, unknown>;
}

interface ConditionNodeData extends NodeData {
  label: string;
  conditions: Array<{
    expression: string;
    branch: string;
  }>;
}

interface LoopNodeData extends NodeData {
  label: string;
  iterable: string;
  maxIterations?: number;
}

// ============ 自定义节点组件 ============

const StartNode: React.FC<{ data: StartNodeData }> = ({ data }) => {
  return (
    <div className="workflow-node start-node">
      <Handle type="source" position={Position.Bottom} />
      <div className="node-icon">▶️</div>
      <div className="node-label">{data.label}</div>
    </div>
  );
};

const EndNode: React.FC<{ data: EndNodeData }> = ({ data }) => {
  return (
    <div className="workflow-node end-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">⏹️</div>
      <div className="node-label">{data.label}</div>
    </div>
  );
};

const TaskNode: React.FC<{ data: TaskNodeData }> = ({ data }) => {
  return (
    <div className="workflow-node task-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">⚙️</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">{data.action}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const ConditionNode: React.FC<{ data: ConditionNodeData }> = ({ data }) => {
  return (
    <div className="workflow-node condition-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">🔀</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">{data.conditions?.length || 0} branches</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" />
      <Handle type="source" position={Position.Right} id="false" />
    </div>
  );
};

const LoopNode: React.FC<{ data: LoopNodeData }> = ({ data }) => {
  return (
    <div className="workflow-node loop-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">🔁</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">{data.iterable}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const ParallelNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className="workflow-node parallel-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">⚡</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">Parallel</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const DelayNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className="workflow-node delay-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">⏱️</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">{data.duration || 0}s</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const HttpNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className="workflow-node http-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">🌐</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">{data.method || 'GET'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const AiNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className="workflow-node ai-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">🤖</div>
      <div className="node-label">{data.label}</div>
      <div className="node-details">
        <span className="badge">{data.model || 'minimax'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  condition: ConditionNode,
  loop: LoopNode,
  parallel: ParallelNode,
  delay: DelayNode,
  http: HttpNode,
  ai: AiNode,
};

// ============ 主设计器组件 ============

interface WorkflowDesignerProps {
  initialWorkflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  onExecute?: (workflow: Workflow) => void;
}

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  initialWorkflow,
  onSave,
  onExecute,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || 'Untitled Workflow');
  const [showNodePanel, setShowNodePanel] = useState(true);

  // 连接节点
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds: Edge[]) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // 节点点击
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // 拖放处理
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 200,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          ...getDefaultNodeData(type),
        },
      };

      setNodes((nds: Node[]) => [...nds, newNode]);
    },
    [setNodes]
  );

  // 获取默认节点数据
  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'task':
        return { action: 'custom', params: {} };
      case 'condition':
        return { conditions: [], defaultBranch: 'default' };
      case 'loop':
        return { iterable: 'items', maxIterations: 100 };
      case 'parallel':
        return { branches: [] };
      case 'delay':
        return { duration: 5, unit: 'seconds' };
      case 'http':
        return { method: 'GET', url: '' };
      case 'ai':
        return { model: 'minimax-m2', prompt: '', temperature: 0.7 };
      default:
        return {};
    }
  };

  // 更新节点数据
  const updateNodeData = (nodeId: string, data: Partial<NodeData>) => {
    setNodes((nds: Node[]) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
  };

  // 删除节点
  const deleteNode = (nodeId: string) => {
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== nodeId));
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  // 导出工作流
  const exportWorkflow = () => {
    const workflow = {
      id: initialWorkflow?.id || `wf_${Date.now()}`,
      name: workflowName,
      version: initialWorkflow?.version || '1.0.0',
      nodes,
      edges,
      createdAt: initialWorkflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSave) {
      onSave(workflow);
    }

    return workflow;
  };

  // 执行工作流
  const handleExecute = () => {
    const workflow = exportWorkflow();
    if (onExecute) {
      onExecute(workflow);
    }
  };

  return (
    <div className="workflow-designer">
      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="workflow-name-input"
            placeholder="Workflow name"
          />
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={exportWorkflow}>
            💾 Save
          </button>
          <button className="btn btn-success" onClick={handleExecute}>
            ▶️ Execute
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowNodePanel(!showNodePanel)}
          >
            {showNodePanel ? '◀️ Hide Panel' : '▶️ Show Panel'}
          </button>
        </div>
      </div>

      <div className="designer-content">
        {/* 节点面板 */}
        {showNodePanel && (
          <div className="node-panel">
            <h3>Node Types</h3>
            <div className="node-list">
              {['start', 'end', 'task', 'condition', 'loop', 'parallel', 'delay', 'http', 'ai'].map(
                (type) => (
                  <div
                    key={type}
                    className="node-item"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow', type);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <span className="node-icon">
                      {type === 'start' && '▶️'}
                      {type === 'end' && '⏹️'}
                      {type === 'task' && '⚙️'}
                      {type === 'condition' && '🔀'}
                      {type === 'loop' && '🔁'}
                      {type === 'parallel' && '⚡'}
                      {type === 'delay' && '⏱️'}
                      {type === 'http' && '🌐'}
                      {type === 'ai' && '🤖'}
                    </span>
                    <span className="node-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* 画布 */}
        <div className="canvas-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* 属性面板 */}
        {selectedNode && (
          <div className="properties-panel">
            <div className="panel-header">
              <h3>Node Properties</h3>
              <button className="btn-close" onClick={() => setSelectedNode(null)}>
                ✕
              </button>
            </div>
            <div className="panel-body">
              <NodePropertiesEditor
                node={selectedNode}
                onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                onDelete={() => deleteNode(selectedNode.id)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ 节点属性编辑器 ============

interface NodePropertiesEditorProps {
  node: Node;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}

const NodePropertiesEditor: React.FC<NodePropertiesEditorProps> = ({ node, onUpdate, onDelete }) => {
  const renderEditor = () => {
    switch (node.type) {
      case 'task':
        return (
          <TaskNodeEditor
            data={node.data}
            onUpdate={onUpdate}
          />
        );
      case 'condition':
        return (
          <ConditionNodeEditor
            data={node.data}
            onUpdate={onUpdate}
          />
        );
      case 'loop':
        return (
          <LoopNodeEditor
            data={node.data}
            onUpdate={onUpdate}
          />
        );
      case 'delay':
        return (
          <DelayNodeEditor
            data={node.data}
            onUpdate={onUpdate}
          />
        );
      case 'http':
        return (
          <HttpNodeEditor
            data={node.data}
            onUpdate={onUpdate}
          />
        );
      case 'ai':
        return (
          <AiNodeEditor
            data={node.data}
            onUpdate={onUpdate}
          />
        );
      default:
        return (
          <div className="editor-section">
            <p>Node ID: {node.id}</p>
            <p>Type: {node.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="node-properties-editor">
      <div className="editor-section">
        <label>Label</label>
        <input
          type="text"
          value={node.data.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </div>
      {renderEditor()}
      <div className="editor-actions">
        <button className="btn btn-danger" onClick={onDelete}>
          🗑️ Delete Node
        </button>
      </div>
    </div>
  );
};

const TaskNodeEditor: React.FC<{ data: any; onUpdate: (data: any) => void }> = ({ data, onUpdate }) => (
  <>
    <div className="editor-section">
      <label>Action</label>
      <select
        value={data.action || 'custom'}
        onChange={(e) => onUpdate({ action: e.target.value })}
      >
        <option value="custom">Custom</option>
        <option value="http">HTTP Request</option>
        <option value="email">Send Email</option>
        <option value="script">Run Script</option>
      </select>
    </div>
    <div className="editor-section">
      <label>Timeout (seconds)</label>
      <input
        type="number"
        value={data.timeout || 60}
        onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) })}
      />
    </div>
    <div className="editor-section">
      <label>Retry Attempts</label>
      <input
        type="number"
        value={data.retryCount || 3}
        onChange={(e) => onUpdate({ retryCount: parseInt(e.target.value) })}
      />
    </div>
  </>
);

const ConditionNodeEditor: React.FC<{ data: any; onUpdate: (data: any) => void }> = ({ data, onUpdate }) => (
  <>
    <div className="editor-section">
      <label>Conditions</label>
      {(data.conditions || []).map((cond: any, idx: number) => (
        <div key={idx} className="condition-item">
          <input
            type="text"
            value={cond.expression}
            onChange={(e) => {
              const newConditions = [...data.conditions];
              newConditions[idx] = { ...cond, expression: e.target.value };
              onUpdate({ conditions: newConditions });
            }}
            placeholder="expression"
          />
          <input
            type="text"
            value={cond.branch}
            onChange={(e) => {
              const newConditions = [...data.conditions];
              newConditions[idx] = { ...cond, branch: e.target.value };
              onUpdate({ conditions: newConditions });
            }}
            placeholder="branch"
          />
        </div>
      ))}
      <button
        className="btn btn-sm"
        onClick={() => onUpdate({ conditions: [...(data.conditions || []), { expression: '', branch: '' }] })}
      >
        + Add Condition
      </button>
    </div>
  </>
);

const LoopNodeEditor: React.FC<{ data: any; onUpdate: (data: any) => void }> = ({ data, onUpdate }) => (
  <>
    <div className="editor-section">
      <label>Iterable Variable</label>
      <input
        type="text"
        value={data.iterable || ''}
        onChange={(e) => onUpdate({ iterable: e.target.value })}
        placeholder="e.g., variables.items"
      />
    </div>
    <div className="editor-section">
      <label>Max Iterations</label>
      <input
        type="number"
        value={data.maxIterations || 100}
        onChange={(e) => onUpdate({ maxIterations: parseInt(e.target.value) })}
      />
    </div>
  </>
);

const DelayNodeEditor: React.FC<{ data: any; onUpdate: (data: any) => void }> = ({ data, onUpdate }) => (
  <>
    <div className="editor-section">
      <label>Duration</label>
      <input
        type="number"
        value={data.duration || 5}
        onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
      />
    </div>
    <div className="editor-section">
      <label>Unit</label>
      <select
        value={data.unit || 'seconds'}
        onChange={(e) => onUpdate({ unit: e.target.value })}
      >
        <option value="seconds">Seconds</option>
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
      </select>
    </div>
  </>
);

const HttpNodeEditor: React.FC<{ data: any; onUpdate: (data: any) => void }> = ({ data, onUpdate }) => (
  <>
    <div className="editor-section">
      <label>Method</label>
      <select
        value={data.method || 'GET'}
        onChange={(e) => onUpdate({ method: e.target.value })}
      >
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
      </select>
    </div>
    <div className="editor-section">
      <label>URL</label>
      <input
        type="text"
        value={data.url || ''}
        onChange={(e) => onUpdate({ url: e.target.value })}
        placeholder="https://api.example.com/endpoint"
      />
    </div>
    <div className="editor-section">
      <label>Headers (JSON)</label>
      <textarea
        value={JSON.stringify(data.headers || {}, null, 2)}
        onChange={(e) => {
          try {
            onUpdate({ headers: JSON.parse(e.target.value) });
          } catch {}
        }}
      />
    </div>
  </>
);

const AiNodeEditor: React.FC<{ data: any; onUpdate: (data: any) => void }> = ({ data, onUpdate }) => (
  <>
    <div className="editor-section">
      <label>Model</label>
      <select
        value={data.model || 'minimax-m2'}
        onChange={(e) => onUpdate({ model: e.target.value })}
      >
        <option value="minimax-m2">Minimax M2</option>
        <option value="minimax-v1">Minimax V1</option>
      </select>
    </div>
    <div className="editor-section">
      <label>Prompt</label>
      <textarea
        value={data.prompt || ''}
        onChange={(e) => onUpdate({ prompt: e.target.value })}
        placeholder="Enter your prompt. Use {{variables.field}} to insert variables."
        rows={5}
      />
    </div>
    <div className="editor-section">
      <label>Temperature</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={data.temperature || 0.7}
        onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
      />
      <span>{data.temperature || 0.7}</span>
    </div>
    <div className="editor-section">
      <label>Max Tokens</label>
      <input
        type="number"
        value={data.maxTokens || 2000}
        onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
      />
    </div>
  </>
);

export default WorkflowDesigner;