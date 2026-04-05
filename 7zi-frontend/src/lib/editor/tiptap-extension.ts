/**
 * TipTap Extensions and Presets
 *
 * v1.12.2 - 富文本编辑器增强
 * 提供自定义 TipTap 扩展和预设配置
 */

import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

// 创建 lowlight 实例用于代码高亮
const lowlight = createLowlight(common)

/**
 * 自定义扩展：自动链接检测
 */
const AutoLink = Extension.create({
  name: 'autoLink',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          class: {
            default: null,
          },
        },
      },
    ]
  },
})

/**
 * 基础编辑器预设
 * 包含最常用的富文本功能
 */
export const basicEditorPreset = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false, // 使用 CodeBlockLowlight 替代
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
    },
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
    HTMLAttributes: {
      class: 'rounded-lg bg-gray-100 p-4 font-mono text-sm dark:bg-gray-800',
    },
  }),
  Placeholder.configure({
    placeholder: '输入内容...',
    emptyEditorClass: 'is-editor-empty',
  }),
  AutoLink,
]

/**
 * 完整编辑器预设
 * 包含所有富文本功能
 */
export const fullEditorPreset = [
  ...basicEditorPreset,
  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'max-w-full h-auto rounded-lg',
    },
  }),
]

/**
 * 轻量级编辑器预设
 * 仅包含基础格式化功能
 */
export const minimalEditorPreset = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
  }),
]

/**
 * 邮件编辑器预设
 * 专为邮件内容设计
 */
export const emailEditorPreset = [
  StarterKit.configure({
    heading: {
      levels: [1, 2],
    },
    codeBlock: false,
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-blue-600 underline',
    },
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Placeholder.configure({
    placeholder: '输入邮件内容...',
  }),
]

/**
 * 预设类型
 */
export type EditorPreset = 'basic' | 'full' | 'minimal' | 'email'

/**
 * 根据预设名称获取扩展配置
 */
export function getPresetExtensions(preset: EditorPreset = 'basic') {
  switch (preset) {
    case 'full':
      return fullEditorPreset
    case 'minimal':
      return minimalEditorPreset
    case 'email':
      return emailEditorPreset
    case 'basic':
    default:
      return basicEditorPreset
  }
}

/**
 * 导出所有扩展
 */
export {
  StarterKit,
  Underline,
  TextAlign,
  Placeholder,
  Link,
  Image,
  CodeBlockLowlight,
  lowlight,
}