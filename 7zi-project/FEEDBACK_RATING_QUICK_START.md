# Feedback & Rating System Quick Start

## Installation

The system is already integrated into 7zi-project. No additional installation needed.

## Database Initialization

The database tables are automatically created on first use. However, you can manually initialize them:

```typescript
import { initializeFeedbackTables } from '@/lib/db/feedback';

await initializeFeedbackTables();
```

## Basic Usage

### 1. Display a Star Rating

```tsx
import { StarRating } from '@/components/rating';

// Read-only
<StarRating rating={4.5} showHalfStars />

// Interactive
<StarRating
  rating={rating}
  interactive
  showHalfStars
  onChange={(newRating) => setRating(newRating)}
/>

// Custom size
<StarRating rating={3} size="lg" />
```

### 2. Display Rating Statistics

```tsx
import { RatingStats } from '@/components/rating';

// Fetch stats from API
const response = await fetch('/api/ratings?target_type=agent&target_id=agent-1');
const { stats } = await response.json();

// Display
<RatingStats stats={stats} showDistribution showByTargetType />
```

### 3. Display Rating List

```tsx
import { RatingList } from '@/components/rating';

<RatingList
  targetType="agent"
  targetId="agent-1"
  onReply={async (id, content) => {
    await fetch(`/api/ratings/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }}
  onLike={async (id, unlike) => {
    await fetch(`/api/ratings/${id}/vote`, {
      method: unlike ? 'DELETE' : 'POST',
    });
  }}
/>
```

### 4. Create a New Rating

```tsx
// Using the API
const response = await fetch('/api/ratings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    target_type: 'agent',
    target_id: 'agent-1',
    rating: 5,
    title: 'Excellent service',
    description: 'Really great experience!',
    verified: true,
  }),
});

const rating = await response.json();
```

## API Endpoints

### Get Ratings

```
GET /api/ratings
```

Query Parameters:
- `target_type`: Filter by target type (agent, task, feature, project, overall)
- `target_id`: Filter by target ID
- `rating_min`: Minimum rating (1-5)
- `rating_max`: Maximum rating (1-5)
- `search`: Search in title and description
- `sort_by`: created_at, rating, helpful_count
- `sort_order`: asc, desc
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

### Create Rating

```
POST /api/ratings
```

Request Body:
```json
{
  "target_type": "agent",
  "target_id": "agent-1",
  "rating": 5,
  "title": "Excellent service",
  "description": "Really great experience!",
  "verified": true
}
```

### Get Single Rating

```
GET /api/ratings/[id]
```

### Update Rating

```
PATCH /api/ratings/[id]
```

Request Body:
```json
{
  "status": "approved",
  "admin_notes": "Verified"
}
```

### Delete Rating (Admin)

```
DELETE /api/ratings/[id]
```

## Component Props Reference

### StarRating

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rating | number | required | Current rating (0-5) |
| maxRating | number | 5 | Maximum rating |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Icon size |
| readonly | boolean | false | Disable interaction |
| interactive | boolean | false | Enable clicking |
| onChange | (rating) => void | undefined | Rating change callback |
| showHalfStars | boolean | false | Show decimals |
| className | string | undefined | Custom CSS classes |

### RatingList

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| targetType | string | undefined | Target type filter |
| targetId | string | undefined | Target ID filter |
| initialFilters | object | {} | Initial filter values |
| onReply | async (id, content) => void | undefined | Reply callback |
| onHelpful | async (id, isHelpful) => void | undefined | Vote callback |
| onFlag | async (id) => void | undefined | Flag callback |
| onDelete | async (id) => void | undefined | Delete callback |
| onLike | async (id, unlike) => void | undefined | Like callback |
| isOwner | boolean | false | User owns reviews |
| isAdmin | boolean | false | Admin privileges |
| className | string | undefined | Custom CSS classes |

### RatingStats

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| stats | RatingStats | required | Statistics object |
| showDistribution | boolean | true | Show rating distribution |
| showByTargetType | boolean | false | Show breakdown by type |
| className | string | undefined | Custom CSS classes |

## Examples

### Complete Page Example

```tsx
'use client';

import { useState, useEffect } from 'react';
import { RatingList, RatingStats, StarRating } from '@/components/rating';

export default function AgentReviewsPage({ params }: { params: { id: string } }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const response = await fetch(`/api/ratings?target_type=agent&target_id=${params.id}`);
    const data = await response.json();
    setStats(data.data?.stats || data.stats);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Agent Reviews</h1>

      {/* Statistics */}
      {stats && <RatingStats stats={stats} showDistribution />}

      {/* Rating List */}
      <RatingList
        targetType="agent"
        targetId={params.id}
        onReply={async (id, content) => {
          // Handle reply
        }}
        onLike={async (id, unlike) => {
          // Handle like
        }}
      />
    </div>
  );
}
```

### Interactive Rating Example

```tsx
'use client';

import { useState } from 'react';
import { StarRating } from '@/components/rating';

export default function RateAgent({ agentId }: { agentId: string }) {
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'agent',
          target_id: agentId,
          rating,
        }),
      });
      alert('Rating submitted!');
    } catch (error) {
      alert('Error submitting rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Rate this agent</h3>
      <StarRating
        rating={rating}
        interactive
        onChange={setRating}
      />
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </div>
  );
}
```

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Anti-Spam Configuration

Edit anti-spam rules in `src/lib/feedback/anti-spam.ts`:

```typescript
const config: AntiSpamConfig = {
  max_feedback_per_hour: 10,
  max_feedback_per_day: 50,
  min_time_between_feedback: 60, // seconds
  duplicate_threshold: 0.85,     // similarity 0-1
  require_email: false,
  enable_content_filter: true,
  blocked_words: ['spam', 'scam'],
};
```

## Troubleshooting

### Ratings not displaying
- Check if database tables are initialized
- Verify API response structure
- Check browser console for errors

### Half-stars not working
- Ensure `showHalfStars` prop is set to `true`
- Verify rating value has decimal (e.g., 4.5)

### Pagination not working
- Ensure API returns correct meta structure
- Check total_pages value in response

### Filter not applying
- Check if filter panel is open
- Verify API query parameters
- Check console for API errors

## Support

For issues or questions:
1. Check `FEEDBACK_RATING_SYSTEM_REPORT.md` for detailed documentation
2. Review test files for usage examples
3. Check API response structure in network tab
