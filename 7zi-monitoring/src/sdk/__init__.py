"""
Python SDK for 7zi Monitoring System
"""

import asyncio
import json
import time
from typing import Any, Dict, List, Optional, Union
import logging
import aiohttp

logger = logging.getLogger(__name__)


class MonitoringClient:
    """Python SDK client for 7zi Monitoring System"""
    
    def __init__(
        self,
        api_url: str = "http://localhost:8080",
        api_key: str = None,
        timeout: int = 10
    ):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self._session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
        
    async def connect(self):
        """Connect to the monitoring API"""
        if self._session is None:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout),
                headers=self._get_headers()
            )
            
    async def close(self):
        """Close the connection"""
        if self._session:
            await self._session.close()
            self._session = None
            
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        return headers
        
    async def _request(
        self,
        method: str,
        path: str,
        params: Dict[str, Any] = None,
        data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Make an API request"""
        if not self._session:
            await self.connect()
            
        url = f"{self.api_url}{path}"
        
        try:
            async with self._session.request(
                method,
                url,
                params=params,
                json=data,
                headers=self._get_headers()
            ) as response:
                if response.status >= 400:
                    error_text = await response.text()
                    raise Exception(f"API error {response.status}: {error_text}")
                    
                return await response.json()
                
        except aiohttp.ClientError as e:
            logger.error(f"Request error: {e}")
            raise
            
    # Metrics methods
    
    async def get_metrics(
        self,
        metric_name: str,
        start_time: float = None,
        end_time: float = None,
        interval: int = 60,
        tags: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Query metrics"""
        params = {
            'name': metric_name,
            'interval': interval
        }
        
        if start_time:
            params['start_time'] = start_time
        if end_time:
            params['end_time'] = end_time
        if tags:
            for key, value in tags.items():
                params[f'tag_{key}'] = value
                
        return await self._request('GET', '/api/metrics', params=params)
        
    async def get_metric(self, metric_name: str) -> Optional[Dict[str, Any]]:
        """Get latest metric value"""
        try:
            return await self._request('GET', f'/api/metrics/{metric_name}')
        except Exception:
            return None
            
    async def get_cpu_usage(self, start_time: float = None, end_time: float = None) -> List[Dict[str, Any]]:
        """Get CPU usage metrics"""
        result = await self.get_metrics('system.cpu.usage', start_time, end_time)
        return result.get('data', [])
        
    async def get_memory_usage(self, start_time: float = None, end_time: float = None) -> List[Dict[str, Any]]:
        """Get memory usage metrics"""
        result = await self.get_metrics('system.memory.usage', start_time, end_time)
        return result.get('data', [])
        
    async def get_response_time(self, percentile: str = 'p95', start_time: float = None, end_time: float = None) -> List[Dict[str, Any]]:
        """Get response time metrics"""
        metric_name = f'application.response_time.{percentile}'
        result = await self.get_metrics(metric_name, start_time, end_time)
        return result.get('data', [])
        
    async def get_throughput(self, start_time: float = None, end_time: float = None) -> List[Dict[str, Any]]:
        """Get throughput metrics"""
        result = await self.get_metrics('application.throughput', start_time, end_time)
        return result.get('data', [])
        
    # Alerts methods
    
    async def get_alerts(self, status: str = None, level: str = None) -> List[Dict[str, Any]]:
        """Get alerts"""
        params = {}
        if status:
            params['status'] = status
        if level:
            params['level'] = level
            
        result = await self._request('GET', '/api/alerts', params=params)
        return result.get('alerts', [])
        
    async def get_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Get specific alert"""
        try:
            return await self._request('GET', f'/api/alerts/{alert_id}')
        except Exception:
            return None
            
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert"""
        try:
            await self._request('POST', f'/api/alerts/acknowledge/{alert_id}')
            return True
        except Exception:
            return False
            
    async def create_alert_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Create an alert rule"""
        return await self._request('POST', '/api/alerts/rules', data=rule)
        
    async def delete_alert_rule(self, rule_name: str) -> bool:
        """Delete an alert rule"""
        try:
            await self._request('DELETE', f'/api/alerts/rules/{rule_name}')
            return True
        except Exception:
            return False
            
    # Scaling methods
    
    async def get_scaling_status(self) -> Dict[str, Any]:
        """Get scaling status"""
        return await self._request('GET', '/api/scaling/status')
        
    async def manual_scale(self, target_instances: int, reason: str = None) -> Dict[str, Any]:
        """Manually scale instances"""
        data = {
            'target_instances': target_instances,
            'reason': reason or 'Manual scale via SDK'
        }
        return await self._request('POST', '/api/scaling/scale', data=data)
        
    async def get_scaling_events(self, start_time: float = None, end_time: float = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get scaling events"""
        params = {'limit': limit}
        if start_time:
            params['start_time'] = start_time
        if end_time:
            params['end_time'] = end_time
            
        result = await self._request('GET', '/api/scaling/events', params=params)
        return result.get('events', [])
        
    # Reports methods
    
    async def get_daily_report(self, date: str = None) -> Dict[str, Any]:
        """Get daily report"""
        params = {}
        if date:
            params['date'] = date
            
        return await self._request('GET', '/api/reports/daily', params=params)
        
    async def get_weekly_report(self, week_start: str = None) -> Dict[str, Any]:
        """Get weekly report"""
        params = {}
        if week_start:
            params['week_start'] = week_start
            
        return await self._request('GET', '/api/reports/weekly', params=params)
        
    # Health check
    
    async def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        return await self._request('GET', '/health')


class MetricsCollector:
    """Helper class for collecting custom metrics"""
    
    def __init__(self, client: MonitoringClient):
        self.client = client
        self._counters: Dict[str, float] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = {}
        
    def increment_counter(self, name: str, value: float = 1, tags: Dict[str, str] = None):
        """Increment a counter metric"""
        key = self._make_key(name, tags)
        self._counters[key] = self._counters.get(key, 0) + value
        
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """Set a gauge metric value"""
        key = self._make_key(name, tags)
        self._gauges[key] = value
        
    def record_histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a histogram value"""
        key = self._make_key(name, tags)
        if key not in self._histograms:
            self._histograms[key] = []
        self._histograms[key].append(value)
        
    def _make_key(self, name: str, tags: Dict[str, str] = None) -> str:
        """Create a unique key from name and tags"""
        if not tags:
            return name
        sorted_tags = sorted(tags.items())
        tag_str = ",".join(f"{k}={v}" for k, v in sorted_tags)
        return f"{name}:{tag_str}"
        
    async def flush(self):
        """Flush all collected metrics to the server"""
        # This would send metrics to the monitoring system
        # For now, it's a placeholder
        pass


class WebSocketClient:
    """WebSocket client for real-time metrics"""
    
    def __init__(
        self,
        ws_url: str = "ws://localhost:8080/api/metrics/realtime",
        api_key: str = None
    ):
        self.ws_url = ws_url
        self.api_key = api_key
        self._ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._callbacks: List[callable] = []
        
    async def connect(self):
        """Connect to WebSocket"""
        headers = {}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
            
        self._ws = await aiohttp.ClientSession().ws_connect(
            self.ws_url,
            headers=headers
        )
        
    async def disconnect(self):
        """Disconnect from WebSocket"""
        if self._ws:
            await self._ws.close()
            self._ws = None
            
    def on_message(self, callback: callable):
        """Register callback for incoming messages"""
        self._callbacks.append(callback)
        
    async def subscribe(self, metrics: List[str]):
        """Subscribe to specific metrics"""
        if not self._ws:
            raise Exception("Not connected")
            
        await self._ws.send_json({
            'command': 'subscribe',
            'metrics': metrics
        })
        
    async def listen(self):
        """Listen for incoming messages"""
        if not self._ws:
            raise Exception("Not connected")
            
        async for msg in self._ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    for callback in self._callbacks:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(data)
                        else:
                            callback(data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {msg.data}")
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error(f"WebSocket error: {self._ws.exception()}")
                break
                
    async def ping(self):
        """Send ping"""
        if self._ws:
            await self._ws.send_json({'command': 'ping'})


# Convenience functions

async def get_cpu_usage(api_url: str = "http://localhost:8080", api_key: str = None) -> float:
    """Get current CPU usage"""
    async with MonitoringClient(api_url, api_key) as client:
        metric = await client.get_metric('system.cpu.usage')
        return metric.get('value', 0) if metric else 0


async def get_memory_usage(api_url: str = "http://localhost:8080", api_key: str = None) -> float:
    """Get current memory usage"""
    async with MonitoringClient(api_url, api_key) as client:
        metric = await client.get_metric('system.memory.usage')
        return metric.get('value', 0) if metric else 0


async def get_active_alerts(api_url: str = "http://localhost:8080", api_key: str = None) -> List[Dict[str, Any]]:
    """Get all active alerts"""
    async with MonitoringClient(api_url, api_key) as client:
        return await client.get_alerts(status='firing')


async def scale_instances(target_instances: int, api_url: str = "http://localhost:8080", api_key: str = None) -> Dict[str, Any]:
    """Scale to target instance count"""
    async with MonitoringClient(api_url, api_key) as client:
        return await client.manual_scale(target_instances)