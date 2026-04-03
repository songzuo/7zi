"""
7zi Performance Monitoring System - Main Entry Point
"""

import asyncio
import logging
import signal
import sys
import time
import yaml
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable
import os

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MonitoringSystem:
    """
    Main monitoring system that integrates all components.
    
    Features:
    - Metrics collection (system, application, business)
    - Time-series storage (memory + SQLite)
    - Auto-scaling engine
    - Alert management
    - Dashboard API
    
    Usage:
        monitoring = MonitoringSystem(config_path='config/monitoring.yaml')
        await monitoring.start()
        
        # Record custom metric
        monitoring.record('business.orders_per_minute', 42, tags={'region': 'cn-east'})
        
        # Stop
        await monitoring.stop()
    """
    
    def __init__(self, config_path: str = None, config: Dict[str, Any] = None):
        """
        Initialize the monitoring system.
        
        Args:
            config_path: Path to YAML configuration file
            config: Direct configuration dictionary (overrides file)
        """
        # Load configuration
        self.config = config or {}
        if config_path:
            self.config = self._load_config(config_path)
            
        # Set logging level
        log_level = self.config.get('core', {}).get('log_level', 'INFO')
        logging.getLogger().setLevel(getattr(logging, log_level))
        
        # Initialize components
        self.storage = None
        self.collectors = None
        self.scaling_engine = None
        self.alert_manager = None
        self.api = None
        
        # Running state
        self._running = False
        self._tasks: List[asyncio.Task] = []
        
        # Custom metrics callbacks
        self._metrics_callbacks: List[Callable] = []
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        path = Path(config_path)
        if not path.exists():
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return {}
            
        with open(path, 'r') as f:
            config = yaml.safe_load(f)
            
        # Expand environment variables
        config = self._expand_env_vars(config)
        return config
        
    def _expand_env_vars(self, config: Any) -> Any:
        """Recursively expand environment variables in config"""
        if isinstance(config, str):
            if config.startswith('${') and config.endswith('}'):
                env_var = config[2:-1]
                return os.environ.get(env_var, config)
            return config
        elif isinstance(config, dict):
            return {k: self._expand_env_vars(v) for k, v in config.items()}
        elif isinstance(config, list):
            return [self._expand_env_vars(item) for item in config]
        return config
        
    async def initialize(self):
        """Initialize all components"""
        from .collectors import CollectorManager, SystemCollector, ApplicationCollector, BusinessCollector
        from .storage import HybridStorage, SQLiteStorage
        from .scaling import ScalingEngine, PredictiveScalingEngine
        from .alerts import AlertManager
        from .api import DashboardAPI
        
        # Initialize storage
        storage_config = self.config.get('storage', {})
        backend = storage_config.get('backend', 'sqlite')
        
        if backend == 'sqlite':
            db_path = storage_config.get('sqlite', {}).get('path', '/var/lib/7zi-monitoring/metrics.db')
            # Ensure directory exists
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            
            self.storage = HybridStorage(
                memory_max_points=storage_config.get('memory', {}).get('max_points', 100000),
                db_path=db_path,
                pool_size=storage_config.get('sqlite', {}).get('pool_size', 5)
            )
            await self.storage.initialize()
        else:
            from .storage import MemoryStorage
            self.storage = MemoryStorage(
                max_points=storage_config.get('memory', {}).get('max_points', 100000)
            )
            
        # Initialize collectors
        self.collectors = CollectorManager()
        
        # System collector
        system_config = self.config.get('system_metrics', {})
        if system_config.get('enabled', True):
            system_collector = SystemCollector(
                interval_seconds=system_config.get('interval_seconds', 5),
                disk_paths=system_config.get('disk', {}).get('paths', ['/'])
            )
            self.collectors.add_collector(system_collector)
            
        # Application collector
        app_config = self.config.get('application_metrics', {})
        if app_config.get('enabled', True):
            app_collector = ApplicationCollector(
                interval_seconds=10
            )
            self.collectors.add_collector(app_collector)
            
        # Business collector
        business_config = self.config.get('business_metrics', {})
        if business_config.get('enabled', True):
            business_collector = BusinessCollector(
                interval_seconds=10
            )
            self.collectors.add_collector(business_collector)
            
        # Set metrics callback
        self.collectors.set_metrics_callback(self._handle_metrics)
        
        # Initialize scaling engine
        scaling_config = self.config.get('scaling', {})
        if scaling_config.get('enabled', True):
            predictive_config = scaling_config.get('predictive', {})
            
            if predictive_config.get('enabled', False):
                self.scaling_engine = PredictiveScalingEngine(
                    storage=self.storage,
                    rules=scaling_config.get('rules', []),
                    min_instances=scaling_config.get('limits', {}).get('min_instances', 2),
                    max_instances=scaling_config.get('limits', {}).get('max_instances', 20),
                    scale_up_cooldown_seconds=scaling_config.get('cooldown', {}).get('scale_up_seconds', 60),
                    scale_down_cooldown_seconds=scaling_config.get('cooldown', {}).get('scale_down_seconds', 300),
                    model=predictive_config.get('model', 'linear_regression'),
                    forecast_horizon_minutes=predictive_config.get('forecast_horizon_minutes', 30),
                    training_window_hours=predictive_config.get('training_window_hours', 168),
                    confidence_threshold=predictive_config.get('confidence_threshold', 0.8)
                )
            else:
                self.scaling_engine = ScalingEngine(
                    storage=self.storage,
                    rules=scaling_config.get('rules', []),
                    min_instances=scaling_config.get('limits', {}).get('min_instances', 2),
                    max_instances=scaling_config.get('limits', {}).get('max_instances', 20),
                    scale_up_cooldown_seconds=scaling_config.get('cooldown', {}).get('scale_up_seconds', 60),
                    scale_down_cooldown_seconds=scaling_config.get('cooldown', {}).get('scale_down_seconds', 300)
                )
                
            # Add scaling callback
            self.scaling_engine.add_scale_callback(self._handle_scaling_event)
            
        # Initialize alert manager
        alert_config = self.config.get('alerting', {})
        if alert_config.get('enabled', True):
            self.alert_manager = AlertManager(
                storage=self.storage,
                rules=alert_config.get('rules', []),
                channels=alert_config.get('channels', {}),
                default_channels=alert_config.get('default_channels', ['log']),
                aggregation_window_seconds=alert_config.get('aggregation', {}).get('window_seconds', 300),
                max_alerts_per_window=alert_config.get('aggregation', {}).get('max_alerts_per_window', 10)
            )
            
            # Set suppression windows
            suppression_config = alert_config.get('suppression', {})
            if suppression_config.get('enabled', False):
                self.alert_manager.set_suppression_windows(
                    suppression_config.get('maintenance_windows', [])
                )
                
        # Initialize API
        api_config = self.config.get('api', {})
        if api_config:
            self.api = DashboardAPI(
                storage=self.storage,
                alert_manager=self.alert_manager,
                scaling_engine=self.scaling_engine,
                host=api_config.get('host', '0.0.0.0'),
                port=api_config.get('port', 8080),
                api_keys=api_config.get('auth', {}).get('api_keys', {}),
                cors_origins=api_config.get('cors', {}).get('origins', ['*'])
            )
            
        logger.info("Monitoring system initialized")
        
    async def _handle_metrics(self, metrics: List[Any]):
        """Handle collected metrics"""
        # Store metrics
        await self.storage.store(metrics)
        
        # Notify callbacks
        for callback in self._metrics_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(metrics)
                else:
                    callback(metrics)
            except Exception as e:
                logger.error(f"Metrics callback error: {e}")
                
        # Broadcast to WebSocket clients
        if self.api:
            metrics_data = [m.to_dict() if hasattr(m, 'to_dict') else m for m in metrics]
            await self.api.broadcast_metrics(metrics_data)
            
    async def _handle_scaling_event(self, event: Dict[str, Any]):
        """Handle scaling events"""
        logger.info(f"Scaling event: {event}")
        
        # Optionally trigger actual scaling with cloud provider
        volcengine_config = self.config.get('volcengine', {})
        if volcengine_config and volcengine_config.get('scaling'):
            from .scaling import VolcengineScalingProvider
            
            provider = VolcengineScalingProvider(
                access_key=volcengine_config.get('access_key'),
                secret_key=volcengine_config.get('secret_key'),
                region=volcengine_config.get('region'),
                instance_group_id=volcengine_config.get('scaling', {}).get('instance_group_id'),
                instance_type=volcengine_config.get('scaling', {}).get('instance_type'),
                image_id=volcengine_config.get('scaling', {}).get('image_id')
            )
            
            await provider.scale_to(event.get('to_instances'))
            
    def on_metrics(self, callback: Callable):
        """Register callback for metrics events"""
        self._metrics_callbacks.append(callback)
        
    def record(
        self,
        metric_name: str,
        value: float,
        tags: Dict[str, str] = None,
        metric_type: str = "gauge"
    ):
        """
        Record a custom metric.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            tags: Optional tags for the metric
            metric_type: Type of metric (counter, gauge, histogram)
        """
        if self.collectors:
            business_collector = self.collectors.get_collector('business')
            if business_collector:
                from .collectors import BusinessCollector
                if isinstance(business_collector, BusinessCollector):
                    if metric_type == 'counter':
                        business_collector.increment_counter(metric_name, value, tags)
                    elif metric_type == 'histogram':
                        business_collector.record_histogram(metric_name, value, tags)
                    else:
                        business_collector.set_gauge(metric_name, value, tags)
                        
    def record_request(self, response_time_ms: float, is_error: bool = False):
        """Record an application request"""
        if self.collectors:
            app_collector = self.collectors.get_collector('application')
            if app_collector:
                from .collectors import ApplicationCollector
                if isinstance(app_collector, ApplicationCollector):
                    app_collector.record_request(response_time_ms, is_error)
                    
    def add_alert_rule(
        self,
        name: str,
        metric: str,
        threshold: float,
        level: str = "warning",
        condition: str = "greater_than",
        duration_seconds: int = 60,
        channels: List[str] = None,
        message: str = None
    ):
        """Add a custom alert rule"""
        if self.alert_manager:
            from . import ConditionType, AlertLevel, AlertChannel
            
            # Convert string to enum
            level_map = {
                'info': AlertLevel.INFO,
                'warning': AlertLevel.WARNING,
                'critical': AlertLevel.CRITICAL
            }
            
            condition_map = {
                'greater_than': ConditionType.GREATER_THAN,
                'less_than': ConditionType.LESS_THAN,
                'equals': ConditionType.EQUALS,
                'not_equals': ConditionType.NOT_EQUALS
            }
            
            channel_map = {
                'webhook': AlertChannel.WEBHOOK,
                'email': AlertChannel.EMAIL,
                'log': AlertChannel.LOG
            }
            
            rule = {
                'name': name,
                'metric': metric,
                'condition': condition,
                'threshold': threshold,
                'duration_seconds': duration_seconds,
                'level': level,
                'channels': channels or ['log'],
                'message': message or f"{metric} {{value}} exceeds threshold {threshold}",
                'enabled': True
            }
            
            self.alert_manager.add_rule(rule)
            
    def get_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        status = {
            "running": self._running,
            "timestamp": time.time(),
            "components": {
                "storage": self.storage is not None,
                "collectors": self.collectors is not None,
                "scaling_engine": self.scaling_engine is not None,
                "alert_manager": self.alert_manager is not None,
                "api": self.api is not None
            }
        }
        
        if self.scaling_engine:
            status["scaling"] = self.scaling_engine.get_status()
            
        if self.alert_manager:
            status["active_alerts"] = len(self.alert_manager.get_active_alerts())
            
        return status
        
    async def start(self):
        """Start the monitoring system"""
        if self._running:
            logger.warning("Monitoring system already running")
            return
            
        logger.info("Starting monitoring system...")
        
        # Initialize if needed
        if self.storage is None:
            await self.initialize()
            
        # Start collectors
        await self.collectors.start_all()
        
        # Start scaling engine
        if self.scaling_engine:
            await self.scaling_engine.start()
            
        # Start alert manager
        if self.alert_manager:
            await self.alert_manager.start()
            
        # Start API
        if self.api:
            await self.api.start()
            
        self._running = True
        logger.info("Monitoring system started")
        
    async def stop(self):
        """Stop the monitoring system"""
        if not self._running:
            return
            
        logger.info("Stopping monitoring system...")
        
        # Stop API
        if self.api:
            await self.api.stop()
            
        # Stop alert manager
        if self.alert_manager:
            await self.alert_manager.stop()
            
        # Stop scaling engine
        if self.scaling_engine:
            await self.scaling_engine.stop()
            
        # Stop collectors
        await self.collectors.stop_all()
        
        self._running = False
        logger.info("Monitoring system stopped")
        
    async def run(self):
        """Run the monitoring system (blocking)"""
        await self.start()
        
        # Wait for shutdown signal
        stop_event = asyncio.Event()
        
        def signal_handler():
            logger.info("Received shutdown signal")
            stop_event.set()
            
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)
            
        try:
            await stop_event.wait()
        finally:
            await self.stop()


def create_app(config_path: str = None) -> MonitoringSystem:
    """Create and configure monitoring system"""
    return MonitoringSystem(config_path=config_path)


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='7zi Monitoring System')
    parser.add_argument('--config', '-c', default='config/monitoring.yaml',
                        help='Path to configuration file')
    parser.add_argument('--port', '-p', type=int, default=8080,
                        help='API server port')
    args = parser.parse_args()
    
    monitoring = MonitoringSystem(config_path=args.config)
    
    # Override port if specified
    if args.port and monitoring.config:
        monitoring.config.setdefault('api', {})['port'] = args.port
        
    await monitoring.run()


if __name__ == '__main__':
    asyncio.run(main())
