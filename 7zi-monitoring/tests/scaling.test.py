"""
Tests for Scaling Engine - ScalingEngine, rules evaluation, cooldown, and callbacks
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.scaling import ScalingEngine
from src import MetricPoint, MetricType, ScalingEvent, ScalingAction


class TestScalingEngineBasics:
    """Test basic ScalingEngine functionality"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            rules=[],
            min_instances=2,
            max_instances=10,
            scale_up_cooldown_seconds=60,
            scale_down_cooldown_seconds=300
        )

    def test_init_default(self, storage):
        """Test engine initialization with defaults"""
        engine = ScalingEngine(storage=storage)
        
        assert engine.min_instances == 2
        assert engine.max_instances == 20
        assert engine.current_instances == 2
        assert engine.scale_up_cooldown == 60
        assert engine.scale_down_cooldown == 300

    def test_init_custom(self, storage):
        """Test engine initialization with custom values"""
        engine = ScalingEngine(
            storage=storage,
            min_instances=5,
            max_instances=50,
            scale_up_cooldown_seconds=120,
            scale_down_cooldown_seconds=600
        )
        
        assert engine.min_instances == 5
        assert engine.max_instances == 50
        assert engine.current_instances == 5

    def test_get_status(self, engine):
        """Test getting scaling status"""
        status = engine.get_status()
        
        assert "current_instances" in status
        assert "min_instances" in status
        assert "max_instances" in status
        assert status["current_instances"] == 2

    def test_add_rule(self, engine):
        """Test adding scaling rule"""
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage",
            "scale_up_threshold": 80,
            "scale_down_threshold": 20
        }
        
        engine.add_rule(rule)
        
        assert len(engine.rules) == 1
        assert engine.rules[0]["name"] == "cpu_rule"

    def test_remove_rule(self, engine):
        """Test removing scaling rule"""
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage"
        }
        
        engine.add_rule(rule)
        engine.remove_rule("cpu_rule")
        
        assert len(engine.rules) == 0


class TestScalingEngineCooldown:
    """Test scaling cooldown functionality"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            min_instances=2,
            max_instances=10,
            scale_up_cooldown_seconds=60,
            scale_down_cooldown_seconds=300
        )

    def test_cooldown_not_applied_initially(self, engine):
        """Test that cooldown is not applied on first check"""
        remaining = engine._get_cooldown_remaining()
        assert remaining == 0

    def test_cooldown_after_scale_up(self, engine):
        """Test cooldown after scale up action"""
        engine.last_scale_time = time.time() - 30  # 30 seconds ago
        engine.last_scale_action = {"action": "scale_up"}
        
        remaining = engine._get_cooldown_remaining()
        
        # Should have 30 seconds remaining (60 - 30)
        assert remaining > 0

    def test_cooldown_after_scale_down(self, engine):
        """Test cooldown after scale down action"""
        engine.last_scale_time = time.time() - 150  # 150 seconds ago
        engine.last_scale_action = {"action": "scale_down"}
        
        remaining = engine._get_cooldown_remaining()
        
        # Should have 150 seconds remaining (300 - 150)
        assert remaining > 0

    def test_cooldown_expired(self, engine):
        """Test that cooldown expires correctly"""
        engine.last_scale_time = time.time() - 1000  # Long time ago
        engine.last_scale_action = {"action": "scale_up"}
        
        remaining = engine._get_cooldown_remaining()
        
        # Should be 0 (expired)
        assert remaining == 0

    def test_cooldown_uses_scale_up_when_action_unknown(self, engine):
        """Test cooldown uses scale_up when action is unknown"""
        engine.last_scale_time = time.time() - 30
        engine.last_scale_action = {}
        
        remaining = engine._get_cooldown_remaining()
        
        # Defaults to scale_up cooldown (60)
        assert remaining == 30


class TestScalingEngineEvaluation:
    """Test scaling rule evaluation"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            rules=[
                {
                    "name": "cpu_rule",
                    "metric": "system.cpu.usage",
                    "metric_type": "average",
                    "window_seconds": 60,
                    "scale_up_threshold": 80,
                    "scale_down_threshold": 20,
                    "scale_up_step": 2,
                    "scale_down_step": 1,
                    "enabled": True
                }
            ],
            min_instances=2,
            max_instances=10
        )

    @pytest.mark.asyncio
    async def test_evaluate_rule_trigger_scale_up(self, storage, engine):
        """Test rule evaluation triggers scale up"""
        now = time.time()
        
        # Mock storage to return high CPU values
        storage.query = AsyncMock(return_value=[
            {"value": 85.0, "timestamp": now - 30},
            {"value": 90.0, "timestamp": now - 15},
            {"value": 88.0, "timestamp": now}
        ])
        
        result = await engine._evaluate_rule(engine.rules[0])
        
        assert result is not None
        assert result["action"] == "scale_up"
        assert result["value"] >= 80

    @pytest.mark.asyncio
    async def test_evaluate_rule_trigger_scale_down(self, storage, engine):
        """Test rule evaluation triggers scale down"""
        now = time.time()
        
        # Mock storage to return low CPU values
        storage.query = AsyncMock(return_value=[
            {"value": 10.0, "timestamp": now - 30},
            {"value": 15.0, "timestamp": now - 15},
            {"value": 18.0, "timestamp": now}
        ])
        
        result = await engine._evaluate_rule(engine.rules[0])
        
        assert result is not None
        assert result["action"] == "scale_down"
        assert result["value"] <= 20

    @pytest.mark.asyncio
    async def test_evaluate_rule_no_trigger(self, storage, engine):
        """Test rule evaluation doesn't trigger when in range"""
        now = time.time()
        
        # Mock storage to return medium CPU values
        storage.query = AsyncMock(return_value=[
            {"value": 40.0, "timestamp": now - 30},
            {"value": 50.0, "timestamp": now - 15},
            {"value": 45.0, "timestamp": now}
        ])
        
        result = await engine._evaluate_rule(engine.rules[0])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_evaluate_rule_no_metrics(self, storage, engine):
        """Test rule evaluation with no metrics available"""
        storage.query = AsyncMock(return_value=[])
        
        result = await engine._evaluate_rule(engine.rules[0])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_evaluate_rule_max_aggregation(self, storage, engine):
        """Test rule evaluation with max aggregation"""
        rule = {
            "name": "max_rule",
            "metric": "system.cpu.usage",
            "metric_type": "max",
            "window_seconds": 60,
            "scale_up_threshold": 80,
            "scale_down_threshold": 20
        }
        
        now = time.time()
        storage.query = AsyncMock(return_value=[
            {"value": 50.0, "timestamp": now - 30},
            {"value": 90.0, "timestamp": now - 15},
            {"value": 70.0, "timestamp": now}
        ])
        
        result = await engine._evaluate_rule(rule)
        
        # Should use max value (90)
        assert result is not None
        assert result["action"] == "scale_up"

    @pytest.mark.asyncio
    async def test_evaluate_rule_min_aggregation(self, storage, engine):
        """Test rule evaluation with min aggregation"""
        rule = {
            "name": "min_rule",
            "metric": "system.cpu.usage",
            "metric_type": "min",
            "window_seconds": 60,
            "scale_up_threshold": 80,
            "scale_down_threshold": 20
        }
        
        now = time.time()
        storage.query = AsyncMock(return_value=[
            {"value": 90.0, "timestamp": now - 30},
            {"value": 85.0, "timestamp": now - 15},
            {"value": 80.0, "timestamp": now}
        ])
        
        result = await engine._evaluate_rule(rule)
        
        # Should use min value (80)
        assert result is not None
        assert result["action"] == "scale_up"


class TestScalingEngineExecution:
    """Test scaling execution"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.store_scaling_event = AsyncMock(return_value=True)
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            rules=[],
            min_instances=2,
            max_instances=10
        )

    @pytest.mark.asyncio
    async def test_execute_scale_up(self, engine, storage):
        """Test executing scale up action"""
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage"
        }
        result = {
            "action": "scale_up",
            "value": 85.0,
            "threshold": 80.0,
            "step": 2
        }
        
        event = await engine._execute_scaling(rule, result)
        
        assert event is not None
        assert event.to_dict()["to_instances"] == 4  # 2 + 2
        assert engine.current_instances == 4

    @pytest.mark.asyncio
    async def test_execute_scale_down(self, engine, storage):
        """Test executing scale down action"""
        engine.current_instances = 5
        
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage"
        }
        result = {
            "action": "scale_down",
            "value": 15.0,
            "threshold": 20.0,
            "step": 1
        }
        
        event = await engine._execute_scaling(rule, result)
        
        assert event is not None
        assert event.to_dict()["to_instances"] == 4  # 5 - 1
        assert engine.current_instances == 4

    @pytest.mark.asyncio
    async def test_execute_scale_respects_max(self, engine, storage):
        """Test that scale respects max_instances"""
        engine.current_instances = 9
        
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage"
        }
        result = {
            "action": "scale_up",
            "value": 90.0,
            "threshold": 80.0,
            "step": 5  # Would scale to 14
        }
        
        event = await engine._execute_scaling(rule, result)
        
        assert event is not None
        assert engine.current_instances == 10  # Capped at max

    @pytest.mark.asyncio
    async def test_execute_scale_respects_min(self, engine, storage):
        """Test that scale respects min_instances"""
        engine.current_instances = 3
        
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage"
        }
        result = {
            "action": "scale_down",
            "value": 10.0,
            "threshold": 20.0,
            "step": 5  # Would scale to -2
        }
        
        event = await engine._execute_scaling(rule, result)
        
        assert event is not None
        assert engine.current_instances == 2  # Capped at min

    @pytest.mark.asyncio
    async def test_execute_no_change_when_already_at_target(self, engine, storage):
        """Test that scaling doesn't happen when already at target count"""
        engine.current_instances = 5
        
        rule = {
            "name": "cpu_rule",
            "metric": "system.cpu.usage"
        }
        result = {
            "action": "scale_up",
            "value": 85.0,
            "threshold": 80.0,
            "step": 0  # No change
        }
        
        event = await engine._execute_scaling(rule, result)
        
        # Event should be None (no scaling happened)
        assert event is None
        assert engine.current_instances == 5


class TestScalingEngineManual:
    """Test manual scaling"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.store_scaling_event = AsyncMock(return_value=True)
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            min_instances=2,
            max_instances=10
        )

    @pytest.mark.asyncio
    async def test_manual_scale_valid(self, engine):
        """Test valid manual scaling"""
        result = await engine.manual_scale(5, "Test manual scale")
        
        assert result["to_instances"] == 5
        assert engine.current_instances == 5

    @pytest.mark.asyncio
    async def test_manual_scale_above_max(self, engine):
        """Test manual scaling above max"""
        result = await engine.manual_scale(20, "Test scale beyond max")
        
        assert result["to_instances"] == 10  # Capped at max
        assert engine.current_instances == 10

    @pytest.mark.asyncio
    async def test_manual_scale_below_min(self, engine):
        """Test manual scaling below min"""
        result = await engine.manual_scale(0, "Test scale below min")
        
        assert result["to_instances"] == 2  # Capped at min
        assert engine.current_instances == 2


class TestScalingEngineCallbacks:
    """Test scaling event callbacks"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        storage.store_scaling_event = AsyncMock(return_value=True)
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            min_instances=2,
            max_instances=10
        )

    def test_add_scale_callback(self, engine):
        """Test adding scale callback"""
        callback = Mock()
        engine.add_scale_callback(callback)
        
        assert callback in engine._scale_callbacks

    @pytest.mark.asyncio
    async def test_callback_invoked_on_scale(self, engine):
        """Test that callback is invoked on scaling"""
        callback = AsyncMock()
        engine.add_scale_callback(callback)
        
        # Trigger a scale
        await engine.manual_scale(5, "Test")
        
        # Callback should have been invoked
        callback.assert_called_once()


class TestScalingEngineCheckAndScale:
    """Test check_and_scale functionality"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            rules=[
                {
                    "name": "cpu_rule",
                    "metric": "system.cpu.usage",
                    "scale_up_threshold": 80,
                    "scale_down_threshold": 20,
                    "enabled": True
                }
            ],
            min_instances=2,
            max_instances=10
        )

    @pytest.mark.asyncio
    async def test_check_and_scale_in_cooldown(self, storage, engine):
        """Test that scaling is skipped during cooldown"""
        engine.last_scale_time = time.time() - 10  # Recently scaled
        engine.last_scale_action = {"action": "scale_up"}
        
        result = await engine.check_and_scale()
        
        # Should return None during cooldown
        assert result is None

    @pytest.mark.asyncio
    async def test_check_and_scale_disabled_rule(self, storage, engine):
        """Test that disabled rules are skipped"""
        engine.rules[0]["enabled"] = False
        
        result = await engine.check_and_scale()
        
        assert result is None

    @pytest.mark.asyncio
    async def test_check_and_scale_triggers_scale(self, storage, engine):
        """Test that check_and_scale triggers scaling"""
        now = time.time()
        
        storage.query = AsyncMock(return_value=[
            {"value": 85.0, "timestamp": now - 30},
            {"value": 90.0, "timestamp": now}
        ])
        
        engine.last_scale_time = time.time() - 1000  # No cooldown
        
        result = await engine.check_and_scale()
        
        assert result is not None


class TestScalingEngineLifecycle:
    """Test scaling engine lifecycle"""

    @pytest.fixture
    def storage(self):
        storage = Mock()
        storage.query = AsyncMock(return_value=[])
        return storage

    @pytest.fixture
    def engine(self, storage):
        return ScalingEngine(
            storage=storage,
            min_instances=2,
            max_instances=10
        )

    @pytest.mark.asyncio
    async def test_start_stop(self, engine):
        """Test starting and stopping engine"""
        assert engine._running is False
        
        await engine.start()
        assert engine._running is True
        assert engine._task is not None
        
        await engine.stop()
        assert engine._running is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])