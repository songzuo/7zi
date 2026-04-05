'use client'

/**
 * RichTextEditor 示例页面
 *
 * v1.12.x 富文本编辑器使用示例
 */

import React, { useState } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

export default function RichTextEditorExample() {
  const [content, setContent] = useState('')
  const [markdown, setMarkdown] = useState('')

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">
          富文本编辑器示例
        </h1>

        {/* 基础示例 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            基础示例
          </h2>
          <RichTextEditor
            value={content}
            onChange={(value, html) => {
              setContent(value)
              setMarkdown(value)
            }}
            placeholder="开始输入内容..."
            minHeight={200}
          />
        </section>

        {/* Markdown 输出 */}
        {markdown && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Markdown 输出
            </h2>
            <pre className="overflow-auto rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800">
              <code>{markdown}</code>
            </pre>
          </section>
        )}

        {/* 只读模式 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            只读模式
          </h2>
          <RichTextEditor
            value="# 只读内容\n\n这是**粗体**文本，这是*斜体*文本。\n\n- 列表项 1\n- 列表项 2"
            readOnly
            minHeight={150}
          />
        </section>

        {/* 自定义高度 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            自定义高度
          </h2>
          <RichTextEditor
            placeholder="最小高度 300px，最大高度 500px"
            minHeight={300}
            maxHeight={500}
          />
        </section>

        {/* 底部工具栏 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            底部工具栏
          </h2>
          <RichTextEditor
            placeholder="工具栏在底部"
            toolbarPosition="bottom"
            minHeight={150}
          />
        </section>

        {/* 带错误提示 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            带错误提示
          </h2>
          <RichTextEditor
            placeholder="输入内容..."
            error="内容不能为空"
            helperText="请输入至少 10 个字符"
            minHeight={150}
          />
        </section>

        {/* 功能说明 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            功能说明
          </h2>
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">
              支持的功能
            </h3>
            <ul className="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
              <li>富文本编辑：粗体、斜体、下划线、删除线</li>
              <li>标题：H1、H2、H3</li>
              <li>列表：有序列表、无序列表</li>
              <li>链接：插入超链接</li>
              <li>撤销/重做：支持历史记录</li>
              <li>Markdown 支持：自动转换 Markdown 语法</li>
              <li>深色模式：自动适配主题</li>
              <li>移动端适配：响应式设计</li>
              <li>快捷键：Ctrl+B、Ctrl+I、Ctrl+U、Ctrl+K、Ctrl+Z、Ctrl+Y</li>
            </ul>

            <h3 className="mb-3 mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">
              快捷键
            </h3>
            <ul className="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
              <li><kbd className="rounded border px-1">Ctrl+B</kbd> - 粗体</li>
              <li><kbd className="rounded border px-1">Ctrl+I</kbd> - 斜体</li>
              <li><kbd className="rounded border px-1">Ctrl+U</kbd> - 下划线</li>
              <li><kbd className="rounded border px-1">Ctrl+K</kbd> - 插入链接</li>
              <li><kbd className="rounded border px-1">Ctrl+Z</kbd> - 撤销</li>
              <li><kbd className="rounded border px-1">Ctrl+Y</kbd> - 重做</li>
              <li><kbd className="rounded border px-1">Tab</kbd> - 插入空格</li>
            </ul>

            <h3 className="mb-3 mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">
              Markdown 语法
            </h3>
            <ul className="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700"># 标题</code> - H1</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">## 标题</code> - H2</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">### 标题</code> - H3</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">**粗体**</code> - 粗体</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">*斜体*</code> - 斜体</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">~~删除线~~</code> - 删除线</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">[链接](url)</code> - 链接</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">`代码`</code> - 行内代码</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">- 列表项</code> - 无序列表</li>
              <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">1. 列表项</code> - 有序列表</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}