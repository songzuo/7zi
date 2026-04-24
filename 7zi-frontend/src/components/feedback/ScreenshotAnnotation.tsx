/**
 * ScreenshotAnnotation - 截图标注组件
 *
 * Features:
 * - 支持截图上传
 * - 框选标注（矩形）
 * - 画笔标注（自由绘制）
 * - 文字标注
 * - 撤销/重做
 * - 导出标注后的图片
 */

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Camera,
  Upload,
  Download,
  Undo,
  Redo,
  Trash2,
  Square,
  PenTool,
  Type,
  X,
  Plus,
  Minus,
  RotateCw,
} from 'lucide-react'

type AnnotationType = 'rect' | 'pen' | 'text'

interface RectAnnotation {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
}

interface PenAnnotation {
  type: 'pen'
  points: { x: number; y: number }[]
  color: string
  lineWidth: number
}

interface TextAnnotation {
  type: 'text'
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

type Annotation = RectAnnotation | PenAnnotation | TextAnnotation

interface ScreenshotAnnotationProps {
  onImageAdd: (imageUrl: string) => void
  onImageRemove: (imageUrl: string) => void
  images: string[]
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#000000', // black
  '#ffffff', // white
]

const LINE_WIDTHS = [2, 4, 6, 8]
const FONT_SIZES = [12, 16, 20, 24]

export default function ScreenshotAnnotation({
  onImageAdd,
  onImageRemove,
  images,
}: ScreenshotAnnotationProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentTool, setCurrentTool] = useState<AnnotationType>('rect')
  const [currentColor, setCurrentColor] = useState('#ef4444')
  const [currentLineWidth, setCurrentLineWidth] = useState(4)
  const [currentFontSize, setCurrentFontSize] = useState(16)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([])
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const [history, setHistory] = useState<Annotation[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [zoom, setZoom] = useState(1)
  const [scale, setScale] = useState(1)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load image
  useEffect(() => {
    if (selectedImage && imageRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = imageRef.current
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      ctx.drawImage(img, 0, 0)
      renderAnnotations(ctx)
    }
  }, [selectedImage, annotations, zoom])

  // Render annotations
  const renderAnnotations = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.save()

      // Apply zoom
      if (zoom !== 1) {
        ctx.scale(zoom, zoom)
      }

      annotations.forEach(annotation => {
        ctx.strokeStyle = annotation.color
        ctx.fillStyle = annotation.color

        if (annotation.type === 'rect') {
          ctx.lineWidth = annotation.lineWidth
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)

          // Semi-transparent fill
          ctx.globalAlpha = 0.1
          ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height)
          ctx.globalAlpha = 1
        } else if (annotation.type === 'pen') {
          ctx.lineWidth = annotation.lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          annotation.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.stroke()
        } else if (annotation.type === 'text') {
          ctx.font = `${annotation.fontSize}px Arial`
          ctx.fillText(annotation.text, annotation.x, annotation.y)
        }
      })

      ctx.restore()
    },
    [annotations, zoom]
  )

  // Save to history
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...annotations])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [annotations, history, historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations([...history[historyIndex - 1]])
    }
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations([...history[historyIndex + 1]])
    }
  }, [history, historyIndex])

  // Clear all annotations
  const clearAnnotations = useCallback(() => {
    setAnnotations([])
    setHistory([])
    setHistoryIndex(-1)
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const file = files[0]

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('文件大小不能超过 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = event => {
        const url = event.target?.result as string
        setSelectedImage(url)
        setAnnotations([])
        setHistory([])
        setHistoryIndex(-1)
      }
      reader.readAsDataURL(file)
    },
    []
  )

  // Handle screenshot capture
  const handleCaptureScreenshot = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('您的浏览器不支持截图功能')
        return
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      await new Promise(resolve => setTimeout(resolve, 1000))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const url = canvas.toDataURL('image/png')
        setSelectedImage(url)
        setAnnotations([])
        setHistory([])
        setHistoryIndex(-1)
      }

      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      if (error instanceof Error && error.name !== 'NotAllowedError') {
        alert('截图失败，请重试')
      }
    }
  }, [])

  // Handle canvas mouse events
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom

      if (currentTool === 'text') {
        setTextInput({ x, y })
        setTextValue('')
        return
      }

      setIsDrawing(true)
      setStartPoint({ x, y })

      if (currentTool === 'pen') {
        setPenPoints([{ x, y }])
      }
    },
    [currentTool, zoom]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom

      if (currentTool === 'pen') {
        setPenPoints(prev => [...prev, { x, y }])
      }

      if (currentTool === 'rect' && startPoint) {
        // Preview rect (not saved yet)
      }
    },
    [isDrawing, currentTool, startPoint, zoom]
  )

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current || !startPoint) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom

      let newAnnotation: Annotation | null = null

      if (currentTool === 'rect') {
        const width = x - startPoint.x
        const height = y - startPoint.y

        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
          newAnnotation = {
            type: 'rect' as const,
            x: width > 0 ? startPoint.x : x,
            y: height > 0 ? startPoint.y : y,
            width: Math.abs(width),
            height: Math.abs(height),
            color: currentColor,
            lineWidth: currentLineWidth,
          }
        }
      } else if (currentTool === 'pen' && penPoints.length > 1) {
        newAnnotation = {
          type: 'pen' as const,
          points: penPoints,
          color: currentColor,
          lineWidth: currentLineWidth,
        }
      }

      if (newAnnotation) {
        const newAnnotations = [...annotations, newAnnotation]
        setAnnotations(newAnnotations)
        saveToHistory()
      }

      setIsDrawing(false)
      setStartPoint(null)
      setPenPoints([])
    },
    [
      isDrawing,
      startPoint,
      currentTool,
      zoom,
      currentColor,
      currentLineWidth,
      annotations,
      penPoints,
      saveToHistory,
    ]
  )

  // Handle text input
  const handleTextSubmit = useCallback(() => {
    if (textInput && textValue.trim()) {
      const newAnnotation: TextAnnotation = {
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        text: textValue,
        color: currentColor,
        fontSize: currentFontSize,
      }

      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory()
    }

    setTextInput(null)
    setTextValue('')
  }, [textInput, textValue, currentColor, currentFontSize, annotations, saveToHistory])

  // Export annotated image
  const handleExport = useCallback(() => {
    if (!canvasRef.current) return

    const url = canvasRef.current.toDataURL('image/png')
    onImageAdd(url)
    setSelectedImage(null)
    setAnnotations([])
  }, [onImageAdd])

  // Zoom in/out
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    // Implement rotation if needed
  }, [])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        {/* Upload buttons */}
        <div className="flex items-center space-x-2 border-r border-gray-200 pr-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            上传
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={handleCaptureScreenshot}>
            <Camera className="mr-1 h-4 w-4" />
            截图
          </Button>
        </div>

        {/* Drawing tools */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
          <Button
            variant={currentTool === 'rect' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('rect')}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'pen' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('pen')}
          >
            <PenTool className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'text' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('text')}
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        {/* Colors */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setCurrentColor(color)}
              className={`h-6 w-6 rounded-full border-2 ${
                currentColor === color ? 'border-blue-500' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Line width / Font size */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
          {currentTool === 'text' ? (
            FONT_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setCurrentFontSize(size)}
                className={`rounded px-2 py-1 text-xs ${
                  currentFontSize === size ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                {size}
              </button>
            ))
          ) : (
            LINE_WIDTHS.map(width => (
              <button
                key={width}
                type="button"
                onClick={() => setCurrentLineWidth(width)}
                className={`rounded px-2 py-1 text-xs ${
                  currentLineWidth === width ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                {width}
              </button>
            ))
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 3}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Clear and Export */}
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={clearAnnotations} disabled={annotations.length === 0}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={!selectedImage || annotations.length === 0}
          >
            <Download className="mr-1 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      {selectedImage ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <img
            ref={imageRef}
            src={selectedImage}
            alt="Screenshot"
            className="hidden"
            onLoad={() => {
              if (canvasRef.current && imageRef.current) {
                const canvas = canvasRef.current
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  canvas.width = imageRef.current.naturalWidth
                  canvas.height = imageRef.current.naturalHeight
                  ctx.drawImage(imageRef.current, 0, 0)
                  renderAnnotations(ctx)
                }
              }
            }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
            className="cursor-crosshair"
            style={{ width: '100%', height: 'auto' }}
          />

          {/* Text input overlay */}
          {textInput && (
            <div
              className="absolute rounded-lg border-2 border-blue-500 bg-white p-2 shadow-lg"
              style={{
                left: textInput.x,
                top: textInput.y,
                transform: `scale(${1 / zoom})`,
              }}
            >
              <input
                type="text"
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleTextSubmit()
                  } else if (e.key === 'Escape') {
                    setTextInput(null)
                    setTextValue('')
                  }
                }}
                autoFocus
                className="w-48 rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="输入文字..."
              />
              <div className="mt-2 flex justify-end space-x-2">
                <Button size="sm" variant="outline" onClick={() => setTextInput(null)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleTextSubmit}>
                  确定
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="text-center">
            <Camera className="mx-auto mb-2 h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-500">上传图片或使用截图功能</p>
          </div>
        </div>
      )}

      {/* Uploaded images list */}
      {images.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">已上传的图片</h4>
          <div className="grid grid-cols-4 gap-2">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Uploaded ${index + 1}`}
                  className="h-24 w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => onImageRemove(url)}
                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}