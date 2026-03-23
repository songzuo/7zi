import { getDatabase } from './src/lib/db/index.ts';
import { initializeProjectTable } from './src/app/api/projects/database.ts';
import { validateCreateProjectRequest } from './src/app/api/projects/validation';
import { createProject } from './src/app/api/projects/database';

// Initialize
initializeProjectTable();
const db = getDatabase();

// Clear
try {
  db.exec('DELETE FROM projects');
  console.log('Cleared projects table');
} catch (e) {
  console.log('Clear error:', e);
}

// Test createProject
try {
  console.log('\n=== Testing createProject ===');
  const result = createProject({
    name: 'New Project',
    description: 'A new test project',
    status: 'active',
    priority: 'high',
    progress: 0,
  }, 'test-user-id');
  console.log('Success:', result);
} catch (error) {
  console.log('Error:', error);
  console.log('Error name:', error instanceof Error ? error.name : typeof error);
  console.log('Error message:', error instanceof Error ? error.message : String(error));
  console.log('Has code?', error instanceof Error && 'code' in error);
  if (error instanceof Error && 'code' in error) {
    console.log('Code:', (error as any).code);
  }
  console.log('Has statusCode?', error instanceof Error && 'statusCode' in error);
  if (error instanceof Error && 'statusCode' in error) {
    console.log('StatusCode:', (error as any).statusCode);
  }
}
