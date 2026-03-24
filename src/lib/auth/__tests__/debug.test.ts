/**
 * Debug test to check database mock behavior
 */

import { describe, it, expect } from 'vitest';
import { createUser, getUserById, getUserByEmail } from '../repository';
import { getDbTables, getTableData } from '@/test/vi-mocks';

describe('Database Mock Debug', () => {
  it('should create and find user', async () => {
    // Check initial state
    if (process.env.NODE_ENV !== 'production') {
      console.log('Initial tables:', Array.from(getDbTables().keys()));
    }

    const user = await createUser({
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Created user:', user);
    }

    // Check tables after creation
    const tables = getDbTables();
    if (process.env.NODE_ENV !== 'production') {
      console.log('Tables after creation:', Array.from(tables.keys()));
      console.log('Users table data:', getTableData('users'));
    }

    // Try to find user
    const foundById = await getUserById(user.id);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Found by ID:', foundById);
    }

    const foundByEmail = await getUserByEmail('test@example.com');
    if (process.env.NODE_ENV !== 'production') {
      console.log('Found by email:', foundByEmail);
    }

    expect(foundById).toBeTruthy();
    expect(foundByEmail).toBeTruthy();
  });
});
