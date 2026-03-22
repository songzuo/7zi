# Data Import/Export Feature

Complete implementation of CSV/JSON data import and export functionality for the 7zi AI Team Management Platform.

## Features

### Export Capabilities

- **Multiple Formats**: Export data in JSON or CSV format
- **Selective Export**: Choose specific tables to export
- **Data Filtering**: Apply WHERE clauses and limits to filter exported data
- **Schema Export**: Include table schema information in exports
- **Batch Processing**: Efficient handling of large datasets

### Import Capabilities

- **Multiple Modes**:
  - `insert`: Add new records only (fail on duplicates)
  - `update`: Update existing records only (fail if not found)
  - `upsert`: Insert or update records based on primary key
  - `replace`: Clear table and insert all records

- **Safety Features**:
  - Automatic backup creation before import
  - Dry-run mode to preview changes
  - Duplicate detection and handling
  - Batch processing with configurable size

- **Error Handling**:
  - Detailed error reporting
  - Partial success support
  - Validation of data before import

## Supported Tables

- `agents` - AI agents configuration
- `agent_tokens` - Authentication tokens
- `agent_data_access` - Agent data access logs
- `user_preferences` - User settings and preferences
- `audit_logs` - System audit logs

## API Reference

### Export API

#### GET /api/data/export

Get export options and supported tables.

**Response:**
```json
{
  "success": true,
  "message": "Data export API",
  "supportedTables": ["agents", "agent_tokens", ...],
  "usage": { ... }
}
```

#### POST /api/data/export

Export data from database.

**Request Body:**
```json
{
  "format": "json" | "csv",
  "tables": ["agents", "user_preferences"],
  "filters": [
    {
      "table": "agents",
      "where": "status = ?",
      "params": ["active"],
      "limit": 100
    }
  ],
  "includeSchema": false
}
```

**Response:** File download with appropriate Content-Type header

### Import API

#### GET /api/data/import

Get import options and usage information.

**Response:**
```json
{
  "success": true,
  "message": "Data import API",
  "importModes": { ... },
  "usage": { ... },
  "examples": [ ... ]
}
```

#### POST /api/data/import

Import data into database.

**Request Body:**
```json
{
  "format": "json" | "csv",
  "mode": "insert" | "update" | "upsert" | "replace",
  "dryRun": false,
  "skipDuplicates": true,
  "batchSize": 100,
  "createBackup": true,
  "backupName": "optional-backup-name",
  "data": "... CSV or JSON data ..."
}
```

**Response:**
```json
{
  "success": true,
  "backup": "backup-2024-01-01T00:00:00.000Z",
  "stats": {
    "totalRows": 10,
    "tables": {
      "agents": { "inserted": 5, "updated": 3, "skipped": 2, "errors": 0 }
    }
  },
  "errors": [],
  "importedAt": "2024-01-01T00:00:00.000Z",
  "message": "Data imported successfully"
}
```

## Frontend Component

The `DataExportImport` component provides a user-friendly interface for data export/import operations.

### Usage

```tsx
import { DataExportImport } from '@/components/DataExportImport';

export default function DataManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <DataExportImport />
    </div>
  );
}
```

### Features

- **Tabbed Interface**: Switch between Export and Import modes
- **Table Selection**: Select/deselect tables with Select All / Select None
- **Format Selection**: Choose between JSON and CSV formats
- **File Upload**: Drag-and-drop or click to upload import files
- **Import Mode Selection**: Choose insert, update, upsert, or replace
- **Options**: Configure dry run, skip duplicates, and backup options
- **Real-time Feedback**: Loading states, success/error messages
- **Import Results**: Detailed statistics and error reporting

## File Structure

```
src/
├── lib/
│   ├── data-import-export.ts          # Core import/export library
│   └── data-import-export.test.ts     # Unit tests
├── app/api/data/
│   ├── export/
│   │   ├── route.ts                   # Export API endpoint
│   │   └── route.test.ts              # Export API tests
│   └── import/
│       ├── route.ts                   # Import API endpoint
│       └── route.test.ts              # Import API tests
└── components/
    └── DataExportImport/
        └── index.tsx                  # React component
```

## Data Format Examples

### JSON Export Format

```json
{
  "format": "json",
  "tables": ["agents"],
  "data": {
    "agents": [
      {
        "id": "agent-1",
        "name": "Agent 1",
        "type": "worker",
        "provider": "openai",
        "status": "active",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "stats": {
    "totalRows": 1,
    "tables": {
      "agents": 1
    }
  },
  "exportedAt": "2024-01-01T00:00:00.000Z"
}
```

### CSV Export Format

```csv
# Table: agents

id,name,type,provider,status,created_at,updated_at
agent-1,Agent 1,worker,openai,active,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z
agent-2,Agent 2,worker,openai,active,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z

# Table: user_preferences

id,user_id,key,value
pref-1,user-1,theme,dark
```

## Testing

Run all tests:
```bash
npm test -- data-import-export
```

Run specific test files:
```bash
npm test src/lib/data-import-export.test.ts
npm test src/app/api/data/export/route.test.ts
npm test src/app/api/data/import/route.test.ts
```

## Error Handling

The system provides comprehensive error handling:

1. **Validation Errors**: Invalid format, table names, or options
2. **Parse Errors**: Malformed CSV or JSON data
3. **Import Errors**: Constraint violations, type mismatches, etc.
4. **Database Errors**: Connection issues, query failures

All errors include detailed messages to help diagnose and fix issues.

## Backup System

Automatic backups are created before imports (unless disabled):
- Backup files are stored in `/tmp/`
- Format: `backup-{timestamp}.db`
- Can be restored manually if needed
- Backup name is returned in import response

## Security Considerations

1. **SQL Injection**: All queries use parameterized statements
2. **Input Validation**: All inputs are validated before processing
3. **API Key Encryption**: Sensitive data remains encrypted
4. **Backup Files**: Stored in temporary directory with limited access

## Performance

- **Batch Processing**: Imports process records in batches (default: 100)
- **Efficient CSV Parsing**: Optimized for large files
- **Database Optimizations**: Uses prepared statements and transactions
- **Memory Management**: Processes data in chunks to avoid memory issues

## Future Enhancements

Potential future improvements:

- [ ] Support for additional formats (Excel, XML)
- [ ] Incremental exports (only changed data)
- [ ] Scheduled automated exports
- [ ] Export templates with saved configurations
- [ ] Progress tracking for large imports
- [ ] Real-time validation during import
- [ ] Undo/redo functionality for imports
- [ ] Data transformation pipelines
