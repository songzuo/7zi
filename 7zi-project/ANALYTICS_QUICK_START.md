# 📊 Analytics Dashboard - Quick Start Guide

**7zi AI Team Management Platform**
*Analytics Module v1.0.0*

---

## 🚀 Quick Start

### 1. Access the Dashboard

Navigate to:
```
https://your-domain.com/analytics
```

### 2. Key Features

- **Real-time Metrics**: View 4 key statistics with trend indicators
- **Interactive Charts**: Switch between line, area, bar, pie, and radar charts
- **Time Range Selection**: Quick presets (today, week, month, quarter, year) or custom dates
- **Advanced Filtering**: Filter by task status, priority, type, and AI provider
- **Data Export**: Download data as CSV, Excel, or JSON
- **Auto-refresh**: Toggle automatic updates every 30 seconds
- **Custom Layouts**: Save and restore dashboard layouts

---

## 📁 File Structure

```
7zi-project/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   └── analytics/
│   │   │       ├── page.tsx              # Main analytics page
│   │   │       └── test/
│   │   │           └── page.tsx          # Test page
│   │   └── api/
│   │       └── analytics/
│   │           ├── metrics/
│   │           │   └── route.ts         # GET/POST /api/analytics/metrics
│   │           └── export/
│   │               └── route.ts         # POST /api/analytics/export
│   ├── components/
│   │   └── analytics/
│   │       ├── AnalyticsDashboard.tsx    # Main dashboard container
│   │       ├── AnalyticsChart.tsx       # Chart component
│   │       ├── MetricCard.tsx           # Statistic card
│   │       ├── DateRangePicker.tsx      # Date selector
│   │       ├── FilterPanel.tsx          # Filter controls
│   │       └── index.ts                 # Exports
│   └── lib/
│       └── types/
│           ├── analytics.ts              # Type definitions
│           └── analytics/
│               └── index.ts              # Type exports
└── ANALYTICS_IMPLEMENTATION_REPORT.md   # Detailed report
```

---

## 🔌 API Endpoints

### GET /api/analytics/metrics
Query metrics with time range filter.

**Query Parameters:**
- `timeRange` (optional): today | week | month | quarter | year | custom
- `customRange` (optional): JSON string { start, end }

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "agents": { "total": 11, "active": 8, ... },
      "users": { "total": 500, "activeToday": 50, ... },
      "tasks": { "total": 500, "completed": 350, ... },
      "revenue": { "total": 10000, "monthly": 2000, ... },
      "performance": { "cpuUsage": 50, "memoryUsage": 65, ... }
    },
    "timeSeries": [
      { "timestamp": "...", "date": "Mar 15", "agents": 10, "users": 50, ... },
      ...
    ]
  },
  "timestamp": "2026-03-21T12:00:00.000Z",
  "filters": { "timeRange": "week" }
}
```

### POST /api/analytics/metrics
Query metrics with advanced filters.

**Body:**
```json
{
  "timeRange": "week",
  "customRange": { "start": "2026-03-01", "end": "2026-03-21" },
  "agentIds": ["agent-1", "agent-2"],
  "taskStatuses": ["completed", "in-progress"],
  "taskPriorities": ["high", "medium"],
  "taskTypes": ["analysis", "implementation"],
  "providers": ["minimax", "self-claude"],
  "metrics": ["agents", "users", "tasks"],
  "compareWith": "month"
}
```

### GET /api/analytics/export
Get export options.

**Response:**
```json
{
  "success": true,
  "data": {
    "formats": ["csv", "xlsx", "json"],
    "maxRecords": 10000,
    "options": {
      "includeHeaders": ["true", "false"],
      "timeRange": ["today", "week", "month", "quarter", "year", "custom"]
    }
  },
  "timestamp": "2026-03-21T12:00:00.000Z"
}
```

### POST /api/analytics/export
Export data in various formats.

**Body:**
```json
{
  "format": "csv",
  "data": [...],
  "filename": "analytics-export",
  "includeHeaders": true,
  "filters": { "timeRange": "week" },
  "dateRange": { "start": "2026-03-01", "end": "2026-03-21" }
}
```

**Response:** File download with proper headers.

---

## 🎨 Component Usage

### AnalyticsDashboard
Main dashboard component with all features.

```tsx
import { AnalyticsDashboard } from '@/components/analytics';

export default function Page() {
  return (
    <AnalyticsDashboard
      locale="en"                // Language: 'en' | 'zh'
      defaultTimeRange="week"    // Initial time range
      refreshInterval={30000}    // Auto-refresh interval (ms)
    />
  );
}
```

### MetricCard
Display a single statistic with trend.

```tsx
import { MetricCard } from '@/components/analytics';

<MetricCard
  statistic={{
    label: "Active Users",
    value: 1234,
    format: "number",
    change: {
      value: 12.5,
      period: "last week",
      type: "increase"
    }
  }}
  icon={Users}
  color="blue"
  size="md"
/>
```

### AnalyticsChart
Display data with various chart types.

```tsx
import { AnalyticsChart } from '@/components/analytics';

<AnalyticsChart
  config={{
    type: 'area',              // line | area | bar | pie | donut | radar
    title: 'Activity Overview',
    data: timeSeriesData,
    metrics: ['agents', 'users', 'tasks'],
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    showLegend: true,
    showTooltip: true,
    height: 350
  }}
  onExport={(format) => handleExport(format)}
/>
```

### DateRangePicker
Select time range for data filtering.

```tsx
import { DateRangePicker } from '@/components/analytics';

<DateRangePicker
  selectedRange={timeRange}
  customRange={customRange}
  onChange={(range, customRange) => {
    setTimeRange(range);
    setCustomRange(customRange);
  }}
  locale="en"
/>
```

### FilterPanel
Multi-dimensional filter controls.

```tsx
import { FilterPanel } from '@/components/analytics';

<FilterPanel
  filters={filters}
  onFiltersChange={setFilters}
  locale="en"
/>
```

---

## 🎨 Styling & Themes

### Color Themes
Metric cards support 7 color themes:
- `blue` - Primary metrics
- `green` - Growth/success metrics
- `purple` - AI/team metrics
- `orange` - Performance metrics
- `pink` - Engagement metrics
- `cyan` - Tech/system metrics
- `red` - Alerts/errors

### Size Variants
- `sm` - Compact (mobile)
- `md` - Standard (default)
- `lg` - Large (desktop)

### Dark Mode
All components support dark mode automatically via Tailwind's `dark:` classes.

---

## 🔧 Customization

### Add New Metrics

1. Update `/src/lib/types/analytics.ts`:
```typescript
export interface AnalyticsMetrics {
  // ... existing metrics
  customMetric?: CustomMetricType;
}
```

2. Update mock data generator in `/src/app/api/analytics/metrics/route.ts`:
```typescript
function generateMockMetrics(filters: AnalyticsFilters): AnalyticsMetrics {
  return {
    // ... existing
    customMetric: {
      // Your data
    }
  };
}
```

3. Update time-series generator:
```typescript
data.push({
  timestamp: date.toISOString(),
  date: date.toLocaleDateString(...),
  customMetric: Math.floor(Math.random() * 100)
});
```

### Add New Chart Type

1. Add type to `ChartType` in analytics.ts:
```typescript
export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radar' | 'mychart';
```

2. Add icon mapping in AnalyticsChart.tsx:
```typescript
const chartTypeIcons: Record<ChartType, React.ElementType> = {
  // ... existing
  mychart: MyCustomIcon
};
```

3. Add render case in AnalyticsChart.tsx:
```typescript
switch (activeChartType) {
  // ... existing cases
  case 'mychart':
    return <MyCustomChart data={chartData} />;
}
```

### Add New Export Format

1. Add to ExportFormat in analytics.ts:
```typescript
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';
```

2. Add implementation in `/src/app/api/analytics/export/route.ts`:
```typescript
function convertToPDF(data: TimeSeriesDataPoint[]): Buffer {
  // PDF generation logic
}

switch (format) {
  // ... existing cases
  case 'pdf':
    content = convertToPDF(data as TimeSeriesDataPoint[]);
    contentType = getContentType('pdf');
    break;
}
```

---

## 📊 Default Dashboard Layout

The dashboard includes 6 default widgets:

1. **Metric Cards Row** (4 columns)
   - Active Agents
   - Active Users
   - Tasks Completed
   - Total Revenue

2. **Activity Chart** (8 columns)
   - Multi-metric time series
   - Chart type: Area
   - Metrics: agents, users, tasks, tokens

3. **Revenue Chart** (4 columns)
   - Revenue trend
   - Chart type: Line
   - Metric: revenue

4. **Token Usage Chart** (Full width)
   - Token usage & errors
   - Chart type: Bar
   - Metrics: tokens, errors

5. **Performance Stats Footer** (4 columns)
   - Task Completion Rate
   - System Uptime
   - Cache Hit Rate
   - Error Rate

---

## 🔐 Authentication & Permissions

The analytics endpoints currently use the existing auth middleware (`withUserAuth`). To customize permissions:

1. Add RBAC checks in route handlers:
```typescript
export async function GET(request: NextRequest) {
  return withUserAuth(request, GETHandler, {
    requiredPermissions: ['analytics:read']
  });
}
```

2. Add role-based filtering:
```typescript
const user = await getCurrentUser(request);
const allowedMetrics = getUserAllowedMetrics(user.role);
```

---

## 🧪 Testing

### Test Page
Visit `/analytics/test` to view a minimal test page.

### API Testing
```bash
# Get metrics
curl "http://localhost:3000/api/analytics/metrics?timeRange=week"

# Post with filters
curl -X POST "http://localhost:3000/api/analytics/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "timeRange": "week",
    "metrics": ["agents", "users"]
  }'

# Export CSV
curl -X POST "http://localhost:3000/api/analytics/export" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "data": [{"timestamp": "...", "agents": 10}]
  }' \
  --output export.csv
```

---

## 🐛 Troubleshooting

### Charts Not Rendering
- Check console for Recharts errors
- Verify data structure matches `TimeSeriesDataPoint` interface
- Ensure parent container has defined height

### Export Not Working
- Check if `xlsx` library is installed: `npm ls xlsx`
- Verify data format is correct
- Check browser download permissions

### Data Not Updating
- Verify auto-refresh is enabled
- Check browser console for API errors
- Verify `/api/analytics/metrics` endpoint is accessible

### Type Errors
- Run `npm run type-check`
- Ensure all types are imported from `@/lib/types/analytics`
- Check for any `any` types in your code

---

## 📚 Additional Resources

- [Recharts Documentation](https://recharts.org/)
- [XLSX Library Docs](https://github.com/SheetJS/sheetjs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🎯 Next Steps

1. **Connect Real Data**: Replace mock data with database queries
2. **WebSocket Integration**: Enable real-time updates via existing SSE
3. **Add Tests**: Write unit and integration tests
4. **Performance**: Implement caching and optimize queries
5. **Custom Reports**: Build report scheduling and email delivery

---

*Last Updated: 2026-03-21*
