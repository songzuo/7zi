/**
 * RichTextEditor Demo Page
 *
 * v1.12.2 - 富文本编辑器演示页面
 */

'use client'

import React, { useState } from 'react'
import { RichTextEditor, RichTextEditorSimple, RichTextEditorReadOnly } from '@/components/editor'

export default function RichTextEditorDemoPage() {
  const [content, setContent] = useState('<p>欢迎使用富文本编辑器！</p><p>这是一个基于 TipTap 的功能完整的编辑器。</p>')
  const [htmlOutput, setHtmlOutput] = useState(content)

  const handleChange = (html: string) => {
    setContent(html)
    setHtmlOutput(html)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          富文本编辑器演示
        </h1>

        {/* 基础编辑器 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            基础编辑器
          </h2>
          <RichTextEditor
            label="内容"
            required
            placeholder="输入富文本内容..."
            content={content}
            onChange={handleChange}
            minHeight={200}
            maxHeight={400}
            helperText="支持粗体、斜体、下划线、标题、列表、链接等格式"
          />
        </section>

        {/* HTML 输出 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            HTML 输出
          </h2>
          <pre className="overflow-auto rounded-lg border border-gray-300 bg-gray-100 p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            {htmlOutput}
          </pre>
        </section>

        {/* 简洁版编辑器 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            简洁版编辑器（无工具栏）
          </h2>
          <RichTextEditorSimple
            content="<p>这是一个没有工具栏的简洁版编辑器。</p>"
            onChange={html => console.log('Content changed:', html)}
            minHeight={100}
          />
        </section>

        {/* 只读版编辑器 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            只读版编辑器
          </h2>
          <RichTextEditorReadOnly
            content="<h1>标题</h1><p>这是一个<strong>只读</strong>的编辑器，用于预览已保存的内容。</p><ul><li>列表项 1</li><li>列表项 2</li></ul>"
          />
        </section>

        {/* 邮件编辑器预设 */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            邮件编辑器预设
          </h2>
          <RichTextEditor
            label="邮件内容"
            placeholder="输入邮件内容..."
            preset="email"
            minHeight={300}
            onChange={html => console.log('Email content:', html)}
          />
        </section>
      </div>
    </div>
  )
}