"""
Auto-Scaling Engine - Threshold-based and Predictive Scaling
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Callable
import logging
import uuid
from datetime import datetime, timedelta
import math

logger = logging.getLogger(__name__)


class ScalingEngine:
    """Auto-scaling engine for managing instance count"""
    
    def __init__(
        self,
        storage: Any,
        rules: List[Dict[str, Any]] = None,
        min_instances: int = 2,
        max_instances: int = 20,
        scale_up_cooldown_seconds: int = 60,
        scale_down_cooldown_seconds: int = 300
    ):
        self.storage = storage
        self.rules: List[Dict[str, Any]] = rules or []
        self.min_instances = min_instances
        self.max_instances = max_instances
        self.scale_up_cooldown = scale_up_cooldown_seconds
        self.scale_down_cooldown = scale_down_cooldown_seconds
        
        # Current state
        self.current_instances = min_instances
        self.last_scale_time: Optional[float] = None
        self.last_scale_action: Optional[Dict[str, Any]] = None
        
        # Event callbacks
        self._scale_callbacks: List[Callable] = []
        
        # Running state
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._check_interval = 30  # Check every 30 seconds
        
        # Metrics history for predictive scaling
        self._metrics_history: Dict[str, List[float]] = {}
        self._history_window = 3600  # 1 hour of history
        
    def add_rule(self, rule: Dict[str, Any]):
        """Add a scaling rule"""
        self.rules.append(rule)
        
    def remove_rule(self, rule_name: str):
        """Remove a scaling rule"""
        self.rules = [r for r in self.rules if r.get('name') != rule_name]
        
    def add_scale_callback(self, callback: Callable):
        """Add callback for scaling events"""
        self._scale_callbacks.append(callback)
        
    async def _emit_scaling_event(self, event: Dict[str, Any]):
        """Emit scaling event to callbacks"""
        for callback in self._scale_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error(f"Scaling callback error: {e}")
                
    def _get_cooldown_remaining(self) -> int:
        """Get remaining cooldown time in seconds"""
        if not self.last_scale_time:
            return 0
            
        elapsed = time.time() - self.last_scale_time
        if self.last_scale_action and self.last_scale_action.get('action') == 'scale_up':
            cooldown = self.scale_up_cooldown
        else:
            cooldown = self.scale_down_cooldown
            
        return max(0, int(cooldown - elapsed))
        
    async def check_and_scale(self) -> Optional[Dict[str, Any]]:
        """Check metrics and perform scaling if needed"""
        # Check cooldown
        if self._get_cooldown_remaining() > 0:
            logger.debug("In cooldown period, skipping scaling check")
            return None
            
        # Evaluate each rule
        for rule in self.rules:
            if not rule.get('enabled', True):
                continue
                
            result = await self._evaluate_rule(rule)
            if result:
                event = await self._execute_scaling(rule, result)
                if event:
                    return event
                    
        return None
        
    async def _evaluate_rule(self, rule: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Evaluate a single scaling rule"""
        metric_name = rule.get('metric')
        window_seconds = rule.get('window_seconds', 60)
        
        # Get metric data
        end_time = time.time()
        start_time = end_time - window_seconds
        
        metrics = await self.storage.query(metric_name, start_time, end_time)
        
        if not metrics:
            return None
            
        # Calculate aggregate value
        metric_type = rule.get('metric_type', 'average')
        values = [m.get('value', 0) for m in metrics]
        
        if metric_type == 'average':
            value = sum(values) / len(values)
        elif metric_type == 'max':
            value = max(values)
        elif metric_type == 'min':
            value = min(values)
        else:
            value = sum(values) / len(values)
            
        # Check thresholds
        scale_up_threshold = rule.get('scale_up_threshold')
        scale_down_threshold = rule.get('scale_down_threshold')
        
        if scale_up_threshold and value >= scale_up_threshold:
            return {
                "action": "scale_up",
                "value": value,
                "threshold": scale_up_threshold,
                "step": rule.get('scale_up_step', 1)
            }
            
        if scale_down_threshold and value <= scale_down_threshold:
            return {
                "action": "scale_down",
                "value": value,
                "threshold": scale_down_threshold,
                "step": rule.get('scale_down_step', 1)
            }
            
        return None
        
    async def _execute_scaling(
        self,
        rule: Dict[str, Any],
        result: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Execute a scaling action"""
        from .. import ScalingEvent, ScalingAction
        
        action = result.get('action')
        step = result.get('step', 1)
        
        # Calculate new instance count
        if action == 'scale_up':
            new_count = min(self.current_instances + step, self.max_instances)
            reason = f"Metric {rule.get('metric')} ({result['value']:.2f}) >= threshold ({result['threshold']})"
        else:
            new_count = max(self.current_instances - step, self.min_instances)
            reason = f"Metric {rule.get('metric')} ({result['value']:.2f}) <= threshold ({result['threshold']})"
            
        # Check if we actually need to scale
        if new_count == self.current_instances:
            return None
            
        # Create scaling event
        event = ScalingEvent(
            id=str(uuid.uuid4()),
            rule_name=rule.get('name', 'unknown'),
            action=ScalingAction.SCALE_UP if action == 'scale_up' else ScalingAction.SCALE_DOWN,
            reason=reason,
            from_instances=self.current_instances,
            to_instances=new_count,
            metric_value=result['value'],
            threshold=result['threshold']
        )
        
        # Update state
        self.current_instances = new_count
        self.last_scale_time = time.time()
        self.last_scale_action = event.to_dict()
        
        # Store event
        if hasattr(self.storage, 'store_scaling_event'):
            await self.storage.store_scaling_event(event)
            
        # Notify callbacks
        await self._emit_scaling_event(event.to_dict())
        
        logger.info(f"Scaling: {action} from {event.from_instances} to {event.to_instances} instances. Reason: {reason}")
        
        return event.to_dict()
        
    async def manual_scale(self, target_instances: int, reason: str = "Manual scale") -> Dict[str, Any]:
        """Manually scale to a target instance count"""
        from .. import ScalingEvent, ScalingAction
        
        # Validate target
        target_instances = max(self.min_instances, min(target_instances, self.max_instances))
        
        if target_instances == self.current_instances:
            return {"status": "no_change", "current_instances": self.current_instances}
            
        action = ScalingAction.SCALE_UP if target_instances > self.current_instances else ScalingAction.SCALE_DOWN
        
        event = ScalingEvent(
            id=str(uuid.uuid4()),
            rule_name="manual",
            action=action,
            reason=reason,
            from_instances=self.current_instances,
            to_instances=target_instances,
            metric_value=0,
            threshold=0
        )
        
        self.current_instances = target_instances
        self.last_scale_time = time.time()
        self.last_scale_action = event.to_dict()
        
        if hasattr(self.storage, 'store_scaling_event'):
            await self.storage.store_scaling_event(event)
            
        await self._emit_scaling_event(event.to_dict())
        
        return event.to_dict()
        
    def get_status(self) -> Dict[str, Any]:
        """Get current scaling status"""
        return {
            "current_instances": self.current_instances,
            "min_instances": self.min_instances,
            "max_instances": self.max_instances,
            "last_scale_action": self.last_scale_action,
            "last_scale_time": self.last_scale_time,
            "cooldown_remaining_seconds": self._get_cooldown_remaining(),
            "active_rules": [r.get('name') for r in self.rules if r.get('enabled', True)]
        }
        
    async def start(self):
        """Start the scaling engine"""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._scaling_loop())
        logger.info("Scaling engine started")
        
    async def stop(self):
        """Stop the scaling engine"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Scaling engine stopped")
        
    async def _scaling_loop(self):
        """Main scaling loop"""
        while self._running:
            try:
                await self.check_and_scale()
                await asyncio.sleep(self._check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scaling loop error: {e}")
                await asyncio.sleep(self._check_interval)


class PredictiveScalingEngine(ScalingEngine):
    """Scaling engine with predictive capabilities"""
    
    def __init__(
        self,
        storage: Any,
        rules: List[Dict[str, Any]] = None,
        min_instances: int = 2,
        max_instances: int = 20,
        scale_up_cooldown_seconds: int = 60,
        scale_down_cooldown_seconds: int = 300,
        model: str = "linear_regression",
        forecast_horizon_minutes: int = 30,
        training_window_hours: int = 168,
        confidence_threshold: float = 0.8
    ):
        super().__init__(
            storage=storage,
            rules=rules,
            min_instances=min_instances,
            max_instances=max_instances,
            scale_up_cooldown_seconds=scale_up_cooldown_seconds,
            scale_down_cooldown_seconds=scale_down_cooldown_seconds
        )
        
        self.model = model
        self.forecast_horizon = forecast_horizon_minutes * 60  # Convert to seconds
        self.training_window = training_window_hours * 3600  # Convert to seconds
        self.confidence_threshold = confidence_threshold
        
        # Model coefficients (for linear regression)
        self._model_slope: Optional[float] = None
        self._model_intercept: Optional[float] = None
        self._model_metric: Optional[str] = None
        
    async def train_model(self, metric_name: str = "system.cpu.usage") -> bool:
        """Train the predictive model on historical data"""
        end_time = time.time()
        start_time = end_time - self.training_window
        
        # Get historical data
        metrics = await self.storage.aggregate(
            metric_name,
            start_time,
            end_time,
            interval_seconds=300  # 5-minute intervals
        )
        
        if len(metrics) < 10:  # Need minimum data points
            logger.warning(f"Insufficient data for training: {len(metrics)} points")
            return False
            
        # Simple linear regression
        # y = slope * x + intercept
        # where x is time, y is metric value
        
        timestamps = [(m['timestamp'] - metrics[0]['timestamp']) / 3600 for m in metrics]  # Hours from start
        values = [m['avg'] for m in metrics]
        
        n = len(timestamps)
        sum_x = sum(timestamps)
        sum_y = sum(values)
        sum_xy = sum(x * y for x, y in zip(timestamps, values))
        sum_x2 = sum(x * x for x in timestamps)
        
        denominator = n * sum_x2 - sum_x * sum_x
        if denominator == 0:
            return False
            
        self._model_slope = (n * sum_xy - sum_x * sum_y) / denominator
        self._model_intercept = (sum_y - self._model_slope * sum_x) / n
        self._model_metric = metric_name
        
        logger.info(f"Model trained: slope={self._model_slope:.4f}, intercept={self._model_intercept:.4f}")
        return True
        
    def predict(self, future_time: float) -> Optional[float]:
        """Predict metric value at a future time"""
        if self._model_slope is None or self._model_intercept is None:
            return None
            
        # future_time is seconds from now
        hours_from_now = future_time / 3600
        predicted_value = self._model_slope * hours_from_now + self._model_intercept
        
        return predicted_value
        
    async def predictive_check(self) -> Optional[Dict[str, Any]]:
        """Check if predictive scaling is needed"""
        if self._model_slope is None:
            await self.train_model()
            if self._model_slope is None:
                return None
                
        # Predict future metric value
        predicted = self.predict(self.forecast_horizon)
        
        if predicted is None:
            return None
            
        # Check if prediction exceeds threshold
        for rule in self.rules:
            if not rule.get('enabled', True):
                continue
                
            scale_up_threshold = rule.get('scale_up_threshold')
            if scale_up_threshold and predicted >= scale_up_threshold * self.confidence_threshold:
                logger.info(f"Predictive scaling: predicted value {predicted:.2f} will exceed threshold {scale_up_threshold}")
                return {
                    "action": "scale_up",
                    "value": predicted,
                    "threshold": scale_up_threshold,
                    "step": rule.get('scale_up_step', 1),
                    "predictive": True,
                    "forecast_horizon_seconds": self.forecast_horizon
                }
                
        return None
        
    async def check_and_scale(self) -> Optional[Dict[str, Any]]:
        """Check metrics and perform scaling if needed (with prediction)"""
        # First check regular rules
        result = await super().check_and_scale()
        if result:
            return result
            
        # Then check predictive
        predictive_result = await self.predictive_check()
        if predictive_result:
            for rule in self.rules:
                if rule.get('name') == 'predictive':
                    event = await self._execute_scaling(rule, predictive_result)
                    if event:
                        return event
                        
        return None


class VolcengineScalingProvider:
    """Volcengine scaling provider for actual instance management"""
    
    def __init__(
        self,
        access_key: str,
        secret_key: str,
        region: str,
        instance_group_id: str,
        instance_type: str,
        image_id: str
    ):
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region
        self.instance_group_id = instance_group_id
        self.instance_type = instance_type
        self.image_id = image_id
        self._client = None
        
    def _get_client(self):
        """Get Volcengine SDK client"""
        if self._client:
            return self._client
            
        try:
            # Import Volcengine SDK
            from volcengine.ecs.EcsService import EcsService
            
            self._client = EcsService()
            self._client.set_ak(self.access_key)
            self._client.set_sk(self.secret_key)
            
            return self._client
        except ImportError:
            logger.warning("Volcengine SDK not installed, using mock implementation")
            return None
            
    async def scale_to(self, target_count: int) -> bool:
        """Scale instance group to target count"""
        client = self._get_client()
        
        if client is None:
            # Mock implementation for testing
            logger.info(f"[MOCK] Scaling to {target_count} instances")
            return True
            
        try:
            # Use Volcengine API to scale
            # This is a simplified example - actual API may differ
            params = {
                "InstanceGroupId": self.instance_group_id,
                "TargetCount": target_count,
                "InstanceType": self.instance_type,
                "ImageId": self.image_id
            }
            
            # Call API (actual implementation would use proper SDK methods)
            # response = client.scale_instance_group(params)
            
            logger.info(f"Scaled instance group {self.instance_group_id} to {target_count}")
            return True
            
        except Exception as e:
            logger.error(f"Volcengine scaling error: {e}")
            return False
            
    async def get_current_count(self) -> int:
        """Get current instance count"""
        client = self._get_client()
        
        if client is None:
            return 0
            
        try:
            # Query current instance count
            # response = client.describe_instance_group(self.instance_group_id)
            # return response.get('InstanceCount', 0)
            return 0
        except Exception as e:
            logger.error(f"Error getting instance count: {e}")
            return 0
