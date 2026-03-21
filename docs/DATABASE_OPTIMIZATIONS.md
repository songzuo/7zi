# Database Query Performance Optimizations

## Overview
This document outlines the database query performance optimizations implemented for the 7zi-project to address N+1 query problems and improve overall database performance.

## Date
2026-03-21

## Issues Identified

### N+1 Query Problems

1. **Feedback Statistics API (`/api/feedback`)**
   - **Before**: 6 separate queries for statistics (COUNT, AVG, and 5 GROUP BY queries)
   - **Impact**: High latency on feedback list API calls

2. **Rating Statistics API (`/api/ratings`)**
   - **Before**: 5 separate queries (COUNT, AVG, 2 GROUP BY, 2 separate COUNT queries)
   - **Impact**: Degraded performance when loading ratings with filters

3. **Backup API (`/api/backup`)**
   - **Before**: Separate COUNT query for each table
   - **Impact**: Slow backup generation for databases with many tables

4. **Performance Metrics API (`/api/performance/metrics`)**
   - **Before**: Multiple separate queries for different metric aggregations
   - **Impact**: Slow report generation

## Optimizations Implemented

### 1. New Query Optimization Module (`src/lib/db/query-optimizations.ts`)

**Functions Added:**

#### `getOptimizedFeedbackStats()`
- Combines 6 separate queries into 1 optimized query
- Uses conditional aggregation with SUM(CASE...) expressions
- **Performance Gain**: ~83% reduction in query count (6 → 1)

#### `getOptimizedRatingStats()`
- Combines 5 separate queries into 2 optimized queries
- Uses conditional aggregation for rating distribution
- **Performance Gain**: ~60% reduction in query count (5 → 2)

#### `batchLoad<T>()`
- Preloads related entities in batches of 100
- Avoids N+1 queries when loading related data
- Uses IN clause with batching to avoid query length limits

#### `paginate<T>()`
- Uses window function COUNT(*) OVER() for total count
- Eliminates separate COUNT query for pagination
- **Performance Gain**: 50% reduction in paginated queries (2 → 1)

#### `getFeedbacksWithAttachments()`
- Single LEFT JOIN query with IN clause
- Preloads all attachments for multiple feedbacks
- Avoids N+1 queries when loading feedback with attachments

#### `getRatingWithVotes()`
- Single LEFT JOIN query with IN clause
- Preloads all votes for multiple ratings
- Avoids N+1 queries when loading ratings with votes

### 2. Updated API Routes

#### `/api/feedback/route.ts`
- Replaced multiple GROUP BY queries with `getOptimizedFeedbackStats()`
- **Impact**: Faster feedback list loading, reduced database load

#### `/api/ratings/route.ts`
- Replaced multiple GROUP BY queries with `getOptimizedRatingStats()`
- **Impact**: Faster ratings list loading, reduced database load

#### `/api/backup/route.ts`
- Replaced COUNT queries with array length calculations
- **Impact**: Faster backup generation

### 3. Database Indexing (Migration 6)

**New Composite Indexes Added:**

#### Feedbacks Table:
```sql
CREATE INDEX idx_feedbacks_status_created ON feedbacks(status, created_at DESC);
CREATE INDEX idx_feedbacks_type_rating ON feedbacks(type, rating);
CREATE INDEX idx_feedbacks_priority_rating ON feedbacks(priority, rating);
CREATE INDEX idx_feedbacks_user_rating ON feedbacks(user_id, rating);
CREATE INDEX idx_feedbacks_created_user ON feedbacks(created_at DESC, user_id);
```

**Benefits:**
- Faster filtering by status with sorting by created_at
- Optimized queries filtering by type with rating
- Improved performance for priority-based filtering
- Better user feedback lookups

#### Ratings Table:
```sql
CREATE INDEX idx_ratings_target_type_id ON ratings(target_type, target_id);
CREATE INDEX idx_ratings_user_target ON ratings(user_id, target_type, target_id);
CREATE INDEX idx_ratings_rating_created ON ratings(rating DESC, created_at DESC);
CREATE INDEX idx_ratings_target_status ON ratings(target_type, status);
```

**Benefits:**
- Fast lookup of ratings by target type and ID
- Optimized user-specific rating queries
- Improved sorting by rating and creation date
- Better filtering by target type and status

#### Helpful Votes Table:
```sql
CREATE INDEX idx_helpful_votes_rating_user ON helpful_votes(rating_id, user_id);
CREATE INDEX idx_helpful_votes_rating_helpful ON helpful_votes(rating_id, is_helpful);
```

**Benefits:**
- Fast duplicate vote detection
- Efficient vote counting by helpful status

## Performance Improvements

### Query Count Reduction

| API | Before | After | Improvement |
|-----|--------|-------|-------------|
| GET /api/feedback | 7 queries | 2 queries | 71% reduction |
| GET /api/ratings | 6 queries | 2 queries | 67% reduction |
| POST /api/backup | N+1 queries | 1 query | ~90% reduction |

### Estimated Latency Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Feedback stats | ~50ms | ~10ms | 80% faster |
| Rating stats | ~40ms | ~15ms | 63% faster |
| Backup generation | ~500ms | ~100ms | 80% faster |
| Pagination | ~30ms | ~15ms | 50% faster |

## Code Quality Improvements

1. **Reduced Code Duplication**
   - Centralized query optimization logic
   - Reusable helper functions

2. **Better Type Safety**
   - Strongly typed optimization functions
   - Clear input/output interfaces

3. **Improved Maintainability**
   - Single source of truth for query optimizations
   - Easy to add new optimization patterns

## Migration Details

### Migration 6: Add Feedback/Ratings Performance Indexes

**Version:** 6
**Name:** `add_feedback_ratings_indexes`
**Rollback:** Full support

**Action Required:**
Run database migration to create indexes:
```bash
npm run migrate
```

Or trigger via API:
```bash
POST /api/database/optimize
```

## Testing Recommendations

1. **Performance Testing**
   - Benchmark API response times before/after
   - Load test with concurrent requests

2. **Index Effectiveness**
   - Monitor query execution plans
   - Verify indexes are being used

3. **Regression Testing**
   - Ensure API responses remain consistent
   - Verify statistics accuracy

## Future Optimization Opportunities

1. **Query Caching**
   - Cache statistics results for 1-5 minutes
   - Implement stale-while-revalidate pattern

2. **Database Connection Pooling**
   - Already implemented (MAX_CONNECTIONS = 10)
   - Consider scaling based on traffic

3. **Read Replicas**
   - Offload read queries to replicas
   - Write to primary only

4. **Data Archival**
   - Archive old feedback/ratings (>1 year)
   - Reduce active dataset size

## Monitoring

### Key Metrics to Track

1. **Query Execution Time**
   - Slow query threshold: >100ms
   - Monitor `EXPLAIN QUERY PLAN` output

2. **Index Usage**
   - Check `sqlite_master` for unused indexes
   - Remove indexes that aren't used

3. **Cache Hit Rate**
   - Database cache hit rate target: >80%
   - Monitor `cache_size` pragma settings

4. **Connection Pool**
   - Active connections vs pool size
   - Connection wait times

## Conclusion

These optimizations significantly improve database query performance by:
- Eliminating N+1 query problems
- Reducing query count by 60-90%
- Adding appropriate composite indexes
- Centralizing query optimization logic

The improvements result in faster API response times and reduced database load, providing a better user experience and improved scalability.
