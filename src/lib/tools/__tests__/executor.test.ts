/**
 * Tests for Tool Executor
 *
 * Tests file operations, command execution, and security validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { FileTools, CommandTools, PathSecurity, ToolExecutor } from '../executor'

describe('PathSecurity', () => {
  describe('validatePath', () => {
    it('should reject paths with parent directory traversal', () => {
      const result = PathSecurity.validatePath('/safe/path/../../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('blocked pattern')
    })

    it('should reject paths with home directory expansion', () => {
      const result = PathSecurity.validatePath('~/.ssh/id_rsa')
      expect(result.valid).toBe(false)
    })

    it('should reject paths to sensitive files', () => {
      const result = PathSecurity.validatePath('/etc/passwd')
      expect(result.valid).toBe(false)
    })

    it('should allow paths within current working directory', () => {
      const result = PathSecurity.validatePath(process.cwd() + '/test.txt')
      expect(result.valid).toBe(true)
    })

    it('should allow paths in /tmp directory', () => {
      const result = PathSecurity.validatePath('/tmp/test-file.txt')
      expect(result.valid).toBe(true)
    })

    it('should reject paths outside allowed directories', () => {
      const result = PathSecurity.validatePath('/some/other/path/test.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('outside allowed directories')
    })
  })
})

describe('FileTools', () => {
  let testDir: string
  let testFilePath: string

  beforeEach(async () => {
    // Create a temporary directory for tests
    testDir = path.join(os.tmpdir(), `file-tools-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
    testFilePath = path.join(testDir, 'test.txt')
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const content = 'Hello, World!\nLine 2\nLine 3'
      await fs.writeFile(testFilePath, content, 'utf-8')

      const result = await FileTools.readFile(testFilePath)

      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe(content)
    })

    it('should return error for non-existent file', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.txt')
      const result = await FileTools.readFile(nonExistentPath)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('File not found')
    })

    it('should respect offset parameter', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4'
      await fs.writeFile(testFilePath, content, 'utf-8')

      const result = await FileTools.readFile(testFilePath, { offset: 2, limit: 2 })

      expect(result.content[0].text).toBe('Line 2\nLine 3')
    })

    it('should respect limit parameter', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4'
      await fs.writeFile(testFilePath, content, 'utf-8')

      const result = await FileTools.readFile(testFilePath, { limit: 2 })

      expect(result.content[0].text).toBe('Line 1\nLine 2')
    })

    it('should reject insecure paths', async () => {
      const result = await FileTools.readFile('/etc/passwd')

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Security error')
    })
  })

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      const content = 'Test content'
      const result = await FileTools.writeFile(testFilePath, content)

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toContain('Successfully wrote')

      // Verify file was written
      const fileContent = await fs.readFile(testFilePath, 'utf-8')
      expect(fileContent).toBe(content)
    })

    it("should create parent directories if they don't exist", async () => {
      const nestedPath = path.join(testDir, 'subdir', 'nested', 'file.txt')
      const content = 'Nested content'

      const result = await FileTools.writeFile(nestedPath, content)

      expect(result.isError).toBeUndefined()

      // Verify file exists
      const fileContent = await fs.readFile(nestedPath, 'utf-8')
      expect(fileContent).toBe(content)
    })

    it('should reject insecure paths', async () => {
      const result = await FileTools.writeFile('/etc/passwd', 'malicious')

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Security error')
    })
  })

  describe('listFiles', () => {
    beforeEach(async () => {
      // Create some test files
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1')
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2')
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true })
    })

    it('should list files and directories', async () => {
      const result = await FileTools.listFiles(testDir)

      expect(result.isError).toBeUndefined()
      const fileList = JSON.parse(result.content[0].text || '{}') as Array<{
        name: string
        type: string
      }>

      expect(fileList).toHaveLength(3)
      expect(fileList.some(f => f.name === 'file1.txt' && f.type === 'file')).toBe(true)
      expect(fileList.some(f => f.name === 'subdir' && f.type === 'directory')).toBe(true)
    })

    it('should reject insecure paths', async () => {
      const result = await FileTools.listFiles('/root/.ssh')

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Security error')
    })
  })
})

describe('CommandTools', () => {
  describe('validateCommand', () => {
    it('should allow safe commands', () => {
      const result = CommandTools.validateCommand('ls -la')
      expect(result.valid).toBe(true)
    })

    it('should block rm commands', () => {
      const result = CommandTools.validateCommand('rm -rf /important')
      expect(result.valid).toBe(false)
    })

    it('should block fork bomb', () => {
      const result = CommandTools.validateCommand(':(){ :|:& };:')
      expect(result.valid).toBe(false)
    })

    it('should block format commands', () => {
      const result = CommandTools.validateCommand('format c:')
      expect(result.valid).toBe(false)
    })

    it('should allow node commands', () => {
      const result = CommandTools.validateCommand('node -v')
      expect(result.valid).toBe(true)
    })
  })

  describe('executeCommand', () => {
    it('should execute echo command successfully', async () => {
      const result = await CommandTools.executeCommand("echo 'Hello, MCP!'")

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toContain('Hello, MCP!')
    })

    it('should execute pwd command', async () => {
      const result = await CommandTools.executeCommand('pwd')

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toContain(process.cwd())
    })

    it('should return error for blocked commands', async () => {
      const result = await CommandTools.executeCommand('rm -rf /test')

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Security error')
    })

    it('should handle command errors gracefully', async () => {
      const result = await CommandTools.executeCommand('nonexistent-command-12345')

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Command execution error')
    })

    it('should respect workdir parameter', async () => {
      const result = await CommandTools.executeCommand('pwd', { workdir: '/tmp' })

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toContain('/tmp')
    })
  })
})

describe('ToolExecutor', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `tool-executor-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('execute', () => {
    it('should route to read_file tool', async () => {
      const testFile = path.join(testDir, 'test.txt')
      await fs.writeFile(testFile, 'test content', 'utf-8')

      const result = await ToolExecutor.execute('read_file', {
        path: testFile,
      })

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('test content')
    })

    it('should route to write_file tool', async () => {
      const testFile = path.join(testDir, 'new.txt')

      const result = await ToolExecutor.execute('write_file', {
        path: testFile,
        content: 'new content',
      })

      expect(result.isError).toBeUndefined()

      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).toBe('new content')
    })

    it('should route to list_files tool', async () => {
      await fs.writeFile(path.join(testDir, 'file.txt'), 'content')

      const result = await ToolExecutor.execute('list_files', { path: testDir })

      expect(result.isError).toBeUndefined()
      const fileList = JSON.parse(result.content[0].text || '{}')
      expect(fileList.length).toBeGreaterThan(0)
    })

    it('should route to exec_command tool', async () => {
      const result = await ToolExecutor.execute('exec_command', {
        command: 'echo test',
      })

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toContain('test')
    })

    it('should return error for unknown tool', async () => {
      const result = await ToolExecutor.execute('unknown_tool', {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Unknown tool')
    })

    it('should handle web_search tool with integration message', async () => {
      const result = await ToolExecutor.execute('web_search', {
        query: 'test search',
      })

      expect(result.content[0].text).toContain('Integration Required')
    })

    it('should handle web_fetch tool with integration message', async () => {
      const result = await ToolExecutor.execute('web_fetch', {
        url: 'https://example.com',
      })

      expect(result.content[0].text).toContain('Integration Required')
    })

    it('should handle browser_control tool with integration message', async () => {
      const result = await ToolExecutor.execute('browser_control', {
        action: 'open',
      })

      expect(result.content[0].text).toContain('Integration Required')
    })
  })
})
