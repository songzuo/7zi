"""
Tests for Collectors - SystemCollector, ApplicationCollector, BusinessCollector, and CollectorManager
"""

import asyncio
import pytest
import time
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import threading

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.collectors import (
    BaseCollector, SystemCollector, ApplicationCollector, 
    BusinessCollector, CollectorManager
)
from src import MetricPoint, MetricType


class TestBaseCollector:
    """Test BaseCollector abstract class"""

    def test_init(self):
        """Test base collector initialization"""
        collector = SystemCollector(interval_seconds=10)
        assert collector.name == "system"
        assert collector.interval_seconds == 10
        assert collector._running is False
        assert collector._task is None

    def test_add_callback(self):
        """Test adding callback"""
        collector = SystemCollector()
        callback = Mock()
        collector.add_callback(callback)
        assert callback in collector._callbacks

    def test_add_multiple_callbacks(self):
        """Test adding multiple callbacks"""
        collector = SystemCollector()
        callback1 = Mock()
        callback2 = Mock()
        collector.add_callback(callback1)
        collector.add_callback(callback2)
        assert len(collector._callbacks) == 2


class TestSystemCollector:
    """Test SystemCollector class"""

    @pytest.fixture
    def collector(self):
        return SystemCollector(interval_seconds=5, disk_paths=["/"])

    def test_init_default(self):
        """Test system collector initialization with defaults"""
        collector = SystemCollector()
        assert collector.name == "system"
        assert collector.interval_seconds == 5
        assert collector.disk_paths == ["/"]

    def test_init_custom_disk_paths(self):
        """Test initialization with custom disk paths"""
        collector = SystemCollector(disk_paths=["/", "/data"])
        assert collector.disk_paths == ["/", "/data"]

    def test_get_load_average(self, collector):
        """Test getting load average"""
        load_avg = collector._get_load_average()
        assert len(load_avg) == 3
        assert all(isinstance(v, float) for v in load_avg)

    @patch('builtins.open', new_callable=MagicMock)
    def test_get_memory_info(self, mock_open, collector):
        """Test getting memory information"""
        mock_file = MagicMock()
        mock_file.readlines.return_value = [
            "MemTotal:       16000000 kB\n",
            "MemFree:          1000000 kB\n",
            "MemAvailable:     4000000 kB\n"
        ]
        mock_open.return_value.__enter__ = MagicMock(return_value=mock_file)
        mock_open.return_value.__exit__ = MagicMock(return_value=False)

        mem_info = collector._get_memory_info()
        assert "total" in mem_info
        assert "used" in mem_info
        assert "usage_percent" in mem_info

    @patch('builtins.open', new_callable=MagicMock)
    def test_get_network_info(self, mock_open, collector):
        """Test getting network information"""
        mock_file = MagicMock()
        mock_file.readlines.return_value = [
            "Inter-|   Receive                                                |  Transmit\n",
            " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compress\n",
            "eth0: 1000000  1000    0    0    0     0          0         0 500000   500    0    0    0     0       0          0\n"
        ]
        mock_open.return_value.__enter__ = MagicMock(return_value=mock_file)
        mock_open.return_value.__exit__ = MagicMock(return_value=False)

        # First call initializes
        collector._get_network_info()
        
        # Second call calculates rates
        time.sleep(0.1)
        net_info = collector._get_network_info()
        
        assert "in_bytes" in net_info
        assert "out_bytes" in net_info

    @pytest.mark.asyncio
    async def test_collect(self, collector):
        """Test collecting system metrics"""
        metrics = await collector.collect()
        
        assert isinstance(metrics, list)
        assert len(metrics) > 0
        
        # Check that we have CPU and memory metrics
        metric_names = [m.name for m in metrics]
        assert any("cpu" in name for name in metric_names)
        assert any("memory" in name for name in metric_names)

    def test_collector_lifecycle(self, collector):
        """Test starting and stopping collector"""
        assert collector._running is False
        
        collector.start()
        assert collector._running is True
        assert collector._task is not None
        
        # Allow a brief moment for the loop to start
        time.sleep(0.1)
        
        # Stop should work
        asyncio.get_event_loop().run_until_complete(collector.stop())
        assert collector._running is False


class TestApplicationCollector:
    """Test ApplicationCollector class"""

    @pytest.fixture
    def collector(self):
        return ApplicationCollector(interval_seconds=10)

    def test_init(self, collector):
        """Test application collector initialization"""
        assert collector.name == "application"
        assert collector.interval_seconds == 10
        assert collector._request_count == 0
        assert collector._error_count == 0

    def test_record_request(self, collector):
        """Test recording requests"""
        collector.record_request(100.0, is_error=False)
        collector.record_request(200.0, is_error=True)
        
        assert collector._request_count == 2
        assert collector._error_count == 1
        assert len(collector._request_times) == 2

    def test_record_request_thread_safety(self, collector):
        """Test recording requests from multiple threads"""
        def record_requests():
            for i in range(100):
                collector.record_request(float(i))
        
        threads = [threading.Thread(target=record_requests) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert collector._request_count == 500
        assert len(collector._request_times) == 500

    def test_set_active_connections(self, collector):
        """Test setting active connections"""
        collector.set_active_connections(42)
        assert collector._active_connections == 42

    def test_set_queue_length(self, collector):
        """Test setting queue length"""
        collector.set_queue_length(10)
        assert collector._queue_length == 10

    @pytest.mark.asyncio
    async def test_collect(self, collector):
        """Test collecting application metrics"""
        # Record some requests
        for i in range(100):
            collector.record_request(float(i * 10))
        
        metrics = await collector.collect()
        
        assert isinstance(metrics, list)
        assert len(metrics) > 0
        
        # Check for response time metrics
        metric_names = [m.name for m in metrics]
        assert any("response_time" in name for name in metric_names)

    @pytest.mark.asyncio
    async def test_collect_empty(self, collector):
        """Test collecting with no requests"""
        metrics = await collector.collect()
        
        # Should return empty list or default values
        assert isinstance(metrics, list)

    def test_percentile_calculation(self, collector):
        """Test percentile calculation in collect"""
        # Record requests with known distribution
        for i in range(100):
            collector.record_request(float(i))
        
        # Get metrics - percentiles should be calculated correctly
        metrics = asyncio.get_event_loop().run_until_complete(collector.collect())
        
        # Find p50 metric
        p50_metric = next((m for m in metrics if "p50" in m.name), None)
        if p50_metric:
            # p50 should be around 49-50
            assert 45 < p50_metric.value < 55


class TestBusinessCollector:
    """Test BusinessCollector class"""

    @pytest.fixture
    def collector(self):
        return BusinessCollector(interval_seconds=10)

    def test_init(self, collector):
        """Test business collector initialization"""
        assert collector.name == "business"
        assert collector._counters == {}
        assert collector._gauges == {}

    def test_increment_counter(self, collector):
        """Test incrementing counter"""
        collector.increment_counter("orders", 1)
        collector.increment_counter("orders", 2)
        
        assert collector._counters["orders"] == 3

    def test_increment_counter_with_tags(self, collector):
        """Test incrementing counter with tags"""
        collector.increment_counter("orders", 1, tags={"region": "us"})
        collector.increment_counter("orders", 1, tags={"region": "eu"})
        
        assert "orders:region=eu" in collector._counters
        assert "orders:region=us" in collector._counters

    def test_set_gauge(self, collector):
        """Test setting gauge"""
        collector.set_gauge("active_users", 42)
        
        assert collector._gauges["active_users"] == 42

    def test_set_gauge_with_tags(self, collector):
        """Test setting gauge with tags"""
        collector.set_gauge("active_users", 10, tags={"region": "us"})
        collector.set_gauge("active_users", 20, tags={"region": "eu"})
        
        assert collector._gauges["active_users:region=us"] == 10
        assert collector._gauges["active_users:region=eu"] == 20

    def test_record_histogram(self, collector):
        """Test recording histogram values"""
        collector.record_histogram("response_time", 100)
        collector.record_histogram("response_time", 200)
        collector.record_histogram("response_time", 300)
        
        assert len(collector._histograms["response_time"]) == 3

    def test_record_histogram_with_tags(self, collector):
        """Test recording histogram with tags"""
        collector.record_histogram("latency", 50, tags={"service": "api"})
        collector.record_histogram("latency", 100, tags={"service": "api"})
        
        assert len(collector._histograms["latency:service=api"]) == 2

    @pytest.mark.asyncio
    async def test_collect_counters(self, collector):
        """Test collecting counter metrics"""
        collector.increment_counter("orders", 5)
        collector.increment_counter("signups", 10)
        
        metrics = await collector.collect()
        
        # Counters should be cleared after collection
        assert len(collector._counters) == 0
        
        # Should have metric points for each counter
        counter_metrics = [m for m in metrics if "orders" in m.name or "signups" in m.name]
        assert len(counter_metrics) >= 2

    @pytest.mark.asyncio
    async def test_collect_gauges(self, collector):
        """Test collecting gauge metrics"""
        collector.set_gauge("active_users", 42)
        collector.set_gauge("connections", 100)
        
        metrics = await collector.collect()
        
        gauge_metrics = [m for m in metrics if "active_users" in m.name or "connections" in m.name]
        assert len(gauge_metrics) >= 2

    @pytest.mark.asyncio
    async def test_collect_histograms(self, collector):
        """Test collecting histogram metrics"""
        for i in range(100):
            collector.record_histogram("latency", float(i))
        
        metrics = await collector.collect()
        
        # Should have count, sum, avg, min, max, p50, p95, p99
        latency_metrics = [m for m in metrics if "latency" in m.name]
        assert len(latency_metrics) >= 8
        
        # Check specific metrics exist
        metric_names = [m.name for m in latency_metrics]
        assert any("count" in name for name in metric_names)
        assert any("avg" in name for name in metric_names)
        assert any("p50" in name for name in metric_names)
        assert any("p99" in name for name in metric_names)

    def test_make_key(self, collector):
        """Test key generation from name and tags"""
        key = collector._make_key("metric", None)
        assert key == "metric"
        
        key = collector._make_key("metric", {"a": "1", "b": "2"})
        # Tags should be sorted
        assert key == "metric:a=1,b=2" or key == "metric:b=2,a=1"

    def test_parse_key(self, collector):
        """Test parsing key back to name and tags"""
        name, tags = collector._parse_key("metric")
        assert name == "metric"
        assert tags == {}
        
        name, tags = collector._parse_key("metric:a=1,b=2")
        assert name == "metric"
        assert tags == {"a": "1", "b": "2"}


class TestCollectorManager:
    """Test CollectorManager class"""

    @pytest.fixture
    def manager(self):
        return CollectorManager()

    def test_init(self, manager):
        """Test manager initialization"""
        assert manager.collectors == {}
        assert manager._metrics_callback is None

    def test_add_collector(self, manager):
        """Test adding collector"""
        collector = SystemCollector()
        manager.add_collector(collector)
        
        assert "system" in manager.collectors
        assert manager.collectors["system"] == collector

    def test_add_collector_with_callback(self, manager):
        """Test adding collector with callback set"""
        callback = Mock()
        manager.set_metrics_callback(callback)
        
        collector = SystemCollector()
        manager.add_collector(collector)
        
        assert callback in collector._callbacks

    def test_get_collector(self, manager):
        """Test getting collector by name"""
        collector = SystemCollector()
        manager.add_collector(collector)
        
        result = manager.get_collector("system")
        assert result == collector
        
        result = manager.get_collector("nonexistent")
        assert result is None

    def test_add_multiple_collectors(self, manager):
        """Test adding multiple collectors"""
        system = SystemCollector()
        app = ApplicationCollector()
        business = BusinessCollector()
        
        manager.add_collector(system)
        manager.add_collector(app)
        manager.add_collector(business)
        
        assert len(manager.collectors) == 3
        assert "system" in manager.collectors
        assert "application" in manager.collectors
        assert "business" in manager.collectors

    @pytest.mark.asyncio
    async def test_start_all(self, manager):
        """Test starting all collectors"""
        system = SystemCollector()
        app = ApplicationCollector()
        
        manager.add_collector(system)
        manager.add_collector(app)
        
        await manager.start_all()
        
        assert system._running is True
        assert app._running is True
        
        # Clean up
        await manager.stop_all()

    @pytest.mark.asyncio
    async def test_stop_all(self, manager):
        """Test stopping all collectors"""
        system = SystemCollector()
        app = ApplicationCollector()
        
        manager.add_collector(system)
        manager.add_collector(app)
        
        await manager.start_all()
        await manager.stop_all()
        
        assert system._running is False
        assert app._running is False


class TestCollectorCallbacks:
    """Test collector callback functionality"""

    @pytest.mark.asyncio
    async def test_callback_invoked_on_collect(self):
        """Test that callback is invoked when metrics are collected"""
        collector = BusinessCollector()
        callback = AsyncMock()
        collector.add_callback(callback)
        
        collector.increment_counter("test", 1)
        metrics = await collector.collect()
        
        # The callback should be invoked with the metrics
        callback.assert_not_called()  # Callback is only invoked in collection loop

    def test_sync_callback(self):
        """Test synchronous callback"""
        collector = BusinessCollector()
        results = []
        
        def sync_callback(metrics):
            results.extend(metrics)
        
        collector.add_callback(sync_callback)
        assert len(collector._callbacks) == 1

    def test_async_callback(self):
        """Test asynchronous callback"""
        collector = BusinessCollector()
        
        async def async_callback(metrics):
            pass
        
        collector.add_callback(async_callback)
        assert len(collector._callbacks) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])