"""
Tests for Alert System - AlertManager, AlertAggregator, and notification channels
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.alerts import AlertManager, AlertAggregator, AlertLevel, AlertChannel
from src import Alert, MetricPoint


class TestAlertAggregator:
    """Test AlertAggregator class"""

    def test_init(self):
        """Test aggregator initialization"""
        aggregator = AlertAggregator(window_seconds=300, max_alerts=10)
        assert aggregator.window_seconds == 300
        assert aggregator.max_alerts == 10
        assert aggregator._alerts == {}

    def test_add_alert_within_limit(self):
        """Test adding alert within rate limit"""
        aggregator = AlertAggregator(window_seconds=300, max_alerts=10)

        alert = {
            "rule_name": "test_rule",
            "value": 85.0,
            "fired_at": time.time()
        }

        result = aggregator.add_alert(alert)
        assert result is True
        assert "test_rule" in aggregator._alerts
        assert len(aggregator._alerts["test_rule"]) == 1

    def test_add_alert_exceeds_limit(self):
        """Test adding alert that exceeds rate limit"""
        aggregator = AlertAggregator(window_seconds=300, max_alerts=2)

        # Add alerts up to limit
        for i in range(2):
            alert = {
                "rule_name": "test_rule",
                "value": 85.0 + i,
                "fired_at": time.time()
            }
            aggregator.add_alert(alert)

        # Third alert should be rate limited
        alert = {
            "rule_name": "test_rule",
            "value": 87.0,
            "fired_at": time.time()
        }
        result = aggregator.add_alert(alert)
        assert result is False

    def test_add_alert_cleans_old(self):
        """Test that old alerts are cleaned up"""
        aggregator = AlertAggregator(window_seconds=60, max_alerts=10)

        now = time.time()

        # Add old alert
        old_alert = {
            "rule_name": "test_rule",
            "value": 80.0,
            "fired_at": now - 120  # 2 minutes ago
        }
        aggregator.add_alert(old_alert)

        # Add new alert
        new_alert = {
            "rule_name": "test_rule",
            "value": 85.0,
            "fired_at": now
        }
        aggregator.add_alert(new_alert)

        # Old alert should be cleaned
        assert len(aggregator._alerts["test_rule"]) == 1
        assert aggregator._alerts["test_rule"][0]["value"] == 85.0

    def test_get_summary(self):
        """Test getting alert summary"""
        aggregator = AlertAggregator(window_seconds=300, max_alerts=10)

        now = time.time()
        alerts = [
            {"rule_name": "test_rule", "value": 80.0, "fired_at": now - 10},
            {"rule_name": "test_rule", "value": 85.0, "fired_at": now - 5},
            {"rule_name": "test_rule", "value": 90.0, "fired_at": now},
        ]

        for alert in alerts:
            aggregator.add_alert(alert)

        summary = aggregator.get_summary("test_rule")
        assert summary is not None
        assert summary["rule_name"] == "test_rule"
        assert summary["count"] == 3
        assert summary["min_value"] == 80.0
        assert summary["max_value"] == 90.0
        assert summary["avg_value"] == 85.0

    def test_get_summary_no_alerts(self):
        """Test getting summary when no alerts exist"""
        aggregator = AlertAggregator()
        summary = aggregator.get_summary("nonexistent_rule")
        assert summary is None


class TestAlertManagerSuppression:
    """Test AlertManager suppression windows"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def alert_manager(self, storage):
        return AlertManager(
            storage=storage,
            rules=[],
            channels={"log": {}},
            default_channels=["log"]
        )

    def test_no_suppression_by_default(self, alert_manager):
        """Test that alerts are not suppressed by default"""
        assert alert_manager._is_suppressed() is False

    def test_suppression_window_active(self, alert_manager):
        """Test suppression window when active"""
        from datetime import datetime

        now = datetime.now()
        start_time = (now.hour - 1) % 24
        end_time = (now.hour + 1) % 24

        alert_manager.set_suppression_windows([
            {
                "start": f"{start_time:02d}:00",
                "end": f"{end_time:02d}:00",
                "days": [now.strftime("%A")]
            }
        ])

        assert alert_manager._is_suppressed() is True

    def test_suppression_window_inactive_time(self, alert_manager):
        """Test suppression window when time is outside window"""
        alert_manager.set_suppression_windows([
            {
                "start": "02:00",
                "end": "04:00",
                "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            }
        ])

        # Assuming current time is not between 02:00-04:00
        assert alert_manager._is_suppressed() is False

    def test_suppression_window_inactive_day(self, alert_manager):
        """Test suppression window when day doesn't match"""
        from datetime import datetime

        now = datetime.now()
        start_time = (now.hour - 1) % 24
        end_time = (now.hour + 1) % 24

        # Set wrong day
        wrong_day = "Monday" if now.strftime("%A") != "Monday" else "Tuesday"

        alert_manager.set_suppression_windows([
            {
                "start": f"{start_time:02d}:00",
                "end": f"{end_time:02d}:00",
                "days": [wrong_day]
            }
        ])

        assert alert_manager._is_suppressed() is False


class TestAlertManagerNotifications:
    """Test AlertManager notification channels"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def alert_manager(self, storage):
        return AlertManager(
            storage=storage,
            rules=[],
            channels={
                "webhook": {"url": "http://example.com/webhook"},
                "email": {
                    "smtp_host": "smtp.example.com",
                    "smtp_port": 587,
                    "smtp_user": "test@example.com",
                    "smtp_password": "password",
                    "from_address": "alerts@example.com",
                    "to_addresses": ["admin@example.com"]
                }
            },
            default_channels=["log"]
        )

    @pytest.mark.asyncio
    async def test_send_webhook_success(self, alert_manager):
        """Test successful webhook notification"""
        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=85.0,
            threshold=80.0,
            level=AlertLevel.WARNING,
            message="Test alert",
            status="firing",
            fired_at=time.time()
        )

        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock()

            mock_post = AsyncMock(return_value=mock_response)
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock()

            mock_session_instance = MagicMock()
            mock_session_instance.post = mock_post
            mock_session_instance.__aenter__ = AsyncMock(return_value=mock_session_instance)
            mock_session_instance.__aexit__ = AsyncMock()

            mock_session.return_value = mock_session_instance

            await alert_manager._send_webhook(alert)
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_webhook_no_url(self, alert_manager):
        """Test webhook notification when URL not configured"""
        alert_manager.channels["webhook"] = {}

        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=85.0,
            threshold=80.0,
            level=AlertLevel.WARNING,
            message="Test alert",
            status="firing",
            fired_at=time.time()
        )

        # Should not raise exception, just log warning
        await alert_manager._send_webhook(alert)

    @pytest.mark.asyncio
    async def test_send_email_success(self, alert_manager):
        """Test successful email notification"""
        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=85.0,
            threshold=80.0,
            level=AlertLevel.WARNING,
            message="Test alert",
            status="firing",
            fired_at=time.time()
        )

        with patch('smtplib.SMTP') as mock_smtp:
            mock_server = MagicMock()
            mock_smtp.return_value.__enter__ = MagicMock(return_value=mock_server)
            mock_smtp.return_value.__exit__ = MagicMock(return_value=False)

            await alert_manager._send_email(alert)
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once()
            mock_server.sendmail.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_email_incomplete_config(self, alert_manager):
        """Test email notification with incomplete configuration"""
        alert_manager.channels["email"] = {}

        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=85.0,
            threshold=80.0,
            level=AlertLevel.WARNING,
            message="Test alert",
            status="firing",
            fired_at=time.time()
        )

        # Should not raise exception, just log warning
        await alert_manager._send_email(alert)

    def test_log_alert_critical(self, alert_manager):
        """Test logging critical alert"""
        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=95.0,
            threshold=90.0,
            level=AlertLevel.CRITICAL,
            message="Critical alert",
            status="firing",
            fired_at=time.time()
        )

        with patch('src.alerts.logger.critical') as mock_log:
            alert_manager._log_alert(alert)
            mock_log.assert_called_once()

    def test_log_alert_warning(self, alert_manager):
        """Test logging warning alert"""
        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=85.0,
            threshold=80.0,
            level=AlertLevel.WARNING,
            message="Warning alert",
            status="firing",
            fired_at=time.time()
        )

        with patch('src.alerts.logger.warning') as mock_log:
            alert_manager._log_alert(alert)
            mock_log.assert_called_once()

    def test_log_alert_info(self, alert_manager):
        """Test logging info alert"""
        alert = Alert(
            id="test-id",
            rule_name="test_rule",
            metric="test.metric",
            value=75.0,
            threshold=70.0,
            level=AlertLevel.INFO,
            message="Info alert",
            status="firing",
            fired_at=time.time()
        )

        with patch('src.alerts.logger.info') as mock_log:
            alert_manager._log_alert(alert)
            mock_log.assert_called_once()


class TestAlertManagerLifecycle:
    """Test AlertManager lifecycle methods"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def alert_manager(self, storage):
        return AlertManager(
            storage=storage,
            rules=[],
            channels={"log": {}},
            default_channels=["log"]
        )

    @pytest.mark.asyncio
    async def test_start_stop(self, alert_manager):
        """Test starting and stopping alert manager"""
        assert alert_manager._running is False

        await alert_manager.start()
        assert alert_manager._running is True
        assert alert_manager._task is not None

        await alert_manager.stop()
        assert alert_manager._running is False

    @pytest.mark.asyncio
    async def test_start_when_already_running(self, alert_manager):
        """Test starting when already running"""
        await alert_manager.start()
        task = alert_manager._task

        # Start again - should not create new task
        await alert_manager.start()
        assert alert_manager._task == task

        await alert_manager.stop()


class TestAlertManagerAcknowledgment:
    """Test alert acknowledgment functionality"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def alert_manager(self, storage):
        return AlertManager(
            storage=storage,
            rules=[],
            channels={"log": {}},
            default_channels=["log"]
        )

    @pytest.mark.asyncio
    async def test_acknowledge_alert_success(self, alert_manager):
        """Test acknowledging an existing alert"""
        alert_id = "test-alert-id"
        alert_manager._active_alerts["test_rule"] = {
            "id": alert_id,
            "rule_name": "test_rule",
            "status": "firing"
        }

        result = await alert_manager.acknowledge_alert(alert_id)
        assert result is True
        assert alert_manager._active_alerts["test_rule"]["acknowledged"] is True
        assert "acknowledged_at" in alert_manager._active_alerts["test_rule"]

    @pytest.mark.asyncio
    async def test_acknowledge_alert_not_found(self, alert_manager):
        """Test acknowledging non-existent alert"""
        result = await alert_manager.acknowledge_alert("nonexistent-id")
        assert result is False

    def test_get_alert_by_id(self, alert_manager):
        """Test getting alert by ID"""
        alert_id = "test-alert-id"
        alert_manager._active_alerts["test_rule"] = {
            "id": alert_id,
            "rule_name": "test_rule",
            "status": "firing"
        }

        alert = alert_manager.get_alert(alert_id)
        assert alert is not None
        assert alert["id"] == alert_id

    def test_get_alert_not_found(self, alert_manager):
        """Test getting non-existent alert"""
        alert = alert_manager.get_alert("nonexistent-id")
        assert alert is None


class TestAlertManagerMessageFormatting:
    """Test alert message formatting"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def alert_manager(self, storage):
        return AlertManager(
            storage=storage,
            rules=[],
            channels={"log": {}},
            default_channels=["log"]
        )

    def test_format_message_with_placeholders(self, alert_manager):
        """Test formatting message with value and threshold placeholders"""
        template = "CPU usage is {{value}}%, threshold is {{threshold}}%"
        message = alert_manager._format_message(template, 85.5, 80.0)

        assert "85.50" in message
        assert "80.00" in message

    def test_format_message_no_placeholders(self, alert_manager):
        """Test formatting message without placeholders"""
        template = "Simple alert message"
        message = alert_manager._format_message(template, 85.5, 80.0)

        assert message == template

    def test_format_message_partial_placeholders(self, alert_manager):
        """Test formatting message with only value placeholder"""
        template = "Value is {{value}}%"
        message = alert_manager._format_message(template, 85.5, 80.0)

        assert "85.50" in message
        assert "threshold" not in message.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])