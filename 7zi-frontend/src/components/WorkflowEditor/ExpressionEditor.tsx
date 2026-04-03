/**
 * ExpressionEditor - 表达式编辑器
 *
 * v1.9.1 新增
 * 支持语法高亮的表达式编辑器
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'

interface ExpressionEditorProps {
  value: string
  onChange: (value: string) => void
  language?: 'javascript' | 'json' | 'expression'
  placeholder?: string
  readOnly?: boolean
  minRows?: number
  maxRows?: number
  error?: string
  variables?: string[]
}

/**
 * 表达式编辑器组件
 * 提供语法高亮和自动完成支持
 */
export function ExpressionEditor({
  value,
  onChange,
  language = 'expression',
  placeholder = '输入表达式...',
  readOnly = false,
  minRows = 3,
  maxRows = 10,
  error,
  variables = [],
}: ExpressionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 })
  const [filteredVariables, setFilteredVariables] = useState<string[]>([])

  // 计算文本行数
  const calculateRows = useCallback(() => {
    const lines = value.split('\n').length
    return Math.min(Math.max(lines, minRows), maxRows)
  }, [value, minRows, maxRows])

  // 处理输入变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)

      // 触发自动完成
      if (newValue.endsWith('{{')) {
        const textarea = textareaRef.current
        if (textarea) {
          const rect = textarea.getBoundingClientRect()
          const selectionStart = textarea.selectionStart
          const lines = newValue.substring(0, selectionStart).split('\n')
          const currentLine = lines.length
          const currentCol = lines[lines.length - 1].length

          setAutocompletePosition({
            top: currentLine * 20,
            left: currentCol * 8,
          })
          setFilteredVariables(variables)
          setShowAutocomplete(true)
        }
      } else if (!newValue.includes('{{')) {
        setShowAutocomplete(false)
      }
    },
    [onChange, variables]
  )

  // 选择变量
  const selectVariable = useCallback(
    (variable: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const selectionStart = textarea.selectionStart
      const beforeCursor = value.substring(0, selectionStart)
      const afterCursor = value.substring(selectionStart)

      // 找到最后一个 {{ 的位置
      const lastBraceIndex = beforeCursor.lastIndexOf('{{')
      if (lastBraceIndex !== -1) {
        const newValue =
          beforeCursor.substring(0, lastBraceIndex + 2) +
          variable +
          '}}' +
          afterCursor
        onChange(newValue)
      }

      setShowAutocomplete(false)
    },
    [value, onChange]
  )

  // 过滤变量
  const filterVariables = useCallback(
    (searchTerm: string) => {
      const filtered = variables.filter(v =>
        v.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredVariables(filtered)
    },
    [variables]
  )

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAutocomplete(false)
      }
    },
    []
  )

  return (
    <div className="relative">
      {/* 编辑器容器 */}
      <div
        className={`relative rounded-lg border transition-all ${
          isFocused
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : error
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
        } ${readOnly ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}
      >
        {/* 语法高亮层（预览） */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden p-3 font-mono text-sm whitespace-pre-wrap break-all"
          aria-hidden="true"
        >
          {highlightSyntax(value, language)}
        </div>

        {/* 实际输入框 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          rows={calculateRows()}
          className="relative z-10 w-full resize-none bg-transparent p-3 font-mono text-sm text-transparent caret-gray-900 focus:outline-none dark:caret-white"
          style={{
            caretColor: 'currentColor',
          }}
        />

        {/* 语言标签 */}
        <div className="absolute bottom-1 right-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {language.toUpperCase()}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* 自动完成下拉 */}
      {showAutocomplete && filteredVariables.length > 0 && (
        <div
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={{
            top: autocompletePosition.top + 60,
            left: autocompletePosition.left,
          }}
        >
          <div className="p-2">
            <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              可用变量
            </div>
            {filteredVariables.map(variable => (
              <button
                key={variable}
                type="button"
                onClick={() => selectVariable(variable)}
                className="w-full rounded px-2 py-1.5 text-left text-sm font-mono hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {variable}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 快捷提示 */}
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>💡 使用 {'{{变量名}}'} 插入变量</span>
        <span>|</span>
        <span>Tab 缩进</span>
        <span>|</span>
        <span>Esc 关闭自动完成</span>
      </div>
    </div>
  )
}

/**
 * 语法高亮函数
 */
function highlightSyntax(code: string, language: string): React.ReactNode {
  if (!code) return null

  // 简单的语法高亮实现
  const parts: React.ReactNode[] = []
  let key = 0

  // 高亮变量 {{...}}
  const variableRegex = /{{([^}]+)}}/g
  // 高亮字符串
  const stringRegex = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g
  // 高亮关键字
  const keywordRegex = /\b(return|if|else|for|while|function|const|let|var|true|false|null|undefined)\b/g
  // 高亮数字
  const numberRegex = /\b(\d+\.?\d*)\b/g

  let lastIndex = 0
  let result = code

  // 高亮变量
  result = result.replace(variableRegex, (_, variable) => {
    return `<span class="text-purple-600 dark:text-purple-400 font-semibold">{{${variable}}}</span>`
  })

  // 高亮字符串
  result = result.replace(stringRegex, match => {
    return `<span class="text-green-600 dark:text-green-400">${match}</span>`
  })

  // 高亮关键字
  result = result.replace(keywordRegex, match => {
    return `<span class="text-blue-600 dark:text-blue-400 font-semibold">${match}</span>`
  })

  // 高亮数字
  result = result.replace(numberRegex, match => {
    return `<span class="text-orange-600 dark:text-orange-400">${match}</span>`
  })

  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

export default ExpressionEditor