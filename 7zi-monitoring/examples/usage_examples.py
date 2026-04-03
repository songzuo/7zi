"""
Example usage of 7zi Monitoring System
"""

import asyncio
import time
from src.main import MonitoringSystem


async def example_basic_usage():
    """Basic usage example"""
    print("=== Basic Usage Example ===\n")
    
    # Create monitoring system
    monitoring = MonitoringSystem(config_path='config/monitoring.yaml')
    
    # Initialize
    await monitoring.initialize()
    
    # Start monitoring
    await monitoring.start()
    
    print("Monitoring system started!")
    print(f"Status: {monitoring.get_status()}\n")
    
    # Record custom metrics
    print("Recording custom metrics...")
    monitoring.record('business.orders_per_minute', 42, tags={'region': 'cn-east'})
    monitoring.record('business.active_users', 150, tags={'service': 'api'})
    
    # Record application request
    monitoring.record_request(response_time_ms=125, is_error=False)
    monitoring.record_request(response_time_ms=89, is_error=False)
    monitoring.record_request(response_time_ms=450, is_error=True)
    
    print("Metrics recorded!\n")
    
    # Wait a bit for collection
    await asyncio.sleep(2)
    
    # Add custom alert rule
    print("Adding custom alert rule...")
    monitoring.add_alert_rule(
        name='high_orders',
        metric='business.orders_per_minute',
        threshold=50,
        level='warning',
        condition='greater_than',
        duration_seconds=60,
        channels=['log'],
        message='Orders per minute is high: {{value}}'
    )
    print("Alert rule added!\n")
    
    # Check status
    status = monitoring.get_status()
    print(f"Current status:")
    print(f"  Running: {status['running']}")
    print(f"  Active alerts: {status.get('active_alerts', 0)}")
    if 'scaling' in status:
        print(f"  Current instances: {status['scaling']['current_instances']}")
    
    print("\nStopping monitoring system...")
    await monitoring.stop()
    print("Done!")


async def example_custom_collector():
    """Example with custom collector"""
    print("\n=== Custom Collector Example ===\n")
    
    from src.collectors import BaseCollector
    from src import MetricPoint, MetricType
    
    class CustomCollector(BaseCollector):
        """Custom collector for business metrics"""
        
        def __init__(self):
            super().__init__("custom", interval_seconds=5)
            self._counter = 0
            
        async def collect(self):
            """Collect custom metrics"""
            self._counter += 1
            
            return [
                MetricPoint(
                    name="custom.processed_items",
                    value=self._counter,
                    metric_type=MetricType.COUNTER,
                    tags={"source": "custom"}
                ),
                MetricPoint(
                    name="custom.queue_size",
                    value=10 + (self._counter % 20),
                    metric_type=MetricType.GAUGE
                )
            ]
    
    # Create monitoring system
    monitoring = MonitoringSystem()
    await monitoring.initialize()
    
    # Add custom collector
    custom_collector = CustomCollector()
    monitoring.collectors.add_collector(custom_collector)
    
    # Start
    await monitoring.start()
    
    print("Custom collector running...")
    print("Collecting metrics for 10 seconds...\n")
    
    # Run for 10 seconds
    await asyncio.sleep(10)
    
    # Query metrics
    print("Querying custom metrics...")
    metrics = await monitoring.storage.query(
        "custom.processed_items",
        time.time() - 60,
        time.time()
    )
    print(f"Collected {len(metrics)} data points")
    
    await monitoring.stop()
    print("Done!")


async def example_sdk_usage():
    """Example using the Python SDK"""
    print("\n=== SDK Usage Example ===\n")
    
    from src.sdk import MonitoringClient
    
    # Create client
    async with MonitoringClient(
        api_url="http://localhost:8080",
        api_key="your-api-key"
    ) as client:
        
        # Health check
        health = await client.health_check()
        print(f"API Health: {health['status']}\n")
        
        # Get CPU usage
        cpu_metrics = await client.get_cpu_usage()
        print(f"CPU metrics: {len(cpu_metrics)} data points")
        if cpu_metrics:
            latest = cpu_metrics[-1]
            print(f"  Latest: {latest['avg']:.2f}%\n")
        
        # Get memory usage
        memory_metrics = await client.get_memory_usage()
        print(f"Memory metrics: {len(memory_metrics)} data points")
        if memory_metrics:
            latest = memory_metrics[-1]
            print(f"  Latest: {latest['avg']:.2f}%\n")
        
        # Get alerts
        alerts = await client.get_alerts(status='firing')
        print(f"Active alerts: {len(alerts)}")
        for alert in alerts:
            print(f"  - {alert['rule_name']}: {alert['level']}")
        
        # Get scaling status
        scaling_status = await client.get_scaling_status()
        print(f"\nScaling status:")
        print(f"  Current instances: {scaling_status['current_instances']}")
        print(f"  Min/Max: {scaling_status['min_instances']}/{scaling_status['max_instances']}")
        
        # Get daily report
        report = await client.get_daily_report()
        print(f"\nDaily report:")
        print(f"  Metrics summary: {len(report['metrics_summary'])} metrics")
        print(f"  Alerts: {report['alerts_summary']['total']} total")


async def example_websocket():
    """Example using WebSocket for real-time metrics"""
    print("\n=== WebSocket Example ===\n")
    
    from src.sdk import WebSocketClient
    
    # Create WebSocket client
    ws = WebSocketClient(
        ws_url="ws://localhost:8080/api/metrics/realtime",
        api_key="your-api-key"
    )
    
    # Define message handler
    def on_message(data):
        if data.get('type') == 'metrics':
            print(f"Received {len(data.get('data', []))} metrics")
            for metric in data.get('data', [])[:3]:  # Show first 3
                print(f"  - {metric['name']}: {metric['value']}")
    
    # Connect and listen
    await ws.connect()
    ws.on_message(on_message)
    
    # Subscribe to specific metrics
    await ws.subscribe([
        'system.cpu.usage',
        'system.memory.usage',
        'application.response_time.p95'
    ])
    
    print("Listening for real-time metrics...")
    print("Press Ctrl+C to stop\n")
    
    try:
        await ws.listen()
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        await ws.disconnect()


async def example_manual_scaling():
    """Example of manual scaling"""
    print("\n=== Manual Scaling Example ===\n")
    
    from src.sdk import MonitoringClient
    
    async with MonitoringClient(
        api_url="http://localhost:8080",
        api_key="your-api-key"
    ) as client:
        
        # Get current status
        status = await client.get_scaling_status()
        print(f"Current instances: {status['current_instances']}")
        
        # Scale up
        print("\nScaling up to 5 instances...")
        result = await client.manual_scale(5, reason="Manual scale test")
        print(f"Result: {result['action']} from {result['from_instances']} to {result['to_instances']}")
        
        # Wait a bit
        await asyncio.sleep(2)
        
        # Scale down
        print("\nScaling down to 3 instances...")
        result = await client.manual_scale(3, reason="Manual scale test")
        print(f"Result: {result['action']} from {result['from_instances']} to {result['to_instances']}")


async def example_alert_management():
    """Example of alert management"""
    print("\n=== Alert Management Example ===\n")
    
    from src.sdk import MonitoringClient
    
    async with MonitoringClient(
        api_url="http://localhost:8080",
        api_key="your-api-key"
    ) as client:
        
        # Create alert rule
        print("Creating alert rule...")
        rule = {
            'name': 'custom_high_latency',
            'metric': 'application.response_time.p95',
            'condition': 'greater_than',
            'threshold': 500,
            'duration_seconds': 60,
            'level': 'warning',
            'message': 'Response time is high: {{value}}ms',
            'channels': ['webhook', 'log'],
            'enabled': True
        }
        
        result = await client.create_alert_rule(rule)
        print(f"Rule created: {result['rule']['name']}\n")
        
        # Get alerts
        alerts = await client.get_alerts()
        print(f"Total alerts: {len(alerts)}")
        
        # Acknowledge an alert if any
        if alerts:
            alert_id = alerts[0]['id']
            print(f"\nAcknowledging alert: {alert_id}")
            success = await client.acknowledge_alert(alert_id)
            print(f"Success: {success}")
        
        # Delete rule
        print(f"\nDeleting rule: custom_high_latency")
        success = await client.delete_alert_rule('custom_high_latency')
        print(f"Success: {success}")


async def main():
    """Run all examples"""
    print("7zi Monitoring System - Usage Examples\n")
    print("=" * 50)
    
    # Run examples
    await example_basic_usage()
    await example_custom_collector()
    await example_sdk_usage()
    await example_websocket()
    await example_manual_scaling()
    await example_alert_management()
    
    print("\n" + "=" * 50)
    print("All examples completed!")


if __name__ == '__main__':
    # Run specific example
    # asyncio.run(example_basic_usage())
    # asyncio.run(example_sdk_usage())
    
    # Or run all
    asyncio.run(main())