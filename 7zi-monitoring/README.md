# 7zi Performance Monitoring System

A high-performance monitoring and auto-scaling system for the 7zi platform.

## Features

- **Metrics Collection**: CPU, Memory, Disk, Network, Response Time, Throughput, Custom Business Metrics
- **Auto-Scaling**: Threshold-based and predictive scaling with cooldown periods
- **Alerting**: Multi-level alerts (info/warning/critical) with webhook/email/log channels
- **Dashboard API**: REST API + WebSocket for real-time metrics
- **Python SDK**: Easy integration for other services
- **High-Performance Storage**: Hybrid memory + SQLite for optimal performance

## Quick Start

### Installation

```bash
# Clone or copy the monitoring system
cd 7zi-monitoring

# Install dependencies
pip install -r requirements.txt
```

### Basic Usage

```python
import asyncio
from src.main import MonitoringSystem

async def main():
    # Create monitoring system
    monitoring = MonitoringSystem(config_path='config/monitoring.yaml')
    
    # Start monitoring
    await monitoring.start()
    
    # Record custom metrics
    monitoring.record('business.orders_per_minute', 42, tags={'region': 'cn-east'})
    
    # Record application request
    monitoring.record_request(response_time_ms=125, is_error=False)
    
    # Keep running
    await asyncio.sleep(3600)  # Run for 1 hour
    
    # Stop
    await monitoring.stop()

asyncio.run(main())
```

### Using the Start Script

```bash
# Start with default config
python start.py

# Start with custom config
python start.py --config /path/to/config.yaml

# Start on specific port
python start.py --port 9090

# Start with verbose logging
python start.py --log-level DEBUG
```

## Configuration

Edit `config/monitoring.yaml` to configure:

- **Metrics Collection**: Intervals, retention, aggregation
- **Storage**: Backend (SQLite/PostgreSQL/Memory), retention policies
- **Auto-Scaling**: Rules, limits, cooldown, predictive settings
- **Alerting**: Rules, channels, suppression windows
- **API**: Host, port, authentication, CORS

## Python SDK

```python
from src.sdk import MonitoringClient

async with MonitoringClient(
    api_url="http://localhost:8080",
    api_key="your-api-key"
) as client:
    # Get metrics
    cpu_metrics = await client.get_cpu_usage()
    
    # Get alerts
    alerts = await client.get_alerts(status='firing')
    
    # Manual scaling
    await client.manual_scale(5, reason="Manual scale")
    
    # Get reports
    report = await client.get_daily_report()
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/metrics` | Query metrics |
| `GET /api/metrics/{name}` | Get specific metric |
| `GET /api/metrics/realtime` | Real-time metrics (WebSocket) |
| `GET /api/alerts` | List alerts |
| `POST /api/alerts/rules` | Create alert rule |
| `GET /api/scaling/status` | Scaling status |
| `POST /api/scaling/scale` | Manual scale |
| `GET /api/reports/daily` | Daily report |
| `GET /health` | Health check |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Collectors    │────▶│   TimeSeries    │────▶│   Dashboard     │
│  (Metrics In)   │     │    Storage      │     │   API (REST)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                 ┌──────▼──────┐   ┌──────▼──────┐
                 │   Scaling   │   │   Alerting  │
                 │   Engine    │   │   System    │
                 └─────────────┘   └─────────────┘
```

## Components

### 1. Metrics Collectors (`src/collectors/`)
- **SystemCollector**: CPU, Memory, Disk, Network metrics
- **ApplicationCollector**: Response time, Throughput, Error rate
- **BusinessCollector**: Custom business metrics (counters, gauges, histograms)

### 2. TimeSeries Storage (`src/storage/`)
- **MemoryStorage**: In-memory ring buffer for hot data
- **SQLiteStorage**: Persistent storage with aggregation
- **HybridStorage**: Combines both for optimal performance

### 3. Auto-Scaling Engine (`src/scaling/`)
- **ScalingEngine**: Threshold-based scaling
- **PredictiveScalingEngine**: ML-based predictive scaling
- **VolcengineScalingProvider**: Volcengine cloud integration

### 4. Alert System (`src/alerts/`)
- **AlertManager**: Rule evaluation and notification
- **AlertAggregator**: Alert aggregation and rate limiting
- Multi-channel: Webhook, Email, Log

### 5. Dashboard API (`src/api/`)
- REST API for queries and control
- WebSocket for real-time streaming
- Report generation

### 6. Python SDK (`src/sdk/`)
- Simple client for integration
- Async support
- Type hints

## Testing

```bash
# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

## Examples

See `examples/usage_examples.py` for comprehensive examples:

- Basic usage
- Custom collectors
- SDK usage
- WebSocket real-time streaming
- Manual scaling
- Alert management

## License

MIT