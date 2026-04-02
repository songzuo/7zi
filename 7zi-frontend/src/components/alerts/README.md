# Alert Rules Configuration UI - v1.9.0

## Overview

This document describes the Alert Rules Configuration UI feature implemented for v1.9.0 of the 7zi platform. This feature allows users to create, manage, and monitor performance alert rules with a comprehensive UI.

## Features

### Core Functionality

1. **Alert Rules List**
   - Display all configured alert rules
   - Filter by enabled status, severity, and metric type
   - Pagination support
   - Real-time statistics (total, enabled, critical)

2. **Create Alert Rules**
   - Form-based rule creation
   - Comprehensive validation
   - Support for all metric types and conditions
   - Multiple notification channels

3. **Edit Alert Rules**
   - Modify existing rules
   - Toggle enable/disable
   - Update all rule parameters

4. **Delete Alert Rules**
   - Confirmation dialog
   - Safe deletion with validation

5. **Alert History**
   - View triggered alerts
   - Filter by status, severity, metric type
   - Acknowledge active alerts
   - Group by date

## Architecture

### API Routes

```
/api/alerts/rules
├── GET    - List all rules (with filters and pagination)
└── POST   - Create a new rule

/api/alerts/rules/[id]
├── GET    - Get a specific rule
├── PUT    - Update a rule
└── DELETE - Delete a rule

/api/alerts/history
├── GET    - List alert history (with filters)
└── POST   - Acknowledge an alert
```

### Frontend Components

```
src/components/alerts/
├── AlertsPage.tsx       - Main page component
├── AlertRuleForm.tsx    - Form for creating/editing rules
├── AlertHistory.tsx     - Alert history list and filters
└── index.ts             - Component exports
```

### Type Definitions

```
src/types/alerts.ts
├── AlertRule            - Alert rule type
├── CreateAlertRuleDTO   - Create rule DTO
├── UpdateAlertRuleDTO   - Update rule DTO
├── AlertHistory         - Alert history type
├── AlertHistoryQuery    - History query params
└── Response types       - API response types
```

## Data Models

### AlertRule

```typescript
interface AlertRule {
  id: string
  name: string
  metricType: MetricType
  condition: Condition
  threshold: number
  duration: number
  severity: Severity
  channels: NotificationChannel[]
  enabled: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  description?: string
}
```

### Metric Types

- `CPU` - CPU usage percentage
- `Memory` - Memory usage percentage
- `ResponseTime` - Response time in milliseconds
- `ErrorRate` - Error rate percentage
- `Throughput` - Requests per second

### Conditions

- `>` - Greater than
- `<` - Less than
- `>=` - Greater or equal
- `<=` - Less or equal
- `==` - Equal

### Severity Levels

- `info` - Informational
- `warning` - Warning
- `critical` - Critical

### Notification Channels

- `email` - Email notifications
- `slack` - Slack notifications
- `webhook` - Webhook notifications

## API Endpoints

### GET /api/alerts/rules

Query Parameters:
- `page` (number) - Page number (default: 1)
- `pageSize` (number) - Items per page (default: 10)
- `enabled` (boolean) - Filter by enabled status
- `severity` (string) - Filter by severity
- `metricType` (string) - Filter by metric type

Response:
```json
{
  "rules": [AlertRule],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### POST /api/alerts/rules

Request Body:
```json
{
  "name": string,
  "metricType": MetricType,
  "condition": Condition,
  "threshold": number,
  "duration": number,
  "severity": Severity,
  "channels": NotificationChannel[],
  "enabled": boolean,
  "description": string
}
```

Response: `AlertRule` (201 Created)

### PUT /api/alerts/rules/[id]

Request Body: Partial of CreateAlertRuleDTO

Response: `AlertRule` (200 OK)

### DELETE /api/alerts/rules/[id]

Response: `{ message: string }` (200 OK)

### GET /api/alerts/history

Query Parameters:
- `page` (number) - Page number
- `pageSize` (number) - Items per page
- `ruleId` (string) - Filter by rule ID
- `severity` (string) - Filter by severity
- `status` (string) - Filter by status
- `startDate` (string) - Filter by start date
- `endDate` (string) - Filter by end date

Response:
```json
{
  "alerts": [AlertHistory],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### POST /api/alerts/history

Request Body:
```json
{
  "alertId": string,
  "acknowledgedBy": string
}
```

Response: `AlertHistory` (200 OK)

## UI Components

### AlertsPage

Main page component that provides:
- Tab navigation (Rules / History)
- Statistics cards
- Alert rules list
- Alert history list
- Create/Edit modal

### AlertRuleForm

Form component for creating/editing rules:
- Name input
- Metric type selector (grid layout)
- Condition dropdown
- Threshold input
- Duration input
- Severity selector
- Notification channel toggles
- Description textarea
- Enable/disable toggle

### AlertHistory

History list component:
- Grouped by date
- Status badges (active/resolved/acknowledged)
- Severity badges
- Acknowledge button for active alerts
- Filter controls

## Validation

### Client-Side Validation

- Name: Required, max 100 characters
- Threshold: Required, positive number
- Duration: Required, positive number
- Channels: At least one required
- Metric type: Must be valid
- Condition: Must be valid
- Severity: Must be valid

### Server-Side Validation

All client-side validations plus:
- Data type validation
- Enum value validation
- Business logic validation

## Testing

### Unit Tests

- `AlertRuleForm.test.tsx` - Component tests
- `route.test.ts` (rules) - API route tests
- `route.test.ts` (history) - API route tests

### Test Coverage

- Form validation
- API endpoints
- Error handling
- User interactions

## Usage

### Accessing the Alerts Page

Navigate to: `/dashboard/alerts`

### Creating a New Rule

1. Click "New Rule" button
2. Fill in the form:
   - Rule name
   - Metric type
   - Condition
   - Threshold
   - Duration
   - Severity
   - Notification channels
   - Description (optional)
3. Toggle enable/disable
4. Click "Create Rule"

### Editing a Rule

1. Click "Edit" on a rule card
2. Modify the form fields
3. Click "Update Rule"

### Deleting a Rule

1. Click "Delete" on a rule card
2. Confirm deletion

### Viewing Alert History

1. Click "Alert History" tab
2. Use filters to narrow down results
3. Acknowledge active alerts if needed

## Future Enhancements

### Planned Features

1. **Database Integration**
   - Replace in-memory store with PostgreSQL
   - Add proper indexing
   - Implement data persistence

2. **Advanced Filtering**
   - Date range picker
   - Multi-select filters
   - Saved filter presets

3. **Alert Preview**
   - Test alert conditions
   - Preview notification content
   - Dry-run mode

4. **Bulk Operations**
   - Bulk enable/disable
   - Bulk delete
   - Bulk edit

5. **Export/Import**
   - Export rules to JSON
   - Import rules from JSON
   - Template sharing

6. **Real-time Updates**
   - WebSocket integration
   - Live alert status
   - Real-time notifications

7. **Analytics**
   - Alert frequency charts
   - Response time metrics
   - Trend analysis

8. **Integration**
   - Email service integration
   - Slack webhook integration
   - Custom webhook configuration

## Technical Notes

### State Management

- React hooks for local state
- API calls with fetch
- Optimistic UI updates

### Performance

- Pagination for large lists
- Debounced search
- Lazy loading

### Accessibility

- ARIA labels
- Keyboard navigation
- Screen reader support

### Responsive Design

- Mobile-friendly layout
- Touch-friendly controls
- Adaptive grid

## Dependencies

### External Libraries

- `uuid` - UUID generation
- `clsx` - Class name utilities
- React 19.2.4
- Next.js 16.2.1

### Internal Components

- `Button` - UI button component
- `Card` - UI card component
- `Input` - UI input component

## Troubleshooting

### Common Issues

1. **Rules not saving**
   - Check validation errors
   - Verify API endpoint is accessible
   - Check browser console for errors

2. **History not loading**
   - Verify API endpoint
   - Check network requests
   - Clear browser cache

3. **Notifications not working**
   - Configure notification channels
   - Verify email/Slack settings
   - Check webhook URLs

## Support

For issues or questions:
- Check the documentation
- Review test files for examples
- Contact the development team

## Version History

- **v1.0.0** (2026-04-03) - Initial implementation
  - Alert rules CRUD
  - Alert history
  - Basic filtering
  - Form validation
  - Unit tests

## License

MIT License - See project LICENSE file for details.