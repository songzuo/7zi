/**
 * useRichTextEditor Hook
 *
 * v1.12.2 - 富文本编辑器增强
 * 提供 TipTap 编辑器实例管理、快捷键处理和内容同步
 */

import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect, useCallback, useRef } from 'react'
import { getPresetExtensions, type EditorPreset } from '@/lib/editor/tiptap-extension'

export interface RichTextEditorOptions {
  /**
   * 初始内容（HTML 格式）
   */
  content?: string
  /**
   * 编辑器预设（basic | full | minimal | email）
   */
  preset?: EditorPreset
  /**
   * 是否只读
   */
  editable?: boolean
  /**
   * 内容变化回调
   */
  onUpdate?: (content: { html: string; json: string }) => void
  /**
   * 编辑器初始化完成回调
   */
  onReady?: (editor: any) => void
  /**
   * 自定义扩展
   */
  extensions?: any[]
  /**
   * 最小高度（像素）
   */
  minHeight?: number
  /**
   * 最大高度（像素）
   */
  maxHeight?: number
  /**
   * 占位符文本
   */
  placeholder?: string
}

export interface RichTextEditorReturn {
  editor: any
  EditorContent: typeof EditorContent
  // 内容相关
  getHTML: () => string
  getJSON: () => any
  getText: () => string
  setContent: (content: string) => void
  // 格式化工具
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
  toggleHeading: (level: number) => void
  toggleBulletList: () => void
  toggleOrderedList: () => void
  toggleBlockquote: () => void
  toggleCodeBlock: () => void
  setLink: (url: string) => void
  unsetLink: () => void
  // 操作工具
  undo: () => void
  redo: () => void
  clearContent: () => void
  // 状态查询
  isActive: (name: string, attributes?: any) => boolean
  canUndo: () => boolean
  canRedo: () => boolean
  isEmpty: () => boolean
  // 快捷键
  handleKeyDown: (event: KeyboardEvent | React.KeyboardEvent) => void
}

/**
 * TipTap 富文本编辑器 Hook
 *
 * @example
 * ```tsx
 * const { editor, EditorContent, toggleBold, toggleItalic } = useRichTextEditor({
 *   content: '<p>Hello world</p>',
 *   onUpdate: ({ html, json }) => console.log(html, json),
 * })
 *
 * return <EditorContent editor={editor} />
 * ```
 */
export function useRichTextEditor(options: RichTextEditorOptions = {}): RichTextEditorReturn {
  const {
    content = '',
    preset = 'basic',
    editable = true,
    onUpdate,
    onReady,
    extensions: customExtensions = [],
    minHeight,
    maxHeight,
    placeholder,
  } = options

  const onUpdateRef = useRef(onUpdate)
  const onReadyRef = useRef(onReady)

  // 保持回调引用最新
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  // 获取扩展配置
  const getPresetExtensionsCallback = useCallback(() => {
    const baseExtensions = getPresetExtensions(preset)

    // 如果有自定义占位符，更新 Placeholder 扩展
    if (placeholder) {
      return baseExtensions.map(ext => {
        if (ext.name === 'placeholder') {
          return Placeholder.configure({
            placeholder,
          })
        }
        return ext
      })
    }

    return baseExtensions
  }, [preset, placeholder])

  // 初始化编辑器
  const editor = useEditor({
    extensions: [...getPresetExtensionsCallback(), ...customExtensions],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const json = JSON.stringify(editor.getJSON())
      onUpdateRef.current?.({ html, json })
    },
    onCreate: ({ editor }) => {
      onReadyRef.current?.(editor)
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none ${
          minHeight ? `min-h-[${minHeight}px]` : ''
        } ${maxHeight ? `max-h-[${maxHeight}px] overflow-y-auto` : ''}`,
      },
    },
  })

  // 监听内容变化（外部传入）
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // 避免在用户正在编辑时强制更新
      if (!editor.isFocused) {
        editor.commands.setContent(content, false)
      }
    }
  }, [content, editor])

  // 快捷键处理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl/Cmd + B: Bold
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault()
      editor?.chain().focus().toggleBold().run()
    }

    // Ctrl/Cmd + I: Italic
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
      event.preventDefault()
      editor?.chain().focus().toggleItalic().run()
    }

    // Ctrl/Cmd + U: Underline
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
      event.preventDefault()
      editor?.chain().focus().toggleUnderline().run()
    }

    // Ctrl/Cmd + Shift + S: Strikethrough
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault()
      editor?.chain().focus().toggleStrike().run()
    }

    // Ctrl/Cmd + K: Link
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault()
      const url = prompt('输入链接地址：')
      if (url) {
        editor?.chain().focus().setLink({ href: url }).run()
      }
    }

    // Ctrl/Cmd + Shift + C: Code Block
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
      event.preventDefault()
      editor?.chain().focus().toggleCodeBlock().run()
    }

    // Ctrl/Cmd + Shift + B: Blockquote
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'B') {
      event.preventDefault()
      editor?.chain().focus().toggleBlockquote().run()
    }

    // Ctrl/Cmd + Z: Undo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      editor?.chain().focus().undo().run()
    }

    // Ctrl/Cmd + Shift + Z: Redo (或 Ctrl/Cmd + Y)
    if (
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
      ((event.ctrlKey || event.metaKey) && event.key === 'y')
    ) {
      event.preventDefault()
      editor?.chain().focus().redo().run()
    }
  }, [editor])

  // 内容操作
  const getHTML = useCallback(() => {
    return editor?.getHTML() || ''
  }, [editor])

  const getJSON = useCallback(() => {
    return editor?.getJSON() || {}
  }, [editor])

  const getText = useCallback(() => {
    return editor?.getText() || ''
  }, [editor])

  const setContent = useCallback((content: string) => {
    editor?.commands.setContent(content, false)
  }, [editor])

  // 格式化工具
  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run()
  }, [editor])

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run()
  }, [editor])

  const toggleHeading = useCallback((level: number) => {
    editor?.chain().focus().toggleHeading({ level }).run()
  }, [editor])

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run()
  }, [editor])

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run()
  }, [editor])

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run()
  }, [editor])

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run()
  }, [editor])

  const setLink = useCallback((url: string) => {
    editor?.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const unsetLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run()
  }, [editor])

  // 操作工具
  const undo = useCallback(() => {
    editor?.chain().focus().undo().run()
  }, [editor])

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run()
  }, [editor])

  const clearContent = useCallback(() => {
    editor?.commands.clearContent()
  }, [editor])

  // 状态查询
  const isActive = useCallback((name: string, attributes?: any) => {
    return editor?.isActive(name, attributes) || false
  }, [editor])

  const canUndo = useCallback(() => {
    return editor?.can().undo() || false
  }, [editor])

  const canRedo = useCallback(() => {
    return editor?.can().redo() || false
  }, [editor])

  const isEmpty = useCallback(() => {
    return editor?.isEmpty || false
  }, [editor])

  return {
    editor,
    EditorContent,
    // 内容相关
    getHTML,
    getJSON,
    getText,
    setContent,
    // 格式化工具
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    toggleHeading,
    toggleBulletList,
    toggleOrderedList,
    toggleBlockquote,
    toggleCodeBlock,
    setLink,
    unsetLink,
    // 操作工具
    undo,
    redo,
    clearContent,
    // 状态查询
    isActive,
    canUndo,
    canRedo,
    isEmpty,
    // 快捷键
    handleKeyDown,
  }
}
