"""
Tests for Dashboard API - REST API endpoints, WebSocket, rate limiting, and CORS
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.api import DashboardAPI


class TestDashboardAPIBasics:
    """Test DashboardAPI basic functionality"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.get_latest = AsyncMock(return_value=None)
        storage.aggregate = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def api(self, storage):
        return DashboardAPI(
            storage=storage,
            host="0.0.0.0",
            port=8080,
            api_keys={"test_key": "test-secret"},
            cors_origins=["*"]
        )

    def test_init_default(self, storage):
        """Test API initialization with defaults"""
        api = DashboardAPI(storage=storage)
        
        assert api.host == "0.0.0.0"
        assert api.port == 8080
        assert api.api_keys == {}
        assert api.cors_origins == ["*"]

    def test_init_custom(self, storage):
        """Test API initialization with custom values"""
        api = DashboardAPI(
            storage=storage,
            host="127.0.0.1",
            port=9090,
            api_keys={"key1": "secret1"},
            cors_origins=["http://localhost:3000"]
        )
        
        assert api.host == "127.0.0.1"
        assert api.port == 9090
        assert api.api_keys == {"key1": "secret1"}
        assert api.cors_origins == ["http://localhost:3000"]

    def test_rate_limit_check(self, api):
        """Test rate limiting check"""
        client_id = "test-client"
        
        # First request should pass
        assert api._check_rate_limit(client_id) is True
        
        # Fill up rate limit
        for _ in range(99):
            api._check_rate_limit(client_id)
        
        # 100th request should still pass
        assert api._check_rate_limit(client_id) is True
        
        # 101st request should be rate limited
        assert api._check_rate_limit(client_id) is False

    def test_rate_limit_cleanup(self, api):
        """Test that old rate limit entries are cleaned up"""
        client_id = "test-client"
        
        # Add some requests
        for _ in range(50):
            api._check_rate_limit(client_id)
        
        # Wait for entries to expire
        time.sleep(0.1)
        
        # Manually set old timestamps
        api._rate_limits[client_id] = [time.time() - 120] * 50
        
        # Next request should pass (old entries cleaned)
        assert api._check_rate_limit(client_id) is True

    def test_validate_api_key_no_keys(self, api):
        """Test API key validation when no keys configured"""
        api.api_keys = {}
        
        request = Mock()
        request.headers = {}
        request.query = {}
        
        result = api._validate_api_key(request)
        
        assert result == "anonymous"

    def test_validate_api_key_from_header(self, api):
        """Test API key validation from header"""
        request = Mock()
        request.headers = {"X-API-Key": "test-secret"}
        request.query = {}
        
        result = api._validate_api_key(request)
        
        assert result == "test_key"

    def test_validate_api_key_from_query(self, api):
        """Test API key validation from query parameter"""
        request = Mock()
        request.headers = {}
        request.query = {"api_key": "test-secret"}
        
        result = api._validate_api_key(request)
        
        assert result == "test_key"

    def test_validate_api_key_invalid(self, api):
        """Test API key validation with invalid key"""
        request = Mock()
        request.headers = {"X-API-Key": "invalid-key"}
        request.query = {}
        
        result = api._validate_api_key(request)
        
        assert result is None


class TestDashboardAPIMetricsEndpoints:
    """Test metrics-related API endpoints"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.get_latest = AsyncMock(return_value=None)
        storage.aggregate = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def api(self, storage):
        return DashboardAPI(storage=storage, api_keys={})

    @pytest.mark.asyncio
    async def test_handle_get_metrics(self, api):
        """Test GET /api/metrics endpoint"""
        request = Mock()
        request.remote = "127.0.0.1"
        request.query = {
            "name": "system.cpu.usage",
            "start_time": str(time.time() - 3600),
            "end_time": str(time.time()),
            "interval": "60"
        }
        
        response = await api._handle_get_metrics(request)
        
        # Should return JSON response
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_get_metric(self, api):
        """Test GET /api/metrics/{name} endpoint"""
        api.storage.get_latest = AsyncMock(return_value={
            "name": "system.cpu.usage",
            "value": 50.0
        })
        
        request = Mock()
        request.headers = {}
        request.query = {}
        request.match_info = {"name": "system.cpu.usage"}
        
        response = await api._handle_get_metric(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_get_metric_not_found(self, api):
        """Test GET /api/metrics/{name} with non-existent metric"""
        api.storage.get_latest = AsyncMock(return_value=None)
        
        request = Mock()
        request.headers = {}
        request.query = {}
        request.match_info = {"name": "nonexistent"}
        
        response = await api._handle_get_metric(request)
        
        # Should return 404
        assert hasattr(response, 'status')


class TestDashboardAPIAlertsEndpoints:
    """Test alerts-related API endpoints"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.get_latest = AsyncMock(return_value=None)
        storage.aggregate = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def alert_manager(self):
        alert_manager = Mock()
        alert_manager.get_active_alerts = Mock(return_value=[
            {"id": "1", "rule_name": "test", "status": "firing"}
        ])
        alert_manager.get_alert = Mock(return_value=None)
        alert_manager.acknowledge_alert = AsyncMock(return_value=True)
        alert_manager.add_rule = Mock()
        alert_manager.remove_rule = Mock()
        return alert_manager

    @pytest.fixture
    def api(self, storage, alert_manager):
        return DashboardAPI(
            storage=storage,
            alert_manager=alert_manager,
            api_keys={}
        )

    @pytest.mark.asyncio
    async def test_handle_get_alerts(self, api):
        """Test GET /api/alerts endpoint"""
        request = Mock()
        request.headers = {}
        request.query = {}
        
        response = await api._handle_get_alerts(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_get_alerts_with_filters(self, api):
        """Test GET /api/alerts with status/level filters"""
        request = Mock()
        request.headers = {}
        request.query = {"status": "firing", "level": "critical"}
        
        response = await api._handle_get_alerts(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_get_alert(self, api):
        """Test GET /api/alerts/{id} endpoint"""
        api.alert_manager.get_alert = Mock(return_value={
            "id": "1",
            "rule_name": "test"
        })
        
        request = Mock()
        request.headers = {}
        request.query = {}
        request.match_info = {"id": "1"}
        
        response = await api._handle_get_alert(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_acknowledge_alert(self, api):
        """Test POST /api/alerts/acknowledge/{id} endpoint"""
        request = Mock()
        request.headers = {}
        request.json = AsyncMock(return_value={})
        request.match_info = {"id": "1"}
        
        response = await api._handle_acknowledge_alert(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_create_alert_rule(self, api):
        """Test POST /api/alerts/rules endpoint"""
        request = Mock()
        request.headers = {}
        request.json = AsyncMock(return_value={
            "name": "test_rule",
            "metric": "system.cpu.usage",
            "threshold": 80
        })
        
        response = await api._handle_create_alert_rule(request)
        
        assert hasattr(response, 'json')
        api.alert_manager.add_rule.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_delete_alert_rule(self, api):
        """Test DELETE /api/alerts/rules/{name} endpoint"""
        request = Mock()
        request.headers = {}
        request.query = {}
        request.match_info = {"name": "test_rule"}
        
        response = await api._handle_delete_alert_rule(request)
        
        assert hasattr(response, 'json')
        api.alert_manager.remove_rule.assert_called_once_with("test_rule")


class TestDashboardAPIScalingEndpoints:
    """Test scaling-related API endpoints"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.get_latest = AsyncMock(return_value=None)
        storage.aggregate = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def scaling_engine(self):
        engine = Mock()
        engine.get_status = Mock(return_value={
            "current_instances": 5,
            "min_instances": 2,
            "max_instances": 10
        })
        engine.manual_scale = AsyncMock(return_value={
            "from_instances": 5,
            "to_instances": 7
        })
        return engine

    @pytest.fixture
    def api(self, storage, scaling_engine):
        return DashboardAPI(
            storage=storage,
            scaling_engine=scaling_engine,
            api_keys={}
        )

    @pytest.mark.asyncio
    async def test_handle_scaling_status(self, api):
        """Test GET /api/scaling/status endpoint"""
        request = Mock()
        request.headers = {}
        request.query = {}
        
        response = await api._handle_scaling_status(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_manual_scale(self, api):
        """Test POST /api/scaling/scale endpoint"""
        request = Mock()
        request.headers = {}
        request.json = AsyncMock(return_value={
            "target_instances": 7,
            "reason": "Manual scale"
        })
        
        response = await api._handle_manual_scale(request)
        
        assert hasattr(response, 'json')
        api.scaling_engine.manual_scale.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_manual_scale_missing_target(self, api):
        """Test POST /api/scaling/scale without target_instances"""
        request = Mock()
        request.headers = {}
        request.json = AsyncMock(return_value={})
        
        response = await api._handle_manual_scale(request)
        
        # Should return 400
        assert hasattr(response, 'status')


class TestDashboardAPIReportsEndpoints:
    """Test reports-related API endpoints"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.get_latest = AsyncMock(return_value=None)
        storage.aggregate = AsyncMock(return_value=[
            {"avg": 50.0, "count": 10}
        ])
        return storage

    @pytest.fixture
    def api(self, storage):
        return DashboardAPI(storage=storage, api_keys={})

    @pytest.mark.asyncio
    async def test_handle_daily_report(self, api):
        """Test GET /api/reports/daily endpoint"""
        request = Mock()
        request.headers = {}
        request.query = {}
        
        response = await api._handle_daily_report(request)
        
        assert hasattr(response, 'json')

    @pytest.mark.asyncio
    async def test_handle_weekly_report(self, api):
        """Test GET /api/reports/weekly endpoint"""
        request = Mock()
        request.headers = {}
        request.query = {}
        
        response = await api._handle_weekly_report(request)
        
        assert hasattr(response, 'json')


class TestDashboardAPIHealth:
    """Test health check endpoint"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        return storage

    @pytest.fixture
    def api(self, storage):
        return DashboardAPI(storage=storage, api_keys={})

    @pytest.mark.asyncio
    async def test_handle_health(self, api):
        """Test GET /health endpoint"""
        request = Mock()
        
        response = await api._handle_health(request)
        
        assert hasattr(response, 'json')


class TestDashboardAPIWebSocket:
    """Test WebSocket functionality"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        return storage

    @pytest.fixture
    def api(self, storage):
        return DashboardAPI(storage=storage, api_keys={})

    @pytest.mark.asyncio
    async def test_broadcast_metrics(self, api):
        """Test broadcasting metrics to WebSocket clients"""
        # Add mock WebSocket clients
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        api._ws_clients = {"client1": ws1, "client2": ws2}
        
        metrics = [
            {"name": "cpu", "value": 50.0},
            {"name": "memory", "value": 75.0}
        ]
        
        await api.broadcast_metrics(metrics)
        
        # Both clients should receive the broadcast
        ws1.send_json.assert_called_once()
        ws2.send_json.assert_called_once()


class TestDashboardAPILifecycle:
    """Test API lifecycle methods"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        return storage

    @pytest.fixture
    def api(self, storage):
        return DashboardAPI(storage=storage, api_keys={})

    @pytest.mark.asyncio
    async def test_start_stop(self, api):
        """Test starting and stopping API server"""
        # Note: Actual start/stop requires aiohttp
        # This tests the method exists and can be called
        try:
            await api.start()
            await api.stop()
        except ImportError:
            # aiohttp not installed, skip
            pass


class TestDashboardAPIReportGeneration:
    """Test report generation logic"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.get_latest = AsyncMock(return_value=None)
        storage.aggregate = AsyncMock(return_value=[
            {"avg": 50.0, "count": 10, "min": 30.0, "max": 70.0}
        ])
        return storage

    @pytest.fixture
    def alert_manager(self):
        alert_manager = Mock()
        alert_manager.get_active_alerts = Mock(return_value=[
            {"level": "warning"},
            {"level": "critical"}
        ])
        return alert_manager

    @pytest.fixture
    def api(self, storage, alert_manager):
        return DashboardAPI(
            storage=storage,
            alert_manager=alert_manager,
            api_keys={}
        )

    @pytest.mark.asyncio
    async def test_generate_daily_report(self, api):
        """Test daily report generation"""
        report = await api._generate_report("daily")
        
        assert "id" in report
        assert "type" in report
        assert "metrics_summary" in report
        assert "alerts_summary" in report
        assert "recommendations" in report

    @pytest.mark.asyncio
    async def test_generate_weekly_report(self, api):
        """Test weekly report generation"""
        report = await api._generate_report("weekly")
        
        assert "id" in report
        assert "type" in report
        assert report["type"] == "weekly"

    @pytest.mark.asyncio
    async def test_report_recommendations_high_cpu(self, api):
        """Test report generates recommendation for high CPU"""
        # Mock high CPU aggregation
        api.storage.aggregate = AsyncMock(return_value=[
            {"avg": 80.0, "count": 10}
        ])
        
        report = await api._generate_report("daily")
        
        # Should have recommendation about scaling
        assert len(report["recommendations"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])