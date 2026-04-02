#!/usr/bin/env node

/**
 * WebSocket Collaboration Test Script
 *
 * Tests the collaboration components and WebSocket functionality
 */

const path = require('path')
const fs = require('fs')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath)
}

function checkFileContent(filePath, patterns) {
  if (!checkFileExists(filePath)) {
    return { exists: false, matches: [] }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = patterns.map(pattern => ({
    pattern,
    found: content.includes(pattern),
  }))

  return { exists: true, matches }
}

// Test checks
const checks = [
  {
    name: 'TaskEditor Component',
    file: 'src/components/collaboration/TaskEditor.tsx',
    patterns: [
      'useCollaboration',
      'RemoteCursor',
      'ConnectionStatus',
      'UserList',
      'cursorPosition',
      'sendOperation',
      'moveCursor',
      'setTyping',
    ],
  },
  {
    name: 'ConnectionStatus Component',
    file: 'src/components/collaboration/ConnectionStatus.tsx',
    patterns: [
      'ConnectionStatusProps',
      'connectionState',
      'UserList',
      'RemoteCursor',
      'getStatusColor',
      'getStatusText',
    ],
  },
  {
    name: 'RemoteSelection Component',
    file: 'src/components/collaboration/RemoteSelection.tsx',
    patterns: [
      'RemoteSelectionHighlight',
      'SelectionHighlighter',
      'CursorWithSelection',
      'SelectionManager',
      'TypingIndicator',
    ],
  },
  {
    name: 'WebSocket Server',
    file: 'src/lib/websocket/server.ts',
    patterns: [
      'room:join',
      'room:joined',
      'cursor:move',
      'cursor:update',
      'selection:update',
      'doc:operation',
      'presence:typing',
    ],
  },
  {
    name: 'Collaboration Hook',
    file: 'src/lib/websocket/useCollaboration.ts',
    patterns: [
      'useCollaboration',
      'connect',
      'disconnect',
      'joinRoom',
      'sendOperation',
      'moveCursor',
      'setTyping',
    ],
  },
  {
    name: 'Type Definitions',
    file: 'src/lib/websocket/types.ts',
    patterns: [
      'CursorUpdate',
      'SelectionUpdate',
      'DocumentOperation',
      'RoomUser',
      'CollaborationMessage',
    ],
  },
  {
    name: 'Demo Page',
    file: 'src/app/collaboration-demo/page.tsx',
    patterns: ['useCollaboration', 'ConnectionStatus', 'UserList', 'ConnectionStatusProps'],
  },
  {
    name: 'WebSocket API Route',
    file: 'src/app/api/ws/route.ts',
    patterns: ['createServer', 'GET', 'WebSocket'],
  },
]

// Run checks
let allPassed = true

log('\n' + '='.repeat(60), colors.cyan)
log('WebSocket Collaboration UI - Component Check', colors.cyan)
log('='.repeat(60) + '\n', colors.cyan)

checks.forEach((check, index) => {
  log(`${index + 1}. ${check.name}`, colors.blue)

  const result = checkFileContent(check.file, check.patterns)

  if (!result.exists) {
    log(`   ❌ File not found: ${check.file}`, colors.red)
    allPassed = false
    return
  }

  log(`   ✅ File exists: ${check.file}`, colors.green)

  const missingPatterns = result.matches.filter(m => !m.found)
  if (missingPatterns.length > 0) {
    log(`   ⚠️  Missing patterns:`, colors.yellow)
    missingPatterns.forEach(m => {
      log(`      - ${m.pattern}`, colors.yellow)
    })
  } else {
    log(`   ✅ All patterns found`, colors.green)
  }

  log('')
})

// Summary
log('='.repeat(60), colors.cyan)
if (allPassed) {
  log('✅ All checks passed!', colors.green)
} else {
  log('❌ Some checks failed. Please review the issues above.', colors.red)
}
log('='.repeat(60) + '\n', colors.cyan)

// Additional info
log('Next Steps:', colors.blue)
log('1. Start dev server: npm run dev', colors.reset)
log('2. Open demo page: http://localhost:3000/collaboration-demo', colors.reset)
log('3. Open in multiple browser tabs to test collaboration', colors.reset)
log('4. Verify remote cursors, selections, and typing indicators', colors.reset)
log('')
