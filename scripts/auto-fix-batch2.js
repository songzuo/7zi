#!/usr/bin/env node

/**
 * 第二批自动修复
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 第二批自动修复...\n');

const fixes = [
  // API 路由文件
  {
    file: 'src/app/api/auth/register/route.ts',
    replacements: [
      { old: 'const sanitizedUrl = ', new: 'const _sanitizedUrl = ' },
    ]
  },
  {
    file: 'src/app/api/auth/me/route.ts',
    replacements: [
      { old: 'const password = ', new: 'const _password = ' },
    ]
  },
  {
    file: 'src/app/api/multimodal/audio/route.ts',
    replacements: [
      { old: 'import { audioToBuffer }', new: 'import { audioToBuffer as _audioToBuffer }' },
    ]
  },
  {
    file: 'src/app/api/multimodal/image/route.ts',
    replacements: [
      { old: 'const ImageProcessingOptions = ', new: 'const _ImageProcessingOptions = ' },
    ]
  },
  {
    file: 'src/app/api/performance/alerts/route.ts',
    replacements: [
      { old: 'const generateAlertId = ', new: 'const _generateAlertId = ' },
    ]
  },
  {
    file: 'src/app/api/performance/clear/route.ts',
    replacements: [
      { old: 'const createErrorResponse = ', new: 'const _createErrorResponse = ' },
    ]
  },
  {
    file: 'src/app/api/projects/route.ts',
    replacements: [
      { old: 'export async function GET(request', new: 'export async function GET(_request' },
      { old: 'export async function POST(request', new: 'export async function POST(_request' },
    ]
  },
  {
    file: 'src/app/api/ratings/[id]/helpful/route.ts',
    replacements: [
      { old: 'const logger = ', new: 'const _logger = ' },
    ]
  },
  {
    file: 'src/app/api/ratings/route.ts',
    replacements: [
      { old: 'const images = ', new: 'const _images = ' },
    ]
  },
  {
    file: 'src/app/api/rbac/roles/[roleId]/route.ts',
    replacements: [
      { old: 'const removePermissionsFromRole = ', new: 'const _removePermissionsFromRole = ' },
      { old: 'const getRoleDefinition = ', new: 'const _getRoleDefinition = ' },
    ]
  },
  {
    file: 'src/app/api/rbac/roles/route.ts',
    replacements: [
      { old: 'const updateRole = ', new: 'const _updateRole = ' },
      { old: 'const deleteRole = ', new: 'const _deleteRole = ' },
      { old: 'const assignPermissionsToRole = ', new: 'const _assignPermissionsToRole = ' },
      { old: 'const getPermissionsByRole = ', new: 'const _getPermissionsByRole = ' },
      { old: 'const getRoleDefinition = ', new: 'const _getRoleDefinition = ' },
    ]
  },
  {
    file: 'src/app/api/rbac/users/[userId]/permissions/route.ts',
    replacements: [
      { old: 'const hasPermission = ', new: 'const _hasPermission = ' },
      { old: 'const hasRole = ', new: 'const _hasRole = ' },
    ]
  },
  {
    file: 'src/app/api/rbac/users/[userId]/roles/route.ts',
    replacements: [
      { old: 'const getAllRolesWithCount = ', new: 'const _getAllRolesWithCount = ' },
    ]
  },
  {
    file: 'src/app/api/search/autocomplete/route.ts',
    replacements: [
      { old: 'const AutocompleteSuggestion = ', new: 'const _AutocompleteSuggestion = ' },
    ]
  },
  {
    file: 'src/app/api/search/route.ts',
    replacements: [
      { old: 'const PaginatedSearchResult = ', new: 'const _PaginatedSearchResult = ' },
      { old: 'const UnifiedEntity = ', new: 'const _UnifiedEntity = ' },
    ]
  },
  {
    file: 'src/app/api/stream/analytics/route.ts',
    replacements: [
      { old: 'const createUnauthorizedError = ', new: 'const _createUnauthorizedError = ' },
      { old: 'const client = ', new: 'const _client = ' },
    ]
  },
  {
    file: 'src/app/api/stream/health/route.ts',
    replacements: [
      { old: 'const logApiSuccess = ', new: 'const _logApiSuccess = ' },
      { old: 'const client = ', new: 'const _client = ' },
    ]
  },
  {
    file: 'src/app/api/tasks/route.ts',
    replacements: [
      { old: 'const RATE_LIMIT_CONFIG = ', new: 'const _RATE_LIMIT_CONFIG = ' },
      { old: 'const createAppError = ', new: 'const _createAppError = ' },
      { old: 'const validateUpdateTaskRequest = ', new: 'const _validateUpdateTaskRequest = ' },
      { old: 'const sortFieldMap = ', new: 'const _sortFieldMap = ' },
      { old: 'req, userId', new: '_req, _userId' },
    ]
  },
  {
    file: 'src/app/api/workflow/[id]/route.ts',
    replacements: [
      { old: 'const WorkflowEngine = ', new: 'const _WorkflowEngine = ' },
      { old: 'const id = ', new: 'const _id = ' },
    ]
  },
  // 页面文件
  {
    file: 'src/app/demo/websocket/page.tsx',
    replacements: [
      { old: 'const selectedTaskId = ', new: 'const _selectedTaskId = ' },
      { old: 'const mockUpdate = ', new: 'const _mockUpdate = ' },
    ]
  },
  {
    file: 'src/app/manifest.ts',
    replacements: [
      { old: 'const baseUrl = ', new: 'const _baseUrl = ' },
    ]
  },
  {
    file: 'src/app/undo-redo-example/page.tsx',
    replacements: [
      { old: 'const undo = ', new: 'const _undo = ' },
      { old: 'const redo = ', new: 'const _redo = ' },
      { old: 'const canUndo = ', new: 'const _canUndo = ' },
    ]
  },
];

let fixedFiles = 0;

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  跳过 ${file} (不存在)`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ old, new: newVal }) => {
      if (content.includes(old)) {
        content = content.replace(old, newVal);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedFiles++;
      console.log(`✅ ${file}`);
    }
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`);
  }
});

console.log(`\n完成! 修复了 ${fixedFiles} 个文件`);
