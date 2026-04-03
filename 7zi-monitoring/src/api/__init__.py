"""
Dashboard API - REST API and WebSocket for real-time metrics
"""

import asyncio
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Callable
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class DashboardAPI:
    """REST API and WebSocket server for dashboard"""
    
    def __init__(
        self,
        storage: Any,
        alert_manager: Any = None,
        scaling_engine: Any = None,
        host: str = "0.0.0.0",
        port: int = 8080,
        api_keys: Dict[str, str] = None,
        cors_origins: List[str] = None
    ):
        self.storage = storage
        self.alert_manager = alert_manager
        self.scaling_engine = scaling_engine
        self.host = host
        self.port = port
        self.api_keys = api_keys or {}
        self.cors_origins = cors_origins or ["*"]
        
        # WebSocket connections
        self._ws_clients: Dict[str, Any] = {}
        self._ws_heartbeat = 30
        
        # Rate limiting
        self._rate_limits: Dict[str, List[float]] = {}
        self._rate_limit_window = 60  # 1 minute
        self._rate_limit_max = 100  # 100 requests per minute
        
        # Server
        self._app = None
        self._runner = None
        self._server = None
        
    def _check_rate_limit(self, client_id: str) -> bool:
        """Check if client is rate limited"""
        now = time.time()
        
        if client_id not in self._rate_limits:
            self._rate_limits[client_id] = []
            
        # Clean old entries
        self._rate_limits[client_id] = [
            t for t in self._rate_limits[client_id]
            if now - t < self._rate_limit_window
        ]
        
        if len(self._rate_limits[client_id]) >= self._rate_limit_max:
            return False
            
        self._rate_limits[client_id].append(now)
        return True
        
    def _validate_api_key(self, request) -> Optional[str]:
        """Validate API key from request"""
        if not self.api_keys:
            return "anonymous"
            
        # Check header
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            api_key = request.query.get('api_key')
            
        if not api_key:
            return None
            
        # Find key name
        for name, key in self.api_keys.items():
            if key == api_key:
                return name
                
        return None
        
    async def start(self):
        """Start the API server"""
        try:
            from aiohttp import web
        except ImportError:
            logger.error("aiohttp not installed. Run: pip install aiohttp")
            return
            
        self._app = web.Application()
        
        # Add CORS middleware
        @web.middleware
        async def cors_middleware(request, handler):
            if request.method == 'OPTIONS':
                response = web.Response()
            else:
                response = await handler(request)
                
            response.headers['Access-Control-Allow-Origin'] = ', '.join(self.cors_origins)
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-API-Key'
            return response
            
        self._app.middlewares.append(cors_middleware)
        
        # Register routes
        self._register_routes()
        
        # Start server
        self._runner = web.AppRunner(self._app)
        await self._runner.setup()
        self._server = await web.TCPSite(self._runner, self.host, self.port).start()
        
        logger.info(f"Dashboard API started on http://{self.host}:{self.port}")
        
    async def stop(self):
        """Stop the API server"""
        if self._runner:
            await self._runner.cleanup()
        logger.info("Dashboard API stopped")
        
    def _register_routes(self):
        """Register API routes"""
        from aiohttp import web
        
        # Metrics endpoints
        self._app.router.add_get('/api/metrics', self._handle_get_metrics)
        self._app.router.add_get('/api/metrics/{name}', self._handle_get_metric)
        self._app.router.add_get('/api/metrics/realtime', self._handle_realtime_ws)
        
        # Alerts endpoints
        self._app.router.add_get('/api/alerts', self._handle_get_alerts)
        self._app.router.add_get('/api/alerts/{id}', self._handle_get_alert)
        self._app.router.add_post('/api/alerts/acknowledge/{id}', self._handle_acknowledge_alert)
        self._app.router.add_post('/api/alerts/rules', self._handle_create_alert_rule)
        self._app.router.add_delete('/api/alerts/rules/{name}', self._handle_delete_alert_rule)
        
        # Scaling endpoints
        self._app.router.add_get('/api/scaling/status', self._handle_scaling_status)
        self._app.router.add_post('/api/scaling/scale', self._handle_manual_scale)
        self._app.router.add_get('/api/scaling/events', self._handle_scaling_events)
        
        # Reports endpoints
        self._app.router.add_get('/api/reports/daily', self._handle_daily_report)
        self._app.router.add_get('/api/reports/weekly', self._handle_weekly_report)
        
        # Health check
        self._app.router.add_get('/health', self._handle_health)
        
    async def _handle_get_metrics(self, request) -> Any:
        """Handle GET /api/metrics - Query metrics"""
        from aiohttp import web
        
        # Validate API key
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        # Check rate limit
        client_id = request.remote
        if not self._check_rate_limit(client_id):
            return web.json_response({"error": "Rate limit exceeded"}, status=429)
            
        # Parse query parameters
        metric_name = request.query.get('name')
        start_time = float(request.query.get('start_time', time.time() - 3600))
        end_time = float(request.query.get('end_time', time.time()))
        interval = int(request.query.get('interval', 60))
        tags = {}
        
        for key, value in request.query.items():
            if key.startswith('tag_'):
                tags[key[4:]] = value
                
        try:
            if metric_name:
                # Get aggregated data
                data = await self.storage.aggregate(
                    metric_name,
                    start_time,
                    end_time,
                    interval,
                    tags if tags else None
                )
            else:
                # Get latest metrics for all
                data = []
                # This would need to be implemented in storage
                
            return web.json_response({
                "metric": metric_name,
                "start_time": start_time,
                "end_time": end_time,
                "interval": interval,
                "data": data
            })
            
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_get_metric(self, request) -> Any:
        """Handle GET /api/metrics/{name} - Get specific metric"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        metric_name = request.match_info['name']
        
        try:
            latest = await self.storage.get_latest(metric_name)
            
            if latest is None:
                return web.json_response({"error": "Metric not found"}, status=404)
                
            return web.json_response(latest)
            
        except Exception as e:
            logger.error(f"Error getting metric: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_realtime_ws(self, request) -> Any:
        """Handle WebSocket /api/metrics/realtime - Real-time metrics stream"""
        from aiohttp import web
        
        ws = web.WebSocketResponse(heartbeat=self._ws_heartbeat)
        await ws.prepare(request)
        
        client_id = str(uuid.uuid4())
        self._ws_clients[client_id] = ws
        
        logger.info(f"WebSocket client connected: {client_id}")
        
        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        command = data.get('command')
                        
                        if command == 'subscribe':
                            # Client wants to subscribe to specific metrics
                            metrics = data.get('metrics', [])
                            # Store subscription info
                            
                        elif command == 'ping':
                            await ws.send_json({'command': 'pong'})
                            
                    except json.JSONDecodeError:
                        await ws.send_json({'error': 'Invalid JSON'})
                        
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
                    
        finally:
            del self._ws_clients[client_id]
            logger.info(f"WebSocket client disconnected: {client_id}")
            
        return ws
        
    async def broadcast_metrics(self, metrics: List[Dict[str, Any]]):
        """Broadcast metrics to all WebSocket clients"""
        for client_id, ws in list(self._ws_clients.items()):
            try:
                await ws.send_json({
                    "type": "metrics",
                    "timestamp": time.time(),
                    "data": metrics
                })
            except Exception as e:
                logger.error(f"Error sending to WebSocket client {client_id}: {e}")
                
    async def _handle_get_alerts(self, request) -> Any:
        """Handle GET /api/alerts - Get alerts"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        status = request.query.get('status')  # firing, resolved
        level = request.query.get('level')  # info, warning, critical
        
        try:
            if self.alert_manager:
                alerts = self.alert_manager.get_active_alerts()
                
                if status:
                    alerts = [a for a in alerts if a.get('status') == status]
                if level:
                    alerts = [a for a in alerts if a.get('level') == level]
                    
                return web.json_response({
                    "alerts": alerts,
                    "count": len(alerts)
                })
            else:
                return web.json_response({"alerts": [], "count": 0})
                
        except Exception as e:
            logger.error(f"Error getting alerts: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_get_alert(self, request) -> Any:
        """Handle GET /api/alerts/{id} - Get specific alert"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        alert_id = request.match_info['id']
        
        try:
            if self.alert_manager:
                alert = self.alert_manager.get_alert(alert_id)
                if alert:
                    return web.json_response(alert)
                return web.json_response({"error": "Alert not found"}, status=404)
            else:
                return web.json_response({"error": "Alert manager not available"}, status=503)
                
        except Exception as e:
            logger.error(f"Error getting alert: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_acknowledge_alert(self, request) -> Any:
        """Handle POST /api/alerts/acknowledge/{id} - Acknowledge alert"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        alert_id = request.match_info['id']
        
        try:
            if self.alert_manager:
                success = await self.alert_manager.acknowledge_alert(alert_id)
                if success:
                    return web.json_response({"status": "acknowledged"})
                return web.json_response({"error": "Alert not found"}, status=404)
            else:
                return web.json_response({"error": "Alert manager not available"}, status=503)
                
        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_create_alert_rule(self, request) -> Any:
        """Handle POST /api/alerts/rules - Create alert rule"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        try:
            data = await request.json()
            
            if self.alert_manager:
                self.alert_manager.add_rule(data)
                return web.json_response({"status": "created", "rule": data})
            else:
                return web.json_response({"error": "Alert manager not available"}, status=503)
                
        except Exception as e:
            logger.error(f"Error creating alert rule: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_delete_alert_rule(self, request) -> Any:
        """Handle DELETE /api/alerts/rules/{name} - Delete alert rule"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        rule_name = request.match_info['name']
        
        try:
            if self.alert_manager:
                self.alert_manager.remove_rule(rule_name)
                return web.json_response({"status": "deleted"})
            else:
                return web.json_response({"error": "Alert manager not available"}, status=503)
                
        except Exception as e:
            logger.error(f"Error deleting alert rule: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_scaling_status(self, request) -> Any:
        """Handle GET /api/scaling/status - Get scaling status"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        try:
            if self.scaling_engine:
                status = self.scaling_engine.get_status()
                return web.json_response(status)
            else:
                return web.json_response({"error": "Scaling engine not available"}, status=503)
                
        except Exception as e:
            logger.error(f"Error getting scaling status: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_manual_scale(self, request) -> Any:
        """Handle POST /api/scaling/scale - Manual scale"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        try:
            data = await request.json()
            target_instances = data.get('target_instances')
            reason = data.get('reason', 'Manual scale via API')
            
            if target_instances is None:
                return web.json_response({"error": "target_instances required"}, status=400)
                
            if self.scaling_engine:
                result = await self.scaling_engine.manual_scale(target_instances, reason)
                return web.json_response(result)
            else:
                return web.json_response({"error": "Scaling engine not available"}, status=503)
                
        except Exception as e:
            logger.error(f"Error scaling: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_scaling_events(self, request) -> Any:
        """Handle GET /api/scaling/events - Get scaling events"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        start_time = float(request.query.get('start_time', time.time() - 86400))
        end_time = float(request.query.get('end_time', time.time()))
        limit = int(request.query.get('limit', 100))
        
        try:
            # Query scaling events from storage
            # This would need storage implementation
            events = []
            
            return web.json_response({
                "events": events,
                "count": len(events)
            })
            
        except Exception as e:
            logger.error(f"Error getting scaling events: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_daily_report(self, request) -> Any:
        """Handle GET /api/reports/daily - Generate daily report"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        date = request.query.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        try:
            report = await self._generate_report('daily', date)
            return web.json_response(report)
        except Exception as e:
            logger.error(f"Error generating daily report: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _handle_weekly_report(self, request) -> Any:
        """Handle GET /api/reports/weekly - Generate weekly report"""
        from aiohttp import web
        
        if not self._validate_api_key(request):
            return web.json_response({"error": "Unauthorized"}, status=401)
            
        week_start = request.query.get('week_start')
        
        try:
            report = await self._generate_report('weekly', week_start)
            return web.json_response(report)
        except Exception as e:
            logger.error(f"Error generating weekly report: {e}")
            return web.json_response({"error": str(e)}, status=500)
            
    async def _generate_report(self, report_type: str, date: str = None) -> Dict[str, Any]:
        """Generate a report"""
        from .. import Report
        
        now = time.time()
        
        if report_type == 'daily':
            start_time = now - 86400
            report_type_str = 'daily'
        else:
            start_time = now - 604800  # 7 days
            report_type_str = 'weekly'
            
        # Get metrics summary
        metrics_summary = {}
        key_metrics = [
            'system.cpu.usage',
            'system.memory.usage',
            'application.response_time.p95',
            'application.error_rate',
            'application.throughput'
        ]
        
        for metric_name in key_metrics:
            aggregation = await self.storage.aggregate(
                metric_name,
                start_time,
                now,
                interval_seconds=3600  # 1-hour intervals
            )
            
            if aggregation:
                values = [a['avg'] for a in aggregation]
                metrics_summary[metric_name] = {
                    "count": len(values),
                    "sum": sum(values),
                    "min": min(values),
                    "max": max(values),
                    "avg": sum(values) / len(values)
                }
                
        # Get alerts summary
        alerts_summary = {
            "total": 0,
            "info": 0,
            "warning": 0,
            "critical": 0
        }
        
        if self.alert_manager:
            for alert in self.alert_manager.get_active_alerts():
                alerts_summary["total"] += 1
                level = alert.get('level', 'warning')
                alerts_summary[level] = alerts_summary.get(level, 0) + 1
                
        # Get scaling events
        scaling_events = []
        
        # Generate recommendations
        recommendations = []
        
        if 'system.cpu.usage' in metrics_summary:
            avg_cpu = metrics_summary['system.cpu.usage']['avg']
            if avg_cpu > 70:
                recommendations.append("Consider scaling up during peak hours to reduce CPU pressure")
            elif avg_cpu < 20:
                recommendations.append("Consider scaling down to reduce costs")
                
        if 'application.response_time.p95' in metrics_summary:
            avg_latency = metrics_summary['application.response_time.p95']['avg']
            if avg_latency > 500:
                recommendations.append("Investigate performance bottlenecks - high response times detected")
                
        return {
            "id": str(uuid.uuid4()),
            "type": report_type_str,
            "start_time": start_time,
            "end_time": now,
            "generated_at": now,
            "metrics_summary": metrics_summary,
            "alerts_summary": alerts_summary,
            "scaling_events": scaling_events,
            "recommendations": recommendations
        }
        
    async def _handle_health(self, request) -> Any:
        """Handle GET /health - Health check"""
        from aiohttp import web
        
        return web.json_response({
            "status": "healthy",
            "timestamp": time.time(),
            "websocket_clients": len(self._ws_clients)
        })
