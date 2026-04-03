"""
Tests for 7zi Monitoring System
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src import (
    MetricPoint, MetricType, Alert, AlertLevel, AlertChannel,
    ScalingEvent, ScalingAction, SystemMetrics, ApplicationMetrics,
    ConditionType
)
from src.collectors import SystemCollector, ApplicationCollector, BusinessCollector
from src.storage import MemoryStorage
from src.scaling import ScalingEngine
from src.alerts import AlertManager


class TestMetricPoint:
    """Test MetricPoint class"""
    
    def test_create_metric_point(self):
        """Test creating a metric point"""
        point = MetricPoint(
            name="test.metric",
            value=42.0,
            timestamp=time.time(),
            tags={"env": "test"},
            metric_type=MetricType.GAUGE
        )
        
        assert point.name == "test.metric"
        assert point.value == 42.0
        assert point.tags == {"env": "test"}
        assert point.metric_type == MetricType.GAUGE
        
    def test_to_dict(self):
        """Test converting to dictionary"""
        point = MetricPoint(
            name="test.metric",
            value=42.0,
            timestamp=1234567890.0,
            tags={"env": "test"},
            metric_type=MetricType.GAUGE
        )
        
        d = point.to_dict()
        assert d["name"] == "test.metric"
        assert d["value"] == 42.0
        assert d["timestamp"] == 1234567890.0
        assert d["tags"] == {"env": "test"}
        assert d["metric_type"] == "gauge"
        
    def test_from_dict(self):
        """Test creating from dictionary"""
        d = {
            "name": "test.metric",
            "value": 42.0,
            "timestamp": 1234567890.0,
            "tags": {"env": "test"},
            "metric_type": "counter"
        }
        
        point = MetricPoint.from_dict(d)
        assert point.name == "test.metric"
        assert point.value == 42.0
        assert point.metric_type == MetricType.COUNTER


class TestSystemMetrics:
    """Test SystemMetrics class"""
    
    def test_create_system_metrics(self):
        """Test creating system metrics"""
        metrics = SystemMetrics(
            cpu_usage=50.0,
            cpu_count=4,
            memory_usage=60.0,
            memory_total=16000000000,
            memory_used=9600000000,
            disk_usage=40.0,
            disk_total=500000000000,
            disk_used=200000000000,
            network_in_bytes=1000000,
            network_out_bytes=500000,
            load_avg_1=1.5,
            load_avg_5=1.2,
            load_avg_15=1.0
        )
        
        assert metrics.cpu_usage == 50.0
        assert metrics.memory_usage == 60.0
        
    def test_to_metric_points(self):
        """Test converting to metric points"""
        metrics = SystemMetrics(
            cpu_usage=50.0,
            cpu_count=4,
            memory_usage=60.0,
            memory_total=16000000000,
            memory_used=9600000000,
            disk_usage=40.0,
            disk_total=500000000000,
            disk_used=200000000000,
            network_in_bytes=1000000,
            network_out_bytes=500000,
            load_avg_1=1.5,
            load_avg_5=1.2,
            load_avg_15=1.0
        )
        
        points = metrics.to_metric_points()
        assert len(points) == 13
        
        # Check CPU metric
        cpu_point = next(p for p in points if p.name == "system.cpu.usage")
        assert cpu_point.value == 50.0


class TestMemoryStorage:
    """Test MemoryStorage class"""
    
    @pytest.fixture
    def storage(self):
        return MemoryStorage(max_points=100)
        
    @pytest.mark.asyncio
    async def test_store_metrics(self, storage):
        """Test storing metrics"""
        metrics = [
            MetricPoint("test.metric", 42.0),
            MetricPoint("test.metric2", 100.0)
        ]
        
        result = await storage.store(metrics)
        assert result is True
        
    @pytest.mark.asyncio
    async def test_query_metrics(self, storage):
        """Test querying metrics"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 42.0, timestamp=now - 10),
            MetricPoint("test.metric", 50.0, timestamp=now - 5),
            MetricPoint("test.metric", 60.0, timestamp=now)
        ]
        
        await storage.store(metrics)
        
        results = await storage.query("test.metric", now - 15, now)
        assert len(results) == 3
        
    @pytest.mark.asyncio
    async def test_get_latest(self, storage):
        """Test getting latest metric"""
        metrics = [
            MetricPoint("test.metric", 42.0),
            MetricPoint("test.metric", 50.0)
        ]
        
        await storage.store(metrics)
        
        latest = await storage.get_latest("test.metric")
        assert latest["value"] == 50.0
        
    @pytest.mark.asyncio
    async def test_aggregate(self, storage):
        """Test aggregating metrics"""
        now = time.time()
        metrics = [
            MetricPoint("test.metric", 10.0, timestamp=now - 60),
            MetricPoint("test.metric", 20.0, timestamp=now - 30),
            MetricPoint("test.metric", 30.0, timestamp=now)
        ]
        
        await storage.store(metrics)
        
        aggregated = await storage.aggregate("test.metric", now - 120, now, 60)
        assert len(aggregated) > 0
        assert aggregated[0]["count"] > 0


class TestScalingEngine:
    """Test ScalingEngine class"""
    
    @pytest.fixture
    def storage(self):
        storage = MemoryStorage()
        return storage
        
    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            rules=[
                {
                    "name": "cpu_scale",
                    "metric": "system.cpu.usage",
                    "metric_type": "average",
                    "window_seconds": 60,
                    "scale_up_threshold": 70,
                    "scale_down_threshold": 30,
                    "scale_up_step": 2,
                    "scale_down_step": 1,
                    "enabled": True
                }
            ],
            min_instances=2,
            max_instances=10
        )
        
    def test_initial_status(self, engine):
        """Test initial scaling status"""
        status = engine.get_status()
        assert status["current_instances"] == 2
        assert status["min_instances"] == 2
        assert status["max_instances"] == 10
        
    @pytest.mark.asyncio
    async def test_manual_scale(self, engine):
        """Test manual scaling"""
        result = await engine.manual_scale(5, "Test scale")
        assert result["to_instances"] == 5
        assert engine.current_instances == 5
        
    @pytest.mark.asyncio
    async def test_scale_limits(self, engine):
        """Test scaling limits"""
        # Try to scale beyond max
        await engine.manual_scale(20)
        assert engine.current_instances == 10  # max_instances
        
        # Try to scale below min
        await engine.manual_scale(0)
        assert engine.current_instances == 2  # min_instances


class TestAlertManager:
    """Test AlertManager class"""
    
    @pytest.fixture
    def storage(self):
        return MemoryStorage()
        
    @pytest.fixture
    def alert_manager(self, storage):
        return AlertManager(
            storage=storage,
            rules=[
                {
                    "name": "high_cpu",
                    "metric": "system.cpu.usage",
                    "condition": "greater_than",
                    "threshold": 80,
                    "duration_seconds": 60,
                    "level": "warning",
                    "message": "CPU usage is high: {{value}}%",
                    "channels": ["log"],
                    "enabled": True
                }
            ],
            channels={"log": {}},
            default_channels=["log"]
        )
        
    def test_add_rule(self, alert_manager):
        """Test adding alert rule"""
        alert_manager.add_rule({
            "name": "high_memory",
            "metric": "system.memory.usage",
            "condition": "greater_than",
            "threshold": 90,
            "duration_seconds": 60,
            "level": "critical",
            "message": "Memory usage is high",
            "channels": ["log"],
            "enabled": True
        })
        
        assert len(alert_manager.rules) == 2
        
    def test_remove_rule(self, alert_manager):
        """Test removing alert rule"""
        alert_manager.remove_rule("high_cpu")
        assert len(alert_manager.rules) == 0
        
    @pytest.mark.asyncio
    async def test_evaluate_rule(self, alert_manager, storage):
        """Test evaluating alert rule"""
        # Add some metrics
        now = time.time()
        await storage.store([
            MetricPoint("system.cpu.usage", 85.0, timestamp=now - 30),
            MetricPoint("system.cpu.usage", 90.0, timestamp=now - 10),
            MetricPoint("system.cpu.usage", 88.0, timestamp=now)
        ])
        
        await alert_manager.evaluate_rules()
        
        active_alerts = alert_manager.get_active_alerts()
        assert len(active_alerts) == 1
        assert active_alerts[0]["rule_name"] == "high_cpu"


class TestBusinessCollector:
    """Test BusinessCollector class"""
    
    def test_increment_counter(self):
        """Test incrementing counter"""
        collector = BusinessCollector()
        collector.increment_counter("orders", 1)
        collector.increment_counter("orders", 1)
        
        assert "orders" in collector._counters
        assert collector._counters["orders"] == 2
        
    def test_set_gauge(self):
        """Test setting gauge"""
        collector = BusinessCollector()
        collector.set_gauge("active_users", 42)
        
        assert collector._gauges["active_users"] == 42
        
    def test_record_histogram(self):
        """Test recording histogram"""
        collector = BusinessCollector()
        collector.record_histogram("response_time", 100)
        collector.record_histogram("response_time", 200)
        collector.record_histogram("response_time", 150)
        
        assert len(collector._histograms["response_time"]) == 3
        
    @pytest.mark.asyncio
    async def test_collect(self):
        """Test collecting metrics"""
        collector = BusinessCollector()
        collector.increment_counter("orders", 5)
        collector.set_gauge("active_users", 42)
        collector.record_histogram("latency", 100)
        collector.record_histogram("latency", 200)
        
        metrics = await collector.collect()
        
        # Should have metrics for orders, active_users, and latency statistics
        assert len(metrics) > 0


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
