'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface KnowledgeLattice3DProps {
  nodes?: Array<{ id: string; label: string; connections: string[] }>
}

/**
 * Knowledge Lattice 3D Visualization
 * Uses Three.js to render an interactive knowledge graph
 */
export function KnowledgeLattice3D({ nodes = [] }: KnowledgeLattice3DProps) {
  'use memo'

  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 50
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create sample nodes (if none provided)
    const displayNodes = nodes.length > 0 ? nodes : generateSampleNodes()

    // Create node spheres
    displayNodes.forEach((node, index) => {
      const geometry = new THREE.SphereGeometry(2, 32, 32)
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL((index * 0.1) % 1, 0.7, 0.5),
        shininess: 100,
      })
      const sphere = new THREE.Mesh(geometry, material)

      // Position in a lattice pattern
      sphere.position.x = ((index % 5) - 2) * 10
      sphere.position.y = Math.floor(index / 5) * 10 - 20
      sphere.position.z = 0

      sphere.userData = { id: node.id, label: node.label }
      scene.add(sphere)
    })

    // Add connections (lines between nodes)
    displayNodes.forEach((node, i) => {
      node.connections.forEach(connIndex => {
        const connIdx = typeof connIndex === 'number' ? connIndex : parseInt(connIndex, 10)
        if (connIdx < displayNodes.length) {
          const points: THREE.Vector3[] = []
          points.push(new THREE.Vector3(((i % 5) - 2) * 10, Math.floor(i / 5) * 10 - 20, 0))
          points.push(
            new THREE.Vector3(((connIdx % 5) - 2) * 10, Math.floor(connIdx / 5) * 10 - 20, 0)
          )

          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          const material = new THREE.LineBasicMaterial({ color: 0x444444 })
          const line = new THREE.Line(geometry, material)
          scene.add(line)
        }
      })
    })

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 10)
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0x0066ff, 1, 100)
    pointLight.position.set(0, 0, 30)
    scene.add(pointLight)

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)

      // Rotate scene slowly
      scene.rotation.y += 0.002

      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)

      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }

      // Dispose geometries and materials
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
    }
  }, [nodes])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[600px] w-full"
      style={{ background: '#0a0a0a' }}
    />
  )
}

function generateSampleNodes() {
  const nodes = []
  for (let i = 0; i < 20; i++) {
    nodes.push({
      id: `node-${i}`,
      label: `Node ${i + 1}`,
      connections: [i + 1, i + 5, i + 10].filter(n => n < 20 && n !== i),
    })
  }
  return nodes
}
