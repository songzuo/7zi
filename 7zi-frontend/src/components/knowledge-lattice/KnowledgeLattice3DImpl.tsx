'use client'

import { useEffect, useRef, useState } from 'react'

interface KnowledgeLattice3DImplProps {
  nodes?: Array<{ id: string; label: string; connections: string[] }>
}

/**
 * KnowledgeLattice3DImpl - Three.js Implementation
 * All three.js related imports are isolated here for dynamic loading
 */
export function KnowledgeLattice3DImpl({ nodes = [] }: KnowledgeLattice3DImplProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameIdRef = useRef<number | null>(null)
  const [threeLoaded, setThreeLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load Three.js on hover or click
  const handleInteraction = () => {
    if (!threeLoaded && !isLoading) {
      setIsLoading(true)
      import('three').then((THREE) => {
        setThreeLoaded(true)
        setIsLoading(false)
        initScene(THREE)
      })
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
      const container = containerRef.current
      if (container) {
        const canvas = container.querySelector('canvas')
        if (canvas) {
          canvas.remove()
        }
      }
    }
  }, [])

  // Initialize Three.js scene (called after Three.js is loaded)
  const initScene = (THREE: typeof import('three')) => {
    if (!containerRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 50

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)

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
          const v1 = new THREE.Vector3(((i % 5) - 2) * 10, Math.floor(i / 5) * 10 - 20, 0)
          const v2 = new THREE.Vector3(((connIdx % 5) - 2) * 10, Math.floor(connIdx / 5) * 10 - 20, 0)

          const geometry = new THREE.BufferGeometry().setFromPoints([v1, v2])
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

    // Store cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)

      // Dispose geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
    }
  }

  // Show loading state or click-to-load prompt
  if (!threeLoaded) {
    return (
      <div
        ref={containerRef}
        className="h-full min-h-[600px] w-full relative cursor-pointer"
        style={{ background: '#0a0a0a' }}
        onMouseEnter={handleInteraction}
        onClick={handleInteraction}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading 3D Scene...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <p className="text-slate-400 mb-2">Click or hover to enable 3D view</p>
            <p className="text-slate-500 text-sm">Three.js will be loaded on demand</p>
          </div>
        )}
      </div>
    )
  }

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
