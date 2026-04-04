"""
Tests for Storage - MemoryStorage, SQLiteStorage, and aggregation functionality
"""

import asyncio
import pytest
import time
import os
import tempfile
from unittest.mock import Mock, AsyncMock, patch
import sys
import sqlite3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.storage import MemoryStorage, SQLiteStorage, BaseStorage
from src import MetricPoint, MetricType


class TestMemoryStorage:
    """Test MemoryStorage class"""

    @pytest.fixture
    def storage(self):
        return MemoryStorage(max_points=100)

    @pytest.mark.asyncio
    async def test_init(self, storage):
        """Test storage initialization"""
        assert storage.max_points == 100
        assert storage._metrics == {}

    @pytest.mark.asyncio
    async def test_store_single_metric(self, storage):
        """Test storing a single metric"""
        metric = MetricPoint("test.metric", 42.0)
        result = await storage.store([metric])
        
        assert result is True
        assert "test.metric" in storage._metrics
        assert len(storage._metrics["test.metric"]) == 1

    @pytest.mark.asyncio
    async def test_store_multiple_metrics(self, storage):
        """Test storing multiple metrics"""
        metrics = [
            MetricPoint("metric1", 1.0),
            MetricPoint("metric2", 2.0),
            MetricPoint("metric3", 3.0)
        ]
        result = await storage.store(metrics)
        
        assert result is True
        assert len(storage._metrics) == 3

    @pytest.mark.asyncio
    async def test_store_metric_with_dict(self, storage):
        """Test storing metric as dictionary"""
        metric_dict = {
            "name": "test.metric",
            "value": 42.0,
            "timestamp": time.time(),
            "tags": {"env": "test"}
        }
        result = await storage.store([metric_dict])
        
        assert result is True

    @pytest.mark.asyncio
    async def test_store_respects_max_points(self, storage):
        """Test that storage respects max_points limit"""
        storage.max_points = 5
        
        metrics = [MetricPoint("test.metric", float(i)) for i in range(10)]
        await storage.store(metrics)
        
        # Should only keep 5 most recent points
        assert len(storage._metrics["test.metric"]) == 5

    @pytest.mark.asyncio
    async def test_query_basic(self, storage):
        """Test basic query"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 10),
            MetricPoint("test.metric", 2.0, timestamp=now - 5),
            MetricPoint("test.metric", 3.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        results = await storage.query("test.metric", now - 15, now)
        
        assert len(results) == 3

    @pytest.mark.asyncio
    async def test_query_with_time_range(self, storage):
        """Test query with time range filter"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 100),
            MetricPoint("test.metric", 2.0, timestamp=now - 50),
            MetricPoint("test.metric", 3.0, timestamp=now - 10),
            MetricPoint("test.metric", 4.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        # Query only last 30 seconds
        results = await storage.query("test.metric", now - 30, now)
        
        assert len(results) == 2
        assert results[0]["value"] == 3.0
        assert results[1]["value"] == 4.0

    @pytest.mark.asyncio
    async def test_query_with_tags(self, storage):
        """Test query with tag filter"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now, tags={"env": "prod"}),
            MetricPoint("test.metric", 2.0, timestamp=now, tags={"env": "dev"})
        ]
        await storage.store(metrics)
        
        results = await storage.query("test.metric", now - 10, now, tags={"env": "prod"})
        
        assert len(results) == 1
        assert results[0]["value"] == 1.0

    @pytest.mark.asyncio
    async def test_query_nonexistent_metric(self, storage):
        """Test querying non-existent metric"""
        results = await storage.query("nonexistent.metric", 0, time.time())
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_get_latest(self, storage):
        """Test getting latest metric"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 10),
            MetricPoint("test.metric", 2.0, timestamp=now - 5),
            MetricPoint("test.metric", 3.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        latest = await storage.get_latest("test.metric")
        
        assert latest is not None
        assert latest["value"] == 3.0

    @pytest.mark.asyncio
    async def test_get_latest_with_tags(self, storage):
        """Test getting latest metric with tag filter"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 10, tags={"env": "prod"}),
            MetricPoint("test.metric", 2.0, timestamp=now - 5, tags={"env": "dev"}),
            MetricPoint("test.metric", 3.0, timestamp=now, tags={"env": "prod"})
        ]
        await storage.store(metrics)
        
        latest = await storage.get_latest("test.metric", tags={"env": "prod"})
        
        assert latest["value"] == 3.0

    @pytest.mark.asyncio
    async def test_get_latest_nonexistent(self, storage):
        """Test getting latest non-existent metric"""
        latest = await storage.get_latest("nonexistent.metric")
        assert latest is None

    @pytest.mark.asyncio
    async def test_aggregate_basic(self, storage):
        """Test basic aggregation"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 10.0, timestamp=now - 60),
            MetricPoint("test.metric", 20.0, timestamp=now - 30),
            MetricPoint("test.metric", 30.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        aggregated = await storage.aggregate("test.metric", now - 120, now, 60)
        
        # Should have 2 intervals: [now-120, now-60) and [now-60, now]
        assert len(aggregated) == 2
        
        # Check aggregation data
        assert "count" in aggregated[0]
        assert "sum" in aggregated[0]
        assert "min" in aggregated[0]
        assert "max" in aggregated[0]
        assert "avg" in aggregated[0]
        assert "p50" in aggregated[0]
        assert "p95" in aggregated[0]
        assert "p99" in aggregated[0]

    @pytest.mark.asyncio
    async def test_aggregate_with_tags(self, storage):
        """Test aggregation with tag filter"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 10.0, timestamp=now - 60, tags={"env": "prod"}),
            MetricPoint("test.metric", 20.0, timestamp=now - 30, tags={"env": "dev"}),
            MetricPoint("test.metric", 30.0, timestamp=now, tags={"env": "prod"})
        ]
        await storage.store(metrics)
        
        aggregated = await storage.aggregate("test.metric", now - 120, now, 60, tags={"env": "prod"})
        
        # Should only include prod metrics
        assert len(aggregated) >= 1

    @pytest.mark.asyncio
    async def test_aggregate_empty_data(self, storage):
        """Test aggregating with no data"""
        aggregated = await storage.aggregate("test.metric", 0, time.time(), 60)
        assert len(aggregated) == 0

    @pytest.mark.asyncio
    async def test_aggregate_single_value(self, storage):
        """Test aggregating with single value"""
        now = time.time()
        metrics = [MetricPoint("test.metric", 42.0, timestamp=now)]
        await storage.store(metrics)
        
        aggregated = await storage.aggregate("test.metric", now - 60, now + 60, 60)
        
        assert len(aggregated) >= 1
        assert aggregated[0]["count"] == 1
        assert aggregated[0]["min"] == 42.0
        assert aggregated[0]["max"] == 42.0
        assert aggregated[0]["avg"] == 42.0

    @pytest.mark.asyncio
    async def test_cleanup(self, storage):
        """Test cleanup of old data"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 200000),  # Very old
            MetricPoint("test.metric", 2.0, timestamp=now - 100000),  # Old
            MetricPoint("test.metric", 3.0, timestamp=now)  # Recent
        ]
        await storage.store(metrics)
        
        # Cleanup data older than 1 day
        await storage.cleanup(retention_days=1)
        
        # Should only have recent metric
        assert len(storage._metrics["test.metric"]) == 1
        assert storage._metrics["test.metric"][0]["value"] == 3.0

    @pytest.mark.asyncio
    async def test_cleanup_removes_empty_queues(self, storage):
        """Test that cleanup removes empty metric queues"""
        now = time.time()
        metrics = [MetricPoint("test.metric", 1.0, timestamp=now - 200000)]
        await storage.store(metrics)
        
        await storage.cleanup(retention_days=1)
        
        # Metric should be removed entirely
        assert "test.metric" not in storage._metrics


class TestSQLiteStorage:
    """Test SQLiteStorage class"""

    @pytest.fixture
    def db_path(self):
        """Create temporary database file"""
        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        yield path
        # Cleanup
        if os.path.exists(path):
            os.remove(path)

    @pytest.fixture
    def storage(self, db_path):
        """Create SQLiteStorage with temp database"""
        return SQLiteStorage(db_path=db_path)

    @pytest.mark.asyncio
    async def test_init_and_setup(self, storage):
        """Test initialization and database setup"""
        # Initialize storage
        await storage._setup_database()
        
        # Check that tables exist
        async with storage._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='metrics'
            """)
            result = await cursor.fetchone()
            assert result is not None

    @pytest.mark.asyncio
    async def test_store_metric(self, storage):
        """Test storing metric in SQLite"""
        await storage._setup_database()
        
        now = time.time()
        metric = MetricPoint("test.metric", 42.0, timestamp=now)
        
        result = await storage.store([metric])
        assert result is True
        
        # Verify stored in database
        async with storage._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM metrics WHERE name = ?",
                ("test.metric",)
            )
            count = await cursor.fetchone()
            assert count[0] == 1

    @pytest.mark.asyncio
    async def test_query_from_sqlite(self, storage):
        """Test querying from SQLite storage"""
        await storage._setup_database()
        
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 10),
            MetricPoint("test.metric", 2.0, timestamp=now - 5),
            MetricPoint("test.metric", 3.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        results = await storage.query("test.metric", now - 15, now)
        
        assert len(results) == 3
        assert results[0]["value"] == 1.0
        assert results[1]["value"] == 2.0
        assert results[2]["value"] == 3.0

    @pytest.mark.asyncio
    async def test_get_latest_from_sqlite(self, storage):
        """Test getting latest metric from SQLite"""
        await storage._setup_database()
        
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 10),
            MetricPoint("test.metric", 2.0, timestamp=now - 5),
            MetricPoint("test.metric", 3.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        latest = await storage.get_latest("test.metric")
        
        assert latest is not None
        assert latest["value"] == 3.0

    @pytest.mark.asyncio
    async def test_aggregate_from_sqlite(self, storage):
        """Test aggregating from SQLite storage"""
        await storage._setup_database()
        
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 10.0, timestamp=now - 60),
            MetricPoint("test.metric", 20.0, timestamp=now - 30),
            MetricPoint("test.metric", 30.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        aggregated = await storage.aggregate("test.metric", now - 120, now, 60)
        
        assert len(aggregated) >= 1
        assert "avg" in aggregated[0]
        assert "count" in aggregated[0]

    @pytest.mark.asyncio
    async def test_cleanup_from_sqlite(self, storage):
        """Test cleanup in SQLite storage"""
        await storage._setup_database()
        
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 200000),
            MetricPoint("test.metric", 2.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        # Cleanup old data
        await storage.cleanup(retention_days=1)
        
        # Verify only recent metric remains
        results = await storage.query("test.metric", now - 300000, now)
        assert len(results) == 1
        assert results[0]["value"] == 2.0


class TestStoragePerformance:
    """Test storage performance and edge cases"""

    @pytest.fixture
    def storage(self):
        return MemoryStorage(max_points=1000)

    @pytest.mark.asyncio
    async def test_large_batch_insert(self, storage):
        """Test inserting large batch of metrics"""
        metrics = [
            MetricPoint("test.metric", float(i), timestamp=time.time() - i)
            for i in range(1000)
        ]
        
        result = await storage.store(metrics)
        assert result is True
        assert len(storage._metrics["test.metric"]) == 1000

    @pytest.mark.asyncio
    async def test_concurrent_stores(self, storage):
        """Test concurrent store operations"""
        async def store_metrics(batch_id):
            metrics = [
                MetricPoint(f"test.metric.{batch_id}", float(i))
                for i in range(100)
            ]
            return await storage.store(metrics)
        
        # Run concurrent stores
        results = await asyncio.gather(
            *[store_metrics(i) for i in range(10)]
        )
        
        # All should succeed
        assert all(results)
        assert len(storage._metrics) == 10

    @pytest.mark.asyncio
    async def test_empty_store(self, storage):
        """Test storing empty list"""
        result = await storage.store([])
        assert result is True

    @pytest.mark.asyncio
    async def test_metric_without_name(self, storage):
        """Test storing metric without name (should be skipped)"""
        metric_dict = {
            "value": 42.0,
            "timestamp": time.time()
        }
        
        result = await storage.store([metric_dict])
        assert result is True
        assert len(storage._metrics) == 0

    @pytest.mark.asyncio
    async def test_query_empty_result(self, storage):
        """Test query that returns no results"""
        # Store a metric at a different time
        now = time.time()
        metric = MetricPoint("test.metric", 42.0, timestamp=now - 100)
        await storage.store([metric])
        
        # Query a time range that doesn't include it
        results = await storage.query("test.metric", now - 10, now)
        assert len(results) == 0


class TestStorageEdgeCases:
    """Test edge cases and error handling"""

    @pytest.fixture
    def storage(self):
        return MemoryStorage(max_points=100)

    @pytest.mark.asyncio
    async def test_negative_values(self, storage):
        """Test storing negative values"""
        metric = MetricPoint("test.metric", -42.0)
        await storage.store([metric])
        
        latest = await storage.get_latest("test.metric")
        assert latest["value"] == -42.0

    @pytest.mark.asyncio
    async def test_zero_values(self, storage):
        """Test storing zero values"""
        metric = MetricPoint("test.metric", 0.0)
        await storage.store([metric])
        
        latest = await storage.get_latest("test.metric")
        assert latest["value"] == 0.0

    @pytest.mark.asyncio
    async def test_very_large_values(self, storage):
        """Test storing very large values"""
        metric = MetricPoint("test.metric", 1e100)
        await storage.store([metric])
        
        latest = await storage.get_latest("test.metric")
        assert latest["value"] == 1e100

    @pytest.mark.asyncio
    async def test_timestamp_precision(self, storage):
        """Test timestamp precision"""
        now = time.time()
        metric = MetricPoint("test.metric", 42.0, timestamp=now)
        await storage.store([metric])
        
        latest = await storage.get_latest("test.metric")
        # Timestamp should be preserved
        assert abs(latest["timestamp"] - now) < 0.001

    @pytest.mark.asyncio
    async def test_complex_tags(self, storage):
        """Test complex tag structures"""
        tags = {
            "env": "prod",
            "region": "us-west",
            "version": "1.2.3",
            "feature_flag": "true"
        }
        metric = MetricPoint("test.metric", 42.0, tags=tags)
        await storage.store([metric])
        
        latest = await storage.get_latest("test.metric", tags={"env": "prod"})
        assert latest is not None

    @pytest.mark.asyncio
    async def test_aggregation_interval_boundaries(self, storage):
        """Test aggregation respects interval boundaries"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 1.0, timestamp=now - 90),
            MetricPoint("test.metric", 2.0, timestamp=now - 60),
            MetricPoint("test.metric", 3.0, timestamp=now - 30),
            MetricPoint("test.metric", 4.0, timestamp=now)
        ]
        await storage.store(metrics)
        
        # Aggregate with 60-second intervals
        aggregated = await storage.aggregate("test.metric", now - 120, now, 60)
        
        # Should have 2 intervals
        assert len(aggregated) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])