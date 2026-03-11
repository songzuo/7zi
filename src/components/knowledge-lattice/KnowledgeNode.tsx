/**
 * 知识晶格节点组件
 */

'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { LatticeNode, KnowledgeType } from '@/lib/agents/knowledge-lattice';

// 节点颜色配置
export const NODE_COLORS: Record<KnowledgeType, string> = {
  [KnowledgeType.CONCEPT]: '#3B82F6',      // 蓝色
  [KnowledgeType.RULE]: '#EF4444',        // 红色
  [KnowledgeType.EXPERIENCE]: '#10B981',  // 绿色
  [KnowledgeType.SKILL]: '#F59E0B',       // 橙色
  [KnowledgeType.FACT]: '#8B5CF6',       // 紫色
  [KnowledgeType.PREFERENCE]: '#EC4899', // 粉色
  [KnowledgeType.MEMORY]: '#6B7280',     // 灰色
};

export interface KnowledgeNodeProps {
  node: LatticeNode;
  position: [number, number, number];
  onClick: (node: LatticeNode) => void;
  onHover: (node: LatticeNode | null) => void;
  isHovered: boolean;
  showLabel?: boolean;
}

export default function KnowledgeNode({
  node,
  position,
  onClick,
  onHover,
  isHovered,
  showLabel = true,
}: KnowledgeNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  const color = NODE_COLORS[node.type];
  const scale = isHovered || hovered ? 1.2 : 0.8 + (node.weight * 0.4);

  useFrame(() => {
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
      {showLabel && (isHovered || hovered) && (
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.3}
          color="#FFFFFF"
          anchorX="center"
          anchorY="bottom"
        >
          {node.content.substring(0, 20)}...
        </Text>
      )}
    </group>
  );
}