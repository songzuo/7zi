/**
 * Conflict Resolver Module
 * Implements field-level conflict detection and resolution strategies
 */

import { DataEntry } from './storage';

// Conflict detection result
export interface ConflictDetection {
  hasConflict: boolean;
  conflicts: FieldConflict[];
  localVersion: number;
  serverVersion: number;
}

export interface FieldConflict {
  field: string;
  localValue: any;
  serverValue: any;
  localTimestamp: number;
  serverTimestamp: number;
}

// Resolution strategies
export type ResolutionStrategy = 'lww' | 'field-merge' | 'manual' | 'local-wins' | 'server-wins';

// Conflict resolution result
export interface ResolutionResult {
  resolved: boolean;
  data: any;
  strategy: ResolutionStrategy;
  conflicts: FieldConflict[];
  manualFields?: string[]; // Fields that need manual resolution
}

// Manual resolution request
export interface ManualResolutionRequest {
  entryId: string;
  field: string;
  localValue: any;
  serverValue: any;
  chosenValue: 'local' | 'server' | 'custom';
  customValue?: any;
}

// Conflict metadata
export interface ConflictMeta {
  entryId: string;
  collection: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
  detectedAt: number;
  resolved: boolean;
  resolution?: ResolutionResult;
}

/**
 * Conflict Resolver
 * Handles conflict detection and resolution for offline data sync
 */
export class ConflictResolver {
  private manualResolutions: Map<string, ManualResolutionRequest[]> = new Map();
  private conflictHistory: ConflictMeta[] = [];

  /**
   * Detect conflicts between local and server data
   */
  detectConflicts(localEntry: DataEntry, serverData: any): ConflictDetection {
    const conflicts: FieldConflict[] = [];
    
    // Check if versions exist
    if (!localEntry.serverVersion && serverData._version) {
      // First sync - no conflict
      return {
        hasConflict: false,
        conflicts: [],
        localVersion: localEntry.localVersion,
        serverVersion: serverData._version,
      };
    }

    // Compare versions
    const serverVersion = serverData._version || 0;
    if (localEntry.serverVersion === serverVersion) {
      // Same version - no conflict
      return {
        hasConflict: false,
        conflicts: [],
        localVersion: localEntry.localVersion,
        serverVersion,
      };
    }

    // Version mismatch - check field-level conflicts
    const localData = localEntry.data;
    const serverFields = this.extractFields(serverData);
    
    for (const [field, serverValue] of Object.entries(serverFields)) {
      const localValue = localData[field];
      
      // Skip metadata fields
      if (field.startsWith('_')) continue;
      
      // Check if values differ
      if (this.valuesDiffer(localValue, serverValue)) {
        conflicts.push({
          field,
          localValue,
          serverValue,
          localTimestamp: localEntry.updatedAt,
          serverTimestamp: serverData._updatedAt || Date.now(),
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      localVersion: localEntry.localVersion,
      serverVersion,
    };
  }

  /**
   * Extract meaningful fields from data (excluding metadata)
   */
  private extractFields(data: any): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('_')) {
        fields[key] = value;
      }
    }
    return fields;
  }

  /**
   * Check if two values differ
   */
  private valuesDiffer(a: any, b: any): boolean {
    if (a === b) return false;
    if (a === null || b === null) return a !== b;
    if (typeof a !== typeof b) return true;
    if (typeof a === 'object') {
      return JSON.stringify(a) !== JSON.stringify(b);
    }
    return true;
  }

  /**
   * Resolve conflicts based on strategy
   */
  resolveConflict(
    localEntry: DataEntry,
    serverData: any,
    strategy: ResolutionStrategy,
    manualResolutions?: ManualResolutionRequest[]
  ): ResolutionResult {
    const detection = this.detectConflicts(localEntry, serverData);

    if (!detection.hasConflict) {
      // No conflict - use server data
      return {
        resolved: true,
        data: serverData,
        strategy,
        conflicts: [],
      };
    }

    switch (strategy) {
      case 'lww':
        return this.resolveLWW(localEntry, serverData, detection);
      case 'field-merge':
        return this.resolveFieldMerge(localEntry, serverData, detection);
      case 'manual':
        return this.resolveManual(localEntry, serverData, detection, manualResolutions || []);
      case 'local-wins':
        return this.resolveLocalWins(localEntry, serverData, detection);
      case 'server-wins':
        return this.resolveServerWins(localEntry, serverData, detection);
      default:
        return this.resolveLWW(localEntry, serverData, detection);
    }
  }

  /**
   * Last-Write-Wins (LWW) strategy
   * Uses timestamp to determine which value wins
   */
  private resolveLWW(
    localEntry: DataEntry,
    serverData: any,
    detection: ConflictDetection
  ): ResolutionResult {
    const localTimestamp = localEntry.updatedAt;
    const serverTimestamp = serverData._updatedAt || Date.now();

    // Determine which is newer
    const useServer = serverTimestamp > localTimestamp;

    return {
      resolved: true,
      data: useServer ? serverData : localEntry.data,
      strategy: 'lww',
      conflicts: detection.conflicts,
    };
  }

  /**
   * Field-Merge strategy
   * For each field, use the value with the most recent timestamp
   */
  private resolveFieldMerge(
    localEntry: DataEntry,
    serverData: any,
    detection: ConflictDetection
  ): ResolutionResult {
    const merged = { ...localEntry.data, ...serverData };

    for (const conflict of detection.conflicts) {
      // Use timestamp to determine winner per field
      if (conflict.serverTimestamp > conflict.localTimestamp) {
        merged[conflict.field] = conflict.serverValue;
      } else {
        merged[conflict.field] = conflict.localValue;
      }
    }

    return {
      resolved: true,
      data: merged,
      strategy: 'field-merge',
      conflicts: detection.conflicts,
    };
  }

  /**
   * Manual resolution strategy
   * Requires user to choose values for each conflict
   */
  private resolveManual(
    localEntry: DataEntry,
    serverData: any,
    detection: ConflictDetection,
    manualResolutions: ManualResolutionRequest[]
  ): ResolutionResult {
    const resolvedFields: string[] = [];
    const manualFields: string[] = [];
    const merged = { ...serverData };

    // Apply manual resolutions
    for (const resolution of manualResolutions) {
      if (resolution.entryId === localEntry.id) {
        switch (resolution.chosenValue) {
          case 'local':
            merged[resolution.field] = resolution.localValue;
            break;
          case 'server':
            merged[resolution.field] = resolution.serverValue;
            break;
          case 'custom':
            merged[resolution.field] = resolution.customValue;
            break;
        }
        resolvedFields.push(resolution.field);
      }
    }

    // Check for remaining unresolved fields
    for (const conflict of detection.conflicts) {
      if (!resolvedFields.includes(conflict.field)) {
        manualFields.push(conflict.field);
      }
    }

    return {
      resolved: manualFields.length === 0,
      data: merged,
      strategy: 'manual',
      conflicts: detection.conflicts,
      manualFields,
    };
  }

  /**
   * Local wins strategy
   * Always prefer local data over server
   */
  private resolveLocalWins(
    localEntry: DataEntry,
    serverData: any,
    detection: ConflictDetection
  ): ResolutionResult {
    return {
      resolved: true,
      data: localEntry.data,
      strategy: 'local-wins',
      conflicts: detection.conflicts,
    };
  }

  /**
   * Server wins strategy
   * Always prefer server data over local
   */
  private resolveServerWins(
    localEntry: DataEntry,
    serverData: any,
    detection: ConflictDetection
  ): ResolutionResult {
    return {
      resolved: true,
      data: serverData,
      strategy: 'server-wins',
      conflicts: detection.conflicts,
    };
  }

  /**
   * Store manual resolution
   */
  storeManualResolution(resolution: ManualResolutionRequest): void {
    const existing = this.manualResolutions.get(resolution.entryId) || [];
    existing.push(resolution);
    this.manualResolutions.set(resolution.entryId, existing);
  }

  /**
   * Get pending manual resolutions for an entry
   */
  getManualResolutions(entryId: string): ManualResolutionRequest[] {
    return this.manualResolutions.get(entryId) || [];
  }

  /**
   * Clear manual resolutions for an entry
   */
  clearManualResolutions(entryId: string): void {
    this.manualResolutions.delete(entryId);
  }

  /**
   * Record conflict in history
   */
  recordConflict(meta: ConflictMeta): void {
    this.conflictHistory.push(meta);
    
    // Keep only last 100 conflicts
    if (this.conflictHistory.length > 100) {
      this.conflictHistory = this.conflictHistory.slice(-100);
    }
  }

  /**
   * Get conflict history
   */
  getConflictHistory(collection?: string): ConflictMeta[] {
    if (collection) {
      return this.conflictHistory.filter(c => c.collection === collection);
    }
    return this.conflictHistory;
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): ConflictMeta[] {
    return this.conflictHistory.filter(c => !c.resolved);
  }

  /**
   * Mark conflict as resolved
   */
  markResolved(entryId: string, resolution: ResolutionResult): void {
    const conflict = this.conflictHistory.find(c => c.entryId === entryId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution;
    }
  }

  /**
   * Get default strategy based on data type
   */
  getDefaultStrategy(collection: string): ResolutionStrategy {
    // Map collection names to strategies
    const strategyMap: Record<string, ResolutionStrategy> = {
      // User data - LWW
      'users': 'lww',
      'profiles': 'lww',
      
      // Documents - field merge
      'documents': 'field-merge',
      'notes': 'field-merge',
      
      // Lists/collections - local wins (user's view takes priority)
      'tasks': 'local-wins',
      'items': 'local-wins',
      'favorites': 'local-wins',
      
      // Settings - server wins (global config)
      'settings': 'server-wins',
      'preferences': 'server-wins',
      'config': 'server-wins',
    };

    return strategyMap[collection] || 'lww';
  }

  /**
   * Create conflict metadata
   */
  createConflictMeta(
    entryId: string,
    collection: string,
    localData: any,
    serverData: any,
    localTimestamp: number,
    serverTimestamp: number
  ): ConflictMeta {
    return {
      entryId,
      collection,
      localData,
      serverData,
      localTimestamp,
      serverTimestamp,
      detectedAt: Date.now(),
      resolved: false,
    };
  }
}

// Singleton instance
let conflictResolverInstance: ConflictResolver | null = null;

export function getConflictResolver(): ConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver();
  }
  return conflictResolverInstance;
}

export default ConflictResolver;
