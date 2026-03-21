# Advanced Search System for 7zi-Project

## Overview

A comprehensive, high-performance search and filtering system built with Fuse.js, supporting cross-entity search, autocomplete, history management, and advanced filtering capabilities.

## Features Implemented

### 1. Core Search Functionality

#### Fuse.js Integration
- **Fuzzy search** with configurable threshold (default: 0.3)
- **Extended search syntax** support (e.g., `^title`, `=exact`, `!exclude`)
- **Weighted field search** with custom scoring
- **Multi-field indexing** with configurable search fields

#### Cross-Entity Search
- Search across multiple entity types:
  - **Tasks** (GitHub issues)
  - **Projects** (Project entities)
  - **Members** (Team members)
  - **Agents** (AI agents)
- Unified search interface with type filtering
- Entity-specific result formatting

#### Advanced Filtering
- **Status filters**: open, closed, in_progress
- **Priority filters**: high, medium, low
- **Label filters**: Multi-select from available labels
- **Assignee filters**: Filter by team member
- **Date range filters**: created/updated date ranges
- **Custom filters**: Extensible filter system

### 2. Search History Management

#### LocalStorage Persistence
- Automatic persistence to browser storage
- Configurable maximum history size (default: 50 entries)
- Automatic cleanup of old entries (default: 30 days)

#### History Features
- **Recent searches**: Show most recent queries
- **Popular searches**: Most frequently used queries
- **Trending searches**: Recent and frequently used queries
- **History by target**: Filter history by entity type

#### History Management
- Add new searches automatically
- Remove individual history entries
- Clear all history
- Export/import history (JSON format)

### 3. Autocomplete & Suggestions

#### Real-time Suggestions
- **Entity suggestions**: Show matching entities as you type
- **History suggestions**: Suggest from past searches
- **Prefix suggestions**: Suggest common search operators
- **Debounced input**: Optimize performance

#### Autocomplete Features
- Configurable suggestion limit (default: 10)
- Type-ahead search with scoring
- Category-based organization
- Keyboard navigation support

### 4. Search Performance Optimization

#### Caching Strategy
- **LRU cache** for search results
- **Separate caches** for search and autocomplete
- Configurable cache sizes (default: 100 entries)
- Cache statistics and monitoring

#### Index Management
- Separate indices for each entity type
- Efficient index updates and rebuilding
- Index metadata and statistics
- Enable/disable individual indices

#### Performance Features
- Early exit optimizations
- Single-pass filtering
- Batch index operations
- Efficient string matching

### 5. UI Components

#### GlobalSearch Component
- Centralized search input with keyboard navigation
- Real-time autocomplete dropdown
- Advanced filters panel
- Target type selector
- Search history integration

#### SearchResults Component
- Grouped results by entity type
- Result highlighting with HTML markup
- Relevance scoring display
- Expandable/collapsible type sections
- Type filter toggles
- Pagination support

#### SearchHistory Component
- Tabbed interface (Recent/Popular/Trending)
- History entry display with metadata
- Delete individual entries
- Clear all history
- Timestamp formatting

### 6. API Routes

#### `/api/search`
- **GET**: Perform global search
- **Parameters**:
  - `q`: Search query
  - `target`: Entity type (all|tasks|projects|members|agents)
  - `limit`: Maximum results (default: 50)
  - `offset`: Pagination offset
  - `status`, `priority`, `labels`, `assignees`: Filter values
  - `createdAfter`, `createdBefore`, `updatedAfter`, `updatedBefore`: Date filters
  - `fuzzy`: Enable/disable fuzzy search
  - `fuzzyThreshold`: Fuzzy match threshold
  - `caseSensitive`: Enable case-sensitive search
  - `highlights`: Enable result highlighting

#### `/api/search/autocomplete`
- **GET**: Get autocomplete suggestions
- **Parameters**:
  - `q`: Search query
  - `target`: Entity type filter
  - `limit`: Maximum suggestions
  - `history`: Include history suggestions

#### `/api/search/history`
- **GET**: Get search history
- **POST**: Add entry to history
- **DELETE**: Clear history or remove specific entry
- **Parameters**:
  - `limit`: Maximum entries
  - `type`: History type (recent|popular|trending)
  - `target`: Filter by target type

#### `/api/search/index` (planned)
- **POST**: Update search index
- **Body**:
  - `indexId`: Index identifier
  - `items`: Array of entities to index

#### `/api/search/stats` (planned)
- **GET**: Get search statistics
- **Returns**: Cache stats, history stats, index stats

### 7. Test Coverage

#### Unit Tests
- Advanced search manager tests
- Search history manager tests
- Index manager tests
- API route tests (planned)
- Component tests (planned)

#### Test Features
- Index creation/management
- Search functionality
- Autocomplete suggestions
- History management
- Cache management
- Edge cases and error handling

## File Structure

```
src/
├── lib/
│   └── search/
│       ├── advanced-search.ts          # Core search manager
│       ├── index-manager.ts              # Search index management
│       ├── history-manager.ts           # Search history management
│       ├── types.ts                     # Type definitions
│       └── __tests__/
│           ├── advanced-search.test.ts   # Search tests
│           └── history-manager.test.ts   # History tests
├── components/
│   └── search/
│       ├── GlobalSearch.tsx             # Main search component
│       ├── SearchResults.tsx            # Results display
│       └── SearchHistory.tsx            # History display
├── app/
│   └── api/
│       └── search/
│           ├── route.ts                 # Main search API
│           ├── autocomplete/
│           │   └── route.ts             # Autocomplete API
│           └── history/
│               └── route.ts             # History API
└── types/
    └── search-filter.ts                 # Legacy types (keep for compatibility)
```

## Usage Examples

### Basic Search

```tsx
import { GlobalSearch } from '@/components/search/GlobalSearch';

function MyComponent() {
  return (
    <GlobalSearch
      placeholder="Search..."
      defaultTarget="all"
      maxResults={50}
      onSelectResult={(result) => console.log(result)}
    />
  );
}
```

### Advanced Search with Filters

```tsx
<GlobalSearch
  showFilters={true}
  showHistory={true}
  defaultTarget="tasks"
  onSelectResult={(result) => {
    if (result.type === 'task') {
      router.push(`/tasks/${result.id}`);
    }
  }}
/>
```

### Using Search API

```tsx
async function search(query: string) {
  const response = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&target=tasks&limit=20`
  );

  const data = await response.json();
  console.log('Results:', data.results);
  console.log('Total:', data.total);
}
```

### Using Search Manager Directly

```tsx
import { getGlobalSearchManager } from '@/lib/search/advanced-search';

const searchManager = getGlobalSearchManager();

// Create index
searchManager.createIndex('tasks', taskItems, {
  keys: ['title', 'description', 'labels.name'],
});

// Perform search
const results = searchManager.search('login bug', {
  limit: 20,
});

// Get suggestions
const suggestions = searchManager.getAutocompleteSuggestions('log', {
  includeHistory: true,
});
```

### Using History Manager

```tsx
import { getGlobalHistoryManager } from '@/lib/search/history-manager';

const historyManager = getGlobalHistoryManager();

// Add to history
historyManager.add({
  query: 'search term',
  resultCount: 15,
  target: 'tasks',
});

// Get recent history
const recent = historyManager.getRecent(10);

// Get popular searches
const popular = historyManager.getPopular(10);

// Get trending searches
const trending = historyManager.getTrending(10);
```

## Performance Considerations

### Optimization Tips

1. **Index Management**
   - Only index necessary fields
   - Use appropriate fuzzy thresholds
   - Rebuild indices when data changes significantly

2. **Cache Configuration**
   - Adjust cache sizes based on memory constraints
   - Monitor cache hit rates
   - Clear caches after data updates

3. **Search Optimization**
   - Use specific target types when possible
   - Apply filters early to reduce result set
   - Limit result counts for large datasets

4. **UI Optimization**
   - Debounce autocomplete input (300-500ms)
   - Use virtualization for large result lists
   - Implement lazy loading for images

### Monitoring

Use the statistics APIs to monitor performance:

```tsx
// Get cache statistics
const stats = searchManager.getCacheStats();
console.log('Search cache hit rate:', stats.searchCache.size);

// Get history statistics
const historyStats = historyManager.getStatistics();
console.log('Total searches:', historyStats.totalEntries);
console.log('Average results:', historyStats.averageResults);

// Get index statistics
const indexManager = getGlobalIndexManager();
const indexStats = indexManager.getStatistics();
console.log('Total items indexed:', indexStats.totalItems);
```

## Configuration

### Search Configuration

```tsx
interface SearchConfig {
  target: SearchTarget;
  caseSensitive?: boolean;
  exactMatch?: boolean;
  fields?: string[];
  fuzzyMatch?: boolean;
  fuzzyThreshold?: number;
  pinyinMatch?: boolean;
  fieldWeights?: Record<string, number>;
  minScore?: number;
  includeHighlights?: boolean;
}
```

### Fuse.js Options

```tsx
interface FuseOptions {
  keys: string[];
  threshold?: number;          // Default: 0.3
  distance?: number;           // Default: 100
  minMatchCharLength?: number;  // Default: 2
  includeScore?: boolean;       // Default: true
  includeMatches?: boolean;      // Default: true
  ignoreLocation?: boolean;      // Default: true
  useExtendedSearch?: boolean;   // Default: true
}
```

## Future Enhancements

### Planned Features
1. **Real-time indexing**: Web Workers for background indexing
2. **Synonym support**: Expand search with synonyms
3. **Advanced operators**: AND, OR, NOT, grouping
4. **Search analytics**: Track search patterns and effectiveness
5. **A/B testing**: Test different search algorithms
6. **Voice search**: Integrate speech-to-text
7. **OCR search**: Search within images
8. **Geo search**: Location-based filtering

### API Enhancements
1. **WebSocket streaming**: Real-time search updates
2. **GraphQL API**: Alternative query interface
3. **Rate limiting**: Prevent abuse
4. **Search suggestions API**: Popular/related queries
5. **Export search results**: CSV, JSON, PDF

## Dependencies

- **fuse.js**: Fuzzy search library
- **next**: React framework (for API routes)
- **react**: UI library
- **lucide-react**: Icon library

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Mobile

## License

MIT

## Contributing

See CONTRIBUTING.md for guidelines.

---

**Status**: ✅ Implementation Complete

**Last Updated**: 2026-03-21
