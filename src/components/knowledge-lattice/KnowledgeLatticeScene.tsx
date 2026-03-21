'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { Vector3 } from 'three';

interface NodeData {
  id: string;
  title: string;
  category: string;
  connections: string[];
}

interface KnowledgeLatticeSceneProps {
  data?: NodeData[];
}

function Node({ position, title, category }: { position: [number, number, number]; title: string; category: string }) {
  const color = useMemo(() => {
    const colors: Record<string, string> = {
      '技术': '#06b6d4', // cyan
      '设计': '#a855f7', // purple
      '产品': '#ec4899', // pink
      '营销': '#f59e0b', // amber
    };
    return colors[category] || '#6b7280';
  }, [category]);

  return (
    <group position={position}>
      {/* Sphere */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Text label */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.15}
        color="#000000"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
    </group>
  );
}

function Edge({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const points = useMemo(() => {
    return [new Vector3(...start), new Vector3(...end)];
  }, [start, end]);

  return (
    <Line points={points} color="#6b7280" opacity={0.5} transparent />
  );
}

function Scene({ data }: { data: NodeData[] }) {
  // Generate random positions for nodes
  const nodePositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    data.forEach((node, i) => {
      const theta = (i / data.length) * Math.PI * 2;
      const phi = Math.acos(2 * (i / data.length) - 1);
      const radius = 3;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      positions[node.id] = [x, y, z];
    });
    return positions;
  }, [data]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <pointLight position={[-10, -10, -10]} />

      {/* Edges */}
      {data.flatMap((node) =>
        node.connections.map((connId) => {
          const start = nodePositions[node.id];
          const end = nodePositions[connId];
          if (!start || !end) return null;
          return <Edge key={`${node.id}-${connId}`} start={start} end={end} />;
        })
      )}

      {/* Nodes */}
      {data.map((node) => {
        const position = nodePositions[node.id];
        if (!position) return null;
        return (
          <Node
            key={node.id}
            position={position}
            title={node.title}
            category={node.category}
          />
        );
      })}

      {/* Controls */}
      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
    </>
  );
}

export default function KnowledgeLatticeScene({ data = [] }: KnowledgeLatticeSceneProps) {
  // Default sample data if none provided
  const sampleData: NodeData[] = data.length > 0 ? data : [
    { id: '1', title: 'React', category: '技术', connections: ['2', '3'] },
    { id: '2', title: 'Three.js', category: '技术', connections: ['1', '4'] },
    { id: '3', title: 'UI设计', category: '设计', connections: ['1', '5'] },
    { id: '4', title: '3D可视化', category: '设计', connections: ['2', '5'] },
    { id: '5', title: '用户体验', category: '产品', connections: ['3', '4'] },
  ];

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <Suspense fallback={null}>
          <Scene data={sampleData} />
        </Suspense>
      </Canvas>
    </div>
  );
}
