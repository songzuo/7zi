'use client';

import { useState } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Supported tables for export/import
 */
const SUPPORTED_TABLES = [
  { id: 'agents', name: 'Agents', description: 'AI agents configuration' },
  { id: 'agent_tokens', name: 'Agent Tokens', description: 'Authentication tokens' },
  { id: 'agent_data_access', name: 'Data Access', description: 'Agent data access logs' },
  { id: 'user_preferences', name: 'User Preferences', description: 'User settings' },
  { id: 'audit_logs', name: 'Audit Logs', description: 'System audit logs' },
] as const;

/**
 * Export formats
 */
const EXPORT_FORMATS = [
  { id: 'json', name: 'JSON', icon: FileJson, description: 'Structured data format' },
  { id: 'csv', name: 'CSV', icon: FileSpreadsheet, description: 'Spreadsheet compatible' },
] as const;

/**
 * Import modes
 */
const IMPORT_MODES = [
  { id: 'insert', name: 'Insert', description: 'Add new records only' },
  { id: 'update', name: 'Update', description: 'Update existing records' },
  { id: 'upsert', name: 'Upsert', description: 'Insert or update' },
  { id: 'replace', name: 'Replace', description: 'Clear and replace all' },
] as const;

/**
 * Import result interface
 */
interface ImportResult {
  success: boolean;
  message?: string;
  dryRun?: boolean;
  mode: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  totalRows?: number;
  backup?: string;
  stats: {
    tables: Record<string, {
      inserted: number;
      updated: number;
      skipped: number;
      errors: number;
    }>;
  };
  tables: Record<string, {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  }>;
  warnings?: string[];
}

export function DataExportImport() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json');
  const [includeSchema, setIncludeSchema] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Import state
  const [importMode, setImportMode] = useState<'insert' | 'update' | 'upsert' | 'replace'>('upsert');
  const [dryRun, setDryRun] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      setExportError('Please select at least one table to export');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const response = await fetch('/api/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: selectedFormat,
          tables: selectedTables,
          includeSchema,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `export.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData) {
      setImportError('Please provide import data');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const response = await fetch('/api/data/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: importFile?.name.endsWith('.csv') ? 'csv' : 'json',
          mode: importMode,
          dryRun,
          skipDuplicates,
          batchSize: 100,
          createBackup,
          data: importData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId],
    );
  };

  const selectAll = () => {
    setSelectedTables(SUPPORTED_TABLES.map(t => t.id));
  };

  const selectNone = () => {
    setSelectedTables([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Export & Import</h2>
            <p className="text-sm text-gray-600">Manage database data export and import operations</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('export')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'export'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900',
          )}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'import'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900',
          )}
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Export Success Message */}
          {exportSuccess && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Data exported successfully!</span>
            </div>
          )}

          {/* Export Error */}
          {exportError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{exportError}</span>
            </div>
          )}

          {/* Table Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Select Tables</label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                >
                  Select All
                </button>
                <button
                  onClick={selectNone}
                  className="text-xs px-2 py-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded"
                >
                  Select None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUPPORTED_TABLES.map(table => (
                <label
                  key={table.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table.id)}
                    onChange={() => toggleTable(table.id)}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{table.name}</div>
                    <div className="text-xs text-gray-500">{table.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_FORMATS.map(format => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id as typeof EXPORT_FORMATS[number]['id'])}
                    className={cn(
                      'flex items-center gap-3 p-4 border-2 rounded-lg transition-all',
                      selectedFormat === format.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <Icon className={cn(
                      'h-6 w-6',
                      selectedFormat === format.id ? 'text-blue-600' : 'text-gray-400',
                    )} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{format.name}</div>
                      <div className="text-xs text-gray-500">{format.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="includeSchema"
              checked={includeSchema}
              onChange={(e) => setIncludeSchema(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="includeSchema" className="text-sm text-gray-700">
              Include table schema in export
            </label>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting || selectedTables.length === 0}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-medium transition-colors',
              isExporting || selectedTables.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export Data ({selectedTables.length} tables)
              </>
            )}
          </button>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Import Result */}
          {importResult && (
            <div className={cn(
              'p-4 rounded-lg border',
              importResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200',
            )}>
              <div className="flex items-center gap-2 mb-3">
                {importResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">
                  {importResult.message}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Total Rows:</span>{' '}
                    <span className="font-medium">{importResult.totalRows ?? 0}</span>
                  </div>
                  {importResult.backup && (
                    <div>
                      <span className="text-gray-600">Backup:</span>{' '}
                      <span className="font-medium">{importResult.backup}</span>
                    </div>
                  )}
                </div>
                {Object.entries(importResult.stats.tables || {}).map(([table, stats]: [string, { inserted: number; updated: number; skipped: number; errors: number }]) => (
                  <div key={table} className="pl-4 border-l-2 border-gray-200">
                    <div className="font-medium">{table}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                      <span>Inserted: {stats.inserted}</span>
                      <span>Updated: {stats.updated}</span>
                      <span>Skipped: {stats.skipped}</span>
                      <span>Errors: {stats.errors}</span>
                    </div>
                  </div>
                ))}
                {importResult.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <div className="font-medium text-red-800">Errors:</div>
                    <ul className="list-disc list-inside text-xs text-red-700 mt-1">
                      {importResult.errors.slice(0, 5).map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Error */}
          {importError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{importError}</span>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Import File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="importFile"
              />
              <label
                htmlFor="importFile"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {importFile ? importFile.name : 'Click to upload JSON or CSV file'}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  Supports .json and .csv files
                </span>
              </label>
            </div>
          </div>

          {/* Import Mode */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Import Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {IMPORT_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setImportMode(mode.id as typeof IMPORT_MODES[number]['id'])}
                  className={cn(
                    'p-3 border-2 rounded-lg transition-all text-left',
                    importMode === mode.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="font-medium text-gray-900">{mode.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Import Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Dry run (preview without importing)</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Skip duplicate records</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={createBackup}
                  onChange={(e) => setCreateBackup(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Create backup before import</span>
              </label>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={isImporting || !importData}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-medium transition-colors',
              isImporting || !importData
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Import Data
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
