'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  WorkflowNode,
  WorkflowEdge,
  NodeType,
} from '@/types/workflow';
import { WorkflowNodeComponent } from './node';
import { WorkflowEdgeComponent } from './edge';
import { DesignerToolbar } from './toolbar';
import { cn } from '@/lib/utils';

/**
 * 画布状态
 */
interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  gridSize: number;
  snapToGrid: boolean;
}

/**
 * 画布属性
 */
interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string | undefined) => void;
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeAdd?: (type: NodeType, position: { x: number; y: number }) => void;
  onNodeDelete?: (nodeId: string) => void;
  onEdgeAdd?: (sourceId: string, targetId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  readOnly?: boolean;
  className?: string;
}

export interface WorkflowCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  exportAsImage: () => string | null;
}

/**
 * 工作流画布组件
 * 支持缩放、拖拽、网格对齐
 */
export const WorkflowCanvas = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>(
  (
    {
      nodes,
      edges,
      selectedNodeId,
      onNodeSelect,
      onNodeMove,
      onNodeAdd,
      onNodeDelete,
      onEdgeAdd,
      onEdgeDelete,
      readOnly = false,
      className,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // 画布状态
    const [canvasState, setCanvasState] = useState<CanvasState>({
      zoom: 1,
      pan: { x: 0, y: 0 },
      gridSize: 20,
      snapToGrid: true,
    });

    // 拖拽状态
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // 连接线绘制状态
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // 对齐到网格
    const snapPosition = useCallback(
      (position: { x: number; y: number }) => {
        if (!canvasState.snapToGrid) return position;
        return {
          x: Math.round(position.x / canvasState.gridSize) * canvasState.gridSize,
          y: Math.round(position.y / canvasState.gridSize) * canvasState.gridSize,
        };
      },
      [canvasState.gridSize, canvasState.snapToGrid]
    );

    // 缩放
    const zoomIn = useCallback(() => {
      setCanvasState((prev) => ({
        ...prev,
        zoom: Math.min(prev.zoom * 1.2, 3),
      }));
    }, []);

    const zoomOut = useCallback(() => {
      setCanvasState((prev) => ({
        ...prev,
        zoom: Math.max(prev.zoom / 1.2, 0.3),
      }));
    }, []);

    const fitToScreen = useCallback(() => {
      if (!canvasRef.current || nodes.length === 0) return;

      const bounds = canvasRef.current.getBoundingClientRect();
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      nodes.forEach((node) => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + 200); // 假设节点宽度为 200
        maxY = Math.max(maxY, node.position.y + 100); // 假设节点高度为 100
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const padding = 50;

      const zoom = Math.min(
        (bounds.width - padding * 2) / contentWidth,
        (bounds.height - padding * 2) / contentHeight,
        1
      );

      setCanvasState((prev) => ({
        ...prev,
        zoom,
        pan: {
          x: (bounds.width - contentWidth * zoom) / 2 - minX * zoom,
          y: (bounds.height - contentHeight * zoom) / 2 - minY * zoom,
        },
      }));
    }, [nodes]);

    // 导出为图片
    const exportAsImage = useCallback((): string | null => {
      if (!svgRef.current) return null;
      // 实际实现需要使用 html2canvas 或类似库
      return null;
    }, []);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      fitToScreen,
      exportAsImage,
    }));

    // 画布鼠标事件
    const handleCanvasMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
          // 中键或 Alt+左键 拖动画布
          setIsPanning(true);
          setStartPan({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
        } else if (e.button === 0 && !e.target.closest('[data-node-id]')) {
          // 点击空白区域取消选择
          onNodeSelect?.(undefined);
        }
      },
      [canvasState.pan, onNodeSelect]
    );

    const handleCanvasMouseMove = useCallback(
      (e: React.MouseEvent) => {
        // 更新鼠标位置（用于连接线）
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setMousePosition({
            x: (e.clientX - rect.left - canvasState.pan.x) / canvasState.zoom,
            y: (e.clientY - rect.top - canvasState.pan.y) / canvasState.zoom,
          });
        }

        if (isPanning) {
          setCanvasState((prev) => ({
            ...prev,
            pan: {
              x: e.clientX - startPan.x,
              y: e.clientY - startPan.y,
            },
          }));
        }

        if (isDraggingNode && onNodeMove) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;

          const newPosition = snapPosition({
            x: (e.clientX - rect.left - canvasState.pan.x) / canvasState.zoom - dragOffset.x,
            y: (e.clientY - rect.top - canvasState.pan.y) / canvasState.zoom - dragOffset.y,
          });

          onNodeMove(isDraggingNode, newPosition);
        }
      },
      [isPanning, startPan, isDraggingNode, dragOffset, canvasState, snapPosition, onNodeMove]
    );

    const handleCanvasMouseUp = useCallback(() => {
      setIsPanning(false);
      setIsDraggingNode(null);
    }, []);

    // 节点事件
    const handleNodeMouseDown = useCallback(
      (e: React.MouseEvent, nodeId: string) => {
        if (readOnly || e.button !== 0) return;

        e.stopPropagation();
        onNodeSelect?.(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        setIsDraggingNode(nodeId);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        setDragOffset({
          x: (e.clientX - rect.left - canvasState.pan.x) / canvasState.zoom - node.position.x,
          y: (e.clientY - rect.top - canvasState.pan.y) / canvasState.zoom - node.position.y,
        });
      },
      [readOnly, nodes, canvasState, onNodeSelect]
    );

    const handleNodeConnectorMouseDown = useCallback(
      (e: React.MouseEvent, nodeId: string) => {
        if (readOnly) return;
        e.stopPropagation();
        setConnectingFrom(nodeId);
      },
      [readOnly]
    );

    const handleNodeMouseUp = useCallback(
      (e: React.MouseEvent, targetId: string) => {
        if (connectingFrom && connectingFrom !== targetId && onEdgeAdd) {
          onEdgeAdd(connectingFrom, targetId);
        }
        setConnectingFrom(null);
      },
      [connectingFrom, onEdgeAdd]
    );

    // 滚轮缩放
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          setCanvasState((prev) => ({
            ...prev,
            zoom: Math.min(Math.max(prev.zoom * delta, 0.3), 3),
          }));
        }
      },
      []
    );

    // 键盘事件
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (readOnly || !selectedNodeId) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
          onNodeDelete?.(selectedNodeId);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readOnly, selectedNodeId, onNodeDelete]);

    // 绘制网格背景
    const renderGrid = () => {
      const { zoom, pan, gridSize } = canvasState;
      const gridColor = '#e5e7eb';
      const scaledGridSize = gridSize * zoom;

      return (
        <defs>
          <pattern
            id="grid"
            width={scaledGridSize}
            height={scaledGridSize}
            patternUnits="userSpaceOnUse"
            x={pan.x % scaledGridSize}
            y={pan.y % scaledGridSize}
          >
            <path
              d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`}
              fill="none"
              stroke={gridColor}
              strokeWidth={0.5}
            />
          </pattern>
        </defs>
      );
    };

    return (
      <div className={cn('relative w-full h-full overflow-hidden bg-gray-50', className)}>
        {/* 工具栏 */}
        <DesignerToolbar
          zoom={canvasState.zoom}
          snapToGrid={canvasState.snapToGrid}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitToScreen={fitToScreen}
          onToggleSnapToGrid={() =>
            setCanvasState((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }))
          }
        />

        {/* 画布区域 */}
        <div
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{
              transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* 网格背景 */}
            {renderGrid()}
            <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" />

            {/* 边 */}
            <g className="edges">
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                return (
                  <WorkflowEdgeComponent
                    key={edge.id}
                    edge={edge}
                    sourcePosition={sourceNode.position}
                    targetPosition={targetNode.position}
                    onDelete={() => onEdgeDelete?.(edge.id)}
                    readOnly={readOnly}
                  />
                );
              })}

              {/* 正在绘制的连接线 */}
              {connectingFrom && (
                <line
                  x1={nodes.find((n) => n.id === connectingFrom)?.position.x || 0}
                  y1={nodes.find((n) => n.id === connectingFrom)?.position.y || 0}
                  x2={mousePosition.x}
                  y2={mousePosition.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
              )}
            </g>

            {/* 节点 */}
            <g className="nodes">
              {nodes.map((node) => (
                <WorkflowNodeComponent
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                  onConnectorMouseDown={(e) => handleNodeConnectorMouseDown(e, node.id)}
                  readOnly={readOnly}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* 缩放指示器 */}
        <div className="absolute bottom-4 right-4 px-2 py-1 bg-white rounded shadow text-sm text-gray-600">
          {Math.round(canvasState.zoom * 100)}%
        </div>
      </div>
    );
  }
);

WorkflowCanvas.displayName = 'WorkflowCanvas';
