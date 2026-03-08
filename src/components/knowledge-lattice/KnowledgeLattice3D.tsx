/**
 * 智能体知识晶格 3D 可视化组件
 *
 * 使用 React Three Fiber 创建交互式 3D 晶格可视化
 */

'use client';

import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  LatticeNode,
  LatticeEdge,
  KnowledgeType,
  RelationType,
} from '@/lib/agents/knowledge-lattice';

// ============== 类型定义 ==============

interface KnowledgeLattice3DProps {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  onNodeClick?: (node: LatticeNode) => void;
  onNodeHover?: (node: LatticeNode | null) => void;
  showLabels?: boolean;
  layout?: 'force' | 'circular' | 'hierarchical';
}

interface NodeProps {
  node: LatticeNode;
  position: [number, number, number];
  onClick: (node: LatticeNode) => void;
  onHover: (node: LatticeNode | null) => void;
  isHovered: boolean;
}

interface EdgeProps {
  edge: LatticeEdge;
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
}

// ============== 颜色配置 ==============

const NODE_COLORS: Record<KnowledgeType, string> = {
  [KnowledgeType.CONCEPT]: '#3B82F6',      // 蓝色
  [KnowledgeType.RULE]: '#EF4444',        // 红色
  [KnowledgeType.EXPERIENCE]: '#10B981',  // 绿色
  [KnowledgeType.SKILL]: '#F59E0B',       // 橙色
  [KnowledgeType.FACT]: '#8B5CF6',       // 紫色
  [KnowledgeType.PREFERENCE]: '#EC4899', // 粉色
  [KnowledgeType.MEMORY]: '#6B7280',     // 灰色
};

const EDGE_COLORS: Record<RelationType, string> = {
  [RelationType.PARTIAL_ORDER]: '#60A5FA',
  [RelationType.EQUIVALENCE]: '#34D399',
  [RelationType.COMPLEMENT]: '#FBBF24',
  [RelationType.ASSOCIATION]: '#A78BFA',
  [RelationType.CAUSAL]: '#F87171',
};

// ============== 节点组件 ==============

function Node({ node, position, onClick, onHover, isHovered }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  const color = NODE_COLORS[node.type];
  const scale = isHovered || hovered ? 1.2 : 0.8 + (node.weight * 0.4);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          onHover(node);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHover(false);
          onHover(null);
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered || hovered ? 0.5 : 0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="#FFFFFF"
        anchorX="center"
        anchorY="bottom"
        visible={isHovered || hovered}
      >
        {node.content.substring(0, 20)}...
      </Text>
    </group>
  );
}

// ============== 边组件 ==============

function Edge({ edge, fromPosition, toPosition }: EdgeProps) {
  const color = EDGE_COLORS[edge.type];
  const lineWidth = 0.5 + (edge.weight * 1.5);

  const points = useMemo(() => {
    return [
      new THREE.Vector3(...fromPosition),
      new THREE.Vector3(...toPosition),
    ];
  }, [fromPosition, toPosition]);

  return (
    <line>
      <bufferGeometry
        attach="geometry"
        setFromPoints={points}
      />
      <lineBasicMaterial
        attach="material"
        color={color}
        linewidth={lineWidth}
        transparent
        opacity={0.6}
      />
    </line>
  );
}

// ============== 布局算法 ==============

function calculateLayout(
  nodes: LatticeNode[],
  edges: LatticeEdge[],
  layout: 'force' | 'circular' | 'hierarchical' = 'force'
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();

  if (layout === 'circular') {
    const radius = 10;
    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      positions.set(node.id, [
        radius * Math.cos(angle),
        (Math.random() - 0.5) * 2,
        radius * Math.sin(angle),
      ]);
    });
  } else if (layout === 'hierarchical') {
    // 按类型分层
    const layers: Record<KnowledgeType, LatticeNode[]> = {
      [KnowledgeType.CONCEPT]: [],
      [KnowledgeType.RULE]: [],
      [KnowledgeType.EXPERIENCE]: [],
      [KnowledgeType.SKILL]: [],
      [KnowledgeType.FACT]: [],
      [KnowledgeType.PREFERENCE]: [],
      [KnowledgeType.MEMORY]: [],
    };

    nodes.forEach(node => {
      layers[node.type].push(node);
    });

    let yOffset = 10;
    const layerTypes = Object.values(KnowledgeType);
    layerTypes.forEach(type => {
      const layerNodes = layers[type];
      const layerWidth = layerNodes.length * 2;
      const layerStart = -layerWidth / 2;

      layerNodes.forEach((node, index) => {
        positions.set(node.id, [
          layerStart + index * 2,
          yOffset,
          (Math.random() - 0.5) * 2,
        ]);
      });

      yOffset -= 4;
    });
  } else {
    // 力导向布局（简化版）
    const forceIterations = 100;
    const repulsion = 5;
    const attraction = 0.1;

    // 初始随机位置
    nodes.forEach(node => {
      positions.set(node.id, [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      ]);
    });

    // 迭代计算
    for (let i = 0; i < forceIterations; i++) {
      const forces = new Map<string, [number, number, number]>();

      nodes.forEach(node => {
        forces.set(node.id, [0, 0, 0]);
      });

      // 斥力
      nodes.forEach((node1, idx1) => {
        nodes.forEach((node2, idx2) => {
          if (idx1 >= idx2) return;

          const pos1 = positions.get(node1.id)!;
          const pos2 = positions.get(node2.id)!;

          const dx = pos1[0] - pos2[0];
          const dy = pos1[1] - pos2[1];
          const dz = pos1[2] - pos2[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          const f1 = forces.get(node1.id)!;
          const f2 = forces.get(node2.id)!;

          forces.set(node1.id, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
          forces.set(node2.id, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
        });
      });

      // 引力（边）
      edges.forEach(edge => {
        const pos1 = positions.get(edge.from)!;
        const pos2 = positions.get(edge.to)!;

        const dx = pos2[0] - pos1[0];
        const dy = pos2[1] - pos1[1];
        const dz = pos2[2] - pos1[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        const force = attraction * dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        const f1 = forces.get(edge.from)!;
        const f2 = forces.get(edge.to)!;

        forces.set(edge.from, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
        forces.set(edge.to, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
      });

      // 应用力
      forces.forEach((force, nodeId) => {
        const pos = positions.get(nodeId)!;
        const newPos: [number, number, number] = [
          pos[0] + force[0],
          pos[1] + force[1],
          pos[2] + force[2],
        ];
        positions.set(nodeId, newPos);
      });
    }
  }

  return positions;
}

// ============== 主场景组件 ==============

function Scene({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  layout,
  showLabels,
}: KnowledgeLattice3DProps) {
  const [hoveredNode, setHoveredNode] = useState<LatticeNode | null>(null);

  const positions = useMemo(() => {
    return calculateLayout(nodes, edges, layout);
  }, [nodes, edges, layout]);

  const handleNodeClick = (node: LatticeNode) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const handleNodeHover = (node: LatticeNode | null) => {
    setHoveredNode(node);
    if (onNodeHover) {
      onNodeHover(node);
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* 渲染边 */}
      {edges.map((edge) => {
        const fromPos = positions.get(edge.from);
        const toPos = positions.get(edge.to);
        if (!fromPos || !toPos) return null;

        return (
          <Edge
            key={edge.id}
            edge={edge}
            fromPosition={fromPos}
            toPosition={toPos}
          />
        );
      })}

      {/* 渲染节点 */}
      {nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;

        return (
          <Node
            key={node.id}
            node={node}
            position={position}
            onClick={handleNodeClick}
            onHover={handleNodeHover}
            isHovered={hoveredNode?.id === node.id}
          />
        );
      })}

      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

// ============== 主组件 ==============

export default function KnowledgeLattice3D({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  showLabels = true,
  layout = 'force',
}: KnowledgeLattice3DProps) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 60 }}
        style={{ background: '#0f172a' }}
      >
        <Scene
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          layout={layout}
          showLabels={showLabels}
        />
      </Canvas>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 p-4 rounded-lg text-white text-sm">
        <h3 className="font-bold mb-2">节点类型</h3>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}