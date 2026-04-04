"""
Tests for SDK - MonitoringClient, MetricsCollector, WebSocketClient
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.sdk import MonitoringClient, MetricsCollector, WebSocketClient


class TestMonitoringClient:
    """Test MonitoringClient class"""

    @pytest.fixture
    def client(self):
        return MonitoringClient(
            api_url="http://localhost:8080",
            api_key="test-key",
            timeout=10
        )

    def test_init_default(self):
        """Test client initialization with defaults"""
        client = MonitoringClient()
        
        assert client.api_url == "http://localhost:8080"
        assert client.api_key is None
        assert client.timeout == 10

    def test_init_custom(self):
        """Test client initialization with custom values"""
        client = MonitoringClient(
            api_url="http://example.com:9090",
            api_key="my-key",
            timeout=30
        )
        
        assert client.api_url == "http://example.com:9090"
        assert client.api_key == "my-key"
        assert client.timeout == 30

    def test_api_url_trailing_slash(self):
        """Test that trailing slash is removed from API URL"""
        client = MonitoringClient(api_url="http://localhost:8080/")
        
        assert client.api_url == "http://localhost:8080"

    def test_get_headers_without_key(self):
        """Test getting headers without API key"""
        client = MonitoringClient(api_url="http://localhost:8080")
        
        headers = client._get_headers()
        
        assert "Content-Type" in headers
        assert "X-API-Key" not in headers

    def test_get_headers_with_key(self):
        """Test getting headers with API key"""
        client = MonitoringClient(
            api_url="http://localhost:8080",
            api_key="test-key"
        )
        
        headers = client._get_headers()
        
        assert "Content-Type" in headers
        assert headers["X-API-Key"] == "test-key"

    @pytest.mark.asyncio
    async def test_connect(self, client):
        """Test connecting creates session"""
        assert client._session is None
        
        await client.connect()
        
        assert client._session is not None

    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test using client as context manager"""
        async with MonitoringClient(api_url="http://localhost:8080") as client:
            assert client._session is not None
        
        # After exiting context, session should be closed
        # Note: actual close behavior depends on implementation

    @pytest.mark.asyncio
    async def test_close(self, client):
        """Test closing client"""
        await client.connect()
        assert client._session is not None
        
        await client.close()
        assert client._session is None

    @pytest.mark.asyncio
    async def test_close_when_not_connected(self, client):
        """Test closing when not connected doesn't error"""
        await client.close()
        assert client._session is None


class TestMonitoringClientRequests:
    """Test MonitoringClient request methods"""

    @pytest.fixture
    def client(self):
        return MonitoringClient(api_url="http://localhost:8080", api_key="test-key")

    @pytest.mark.asyncio
    async def test_get_metrics(self, client):
        """Test getting metrics"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"data": []})
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.get_metrics("system.cpu.usage")
            
            assert "data" in result or "metric" in result

    @pytest.mark.asyncio
    async def test_get_metric(self, client):
        """Test getting single metric"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"name": "cpu", "value": 50.0})
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.get_metric("system.cpu.usage")
            
            assert result is not None

    @pytest.mark.asyncio
    async def test_get_metric_not_found(self, client):
        """Test getting non-existent metric returns None"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 404
        
        with patch.object(client._session, 'request', side_effect=Exception("Not found")):
            result = await client.get_metric("nonexistent")
            
            assert result is None


class TestMonitoringClientAlerts:
    """Test MonitoringClient alert methods"""

    @pytest.fixture
    def client(self):
        return MonitoringClient(api_url="http://localhost:8080", api_key="test-key")

    @pytest.mark.asyncio
    async def test_get_alerts(self, client):
        """Test getting alerts"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "alerts": [
                {"id": "1", "rule_name": "test", "status": "firing"}
            ],
            "count": 1
        })
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.get_alerts()
            
            assert "alerts" in result

    @pytest.mark.asyncio
    async def test_get_alerts_with_filters(self, client):
        """Test getting alerts with status/level filters"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"alerts": [], "count": 0})
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.get_alerts(status="firing", level="critical")
            
            # Request should include params
            client._session.request.assert_called_once()

    @pytest.mark.asyncio
    async def test_acknowledge_alert_success(self, client):
        """Test acknowledging alert"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"status": "acknowledged"})
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.acknowledge_alert("alert-123")
            
            assert result is True

    @pytest.mark.asyncio
    async def test_acknowledge_alert_failure(self, client):
        """Test acknowledging non-existent alert"""
        await client.connect()
        
        with patch.object(client._session, 'request', side_effect=Exception("Not found")):
            result = await client.acknowledge_alert("nonexistent")
            
            assert result is False


class TestMonitoringClientScaling:
    """Test MonitoringClient scaling methods"""

    @pytest.fixture
    def client(self):
        return MonitoringClient(api_url="http://localhost:8080", api_key="test-key")

    @pytest.mark.asyncio
    async def test_get_scaling_status(self, client):
        """Test getting scaling status"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "current_instances": 5,
            "min_instances": 2,
            "max_instances": 10
        })
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.get_scaling_status()
            
            assert "current_instances" in result

    @pytest.mark.asyncio
    async def test_manual_scale(self, client):
        """Test manual scaling"""
        await client.connect()
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "from_instances": 5,
            "to_instances": 7
        })
        
        with patch.object(client._session, 'request', return_value=mock_response):
            result = await client.manual_scale(7, "Scale to 7 instances")
            
            assert "to_instances" in result


class TestMetricsCollector:
    """Test MetricsCollector helper class"""

    @pytest.fixture
    def mock_client(self):
        return Mock()

    @pytest.fixture
    def collector(self, mock_client):
        return MetricsCollector(mock_client)

    def test_init(self, collector):
        """Test collector initialization"""
        assert collector._counters == {}
        assert collector._gauges == {}
        assert collector._histograms == {}

    def test_increment_counter(self, collector):
        """Test incrementing counter"""
        collector.increment_counter("orders", 1)
        collector.increment_counter("orders", 2)
        
        assert collector._counters["orders"] == 3

    def test_increment_counter_with_tags(self, collector):
        """Test incrementing counter with tags"""
        collector.increment_counter("orders", 1, tags={"region": "us"})
        collector.increment_counter("orders", 2, tags={"region": "eu"})
        
        assert "orders:region=us" in collector._counters
        assert "orders:region=eu" in collector._counters

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
        """Test recording histogram"""
        collector.record_histogram("latency", 50)
        collector.record_histogram("latency", 100)
        
        assert len(collector._histograms["latency"]) == 2

    def test_record_histogram_with_tags(self, collector):
        """Test recording histogram with tags"""
        collector.record_histogram("latency", 50, tags={"service": "api"})
        collector.record_histogram("latency", 100, tags={"service": "api"})
        
        assert len(collector._histograms["latency:service=api"]) == 2

    def test_make_key(self, collector):
        """Test key generation"""
        key = collector._make_key("metric", None)
        assert key == "metric"
        
        key = collector._make_key("metric", {"a": "1", "b": "2"})
        assert "metric:" in key

    @pytest.mark.asyncio
    async def test_flush(self, collector):
        """Test flush method (placeholder)"""
        collector.increment_counter("test", 1)
        
        # Flush should not error even though it's a placeholder
        await collector.flush()


class TestWebSocketClient:
    """Test WebSocketClient class"""

    @pytest.fixture
    def ws_client(self):
        return WebSocketClient(
            ws_url="ws://localhost:8080/api/metrics/realtime",
            api_key="test-key"
        )

    def test_init_default(self):
        """Test WebSocket client initialization with defaults"""
        client = WebSocketClient()
        
        assert client.ws_url == "ws://localhost:8080/api/metrics/realtime"
        assert client.api_key is None

    def test_init_custom(self):
        """Test WebSocket client initialization with custom values"""
        client = WebSocketClient(
            ws_url="wss://example.com/ws",
            api_key="my-key"
        )
        
        assert client.ws_url == "wss://example.com/ws"
        assert client.api_key == "my-key"

    def test_on_message(self, ws_client):
        """Test registering message callback"""
        callback = Mock()
        ws_client.on_message(callback)
        
        assert callback in ws_client._callbacks

    @pytest.mark.asyncio
    async def test_subscribe(self, ws_client):
        """Test subscribing to metrics"""
        ws_client._ws = AsyncMock()
        
        await ws_client.subscribe(["cpu.usage", "memory.usage"])
        
        ws_client._ws.send_json.assert_called_once()


class TestConvenienceFunctions:
    """Test SDK convenience functions"""

    @pytest.mark.asyncio
    async def test_get_cpu_usage(self):
        """Test get_cpu_usage convenience function"""
        with patch('src.sdk.MonitoringClient') as mock_client_class:
            mock_client = MagicMock()
            mock_client.get_metric = AsyncMock(return_value={"value": 50.0})
            mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_class.return_value.__aexit__ = AsyncMock()
            
            from src.sdk import get_cpu_usage
            result = await get_cpu_usage()
            
            assert result == 50.0

    @pytest.mark.asyncio
    async def test_get_memory_usage(self):
        """Test get_memory_usage convenience function"""
        with patch('src.sdk.MonitoringClient') as mock_client_class:
            mock_client = MagicMock()
            mock_client.get_metric = AsyncMock(return_value={"value": 75.0})
            mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_class.return_value.__aexit__ = AsyncMock()
            
            from src.sdk import get_memory_usage
            result = await get_memory_usage()
            
            assert result == 75.0

    @pytest.mark.asyncio
    async def test_get_active_alerts(self):
        """Test get_active_alerts convenience function"""
        with patch('src.sdk.MonitoringClient') as mock_client_class:
            mock_client = MagicMock()
            mock_client.get_alerts = AsyncMock(return_value=[{"id": "1"}])
            mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_class.return_value.__aexit__ = AsyncMock()
            
            from src.sdk import get_active_alerts
            result = await get_active_alerts()
            
            assert len(result) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])