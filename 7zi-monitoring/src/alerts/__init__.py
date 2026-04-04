"""
Alert System - Multi-level alerts with multiple notification channels
"""

import asyncio
import time
import uuid
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime, timedelta
import aiohttp

logger = logging.getLogger(__name__)


class AlertLevel:
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertChannel:
    """Alert notification channel types"""
    WEBHOOK = "webhook"
    EMAIL = "email"
    LOG = "log"


class AlertManager:
    """Manages alert rules and notifications"""
    
    def __init__(
        self,
        storage: Any,
        rules: List[Dict[str, Any]] = None,
        channels: Dict[str, Dict[str, Any]] = None,
        default_channels: List[str] = None,
        aggregation_window_seconds: int = 300,
        max_alerts_per_window: int = 10
    ):
        self.storage = storage
        self.rules: List[Dict[str, Any]] = rules or []
        self.channels: Dict[str, Dict[str, Any]] = channels or {}
        self.default_channels = default_channels or ["log"]
        
        # Aggregation settings
        self.aggregation_window = aggregation_window_seconds
        self.max_alerts_per_window = max_alerts_per_window
        
        # Active alerts tracking
        self._active_alerts: Dict[str, Dict[str, Any]] = {}  # rule_name -> alert
        self._alert_counts: Dict[str, int] = {}  # For aggregation
        self._last_alert_time: Dict[str, float] = {}  # For rate limiting
        
        # Suppression windows
        self._suppression_windows: List[Dict[str, Any]] = []
        
        # Running state
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._check_interval = 10  # Check every 10 seconds
        
    def add_rule(self, rule: Dict[str, Any]):
        """Add an alert rule"""
        from .. import AlertRule, ConditionType, AlertLevel, AlertChannel
        
        self.rules.append(rule)
        
    def remove_rule(self, rule_name: str):
        """Remove an alert rule"""
        self.rules = [r for r in self.rules if r.get('name') != rule_name]
        # Also remove any active alerts for this rule
        if rule_name in self._active_alerts:
            del self._active_alerts[rule_name]
            
    def set_suppression_windows(self, windows: List[Dict[str, Any]]):
        """Set maintenance/suppression windows"""
        self._suppression_windows = windows
        
    def _is_suppressed(self) -> bool:
        """Check if alerts are currently suppressed"""
        if not self._suppression_windows:
            return False
            
        now = datetime.now()
        
        for window in self._suppression_windows:
            # Parse time
            start_hour, start_min = map(int, window.get('start', '00:00').split(':'))
            end_hour, end_min = map(int, window.get('end', '00:00').split(':'))
            
            # Check day of week
            days = window.get('days', [])
            if days:
                day_name = now.strftime('%A').lower()
                if day_name not in [d.lower() for d in days]:
                    continue
                    
            # Check time
            start_minutes = start_hour * 60 + start_min
            end_minutes = end_hour * 60 + end_min
            current_minutes = now.hour * 60 + now.minute
            
            # Handle cross-midnight windows (e.g., 23:00-02:00)
            if start_minutes <= end_minutes:
                # Normal case: window within same day (e.g., 02:00-04:00)
                if start_minutes <= current_minutes <= end_minutes:
                    return True
            else:
                # Cross-midnight case: window spans midnight (e.g., 23:00-02:00)
                if current_minutes >= start_minutes or current_minutes <= end_minutes:
                    return True
                
        return False
        
    async def evaluate_rules(self):
        """Evaluate all alert rules"""
        if self._is_suppressed():
            logger.debug("Alerts are suppressed during maintenance window")
            return
            
        for rule in self.rules:
            if not rule.get('enabled', True):
                continue
                
            await self._evaluate_rule(rule)
            
    async def _evaluate_rule(self, rule: Dict[str, Any]):
        """Evaluate a single alert rule"""
        metric_name = rule.get('metric')
        condition = rule.get('condition', 'greater_than')
        threshold = rule.get('threshold')
        duration_seconds = rule.get('duration_seconds', 60)
        
        # Get metric data
        end_time = time.time()
        start_time = end_time - duration_seconds
        
        metrics = await self.storage.query(metric_name, start_time, end_time)
        
        if not metrics:
            # Metric not available, resolve any active alert
            await self._resolve_alert(rule.get('name'))
            return
            
        # Get the latest value
        latest_value = metrics[-1].get('value', 0) if metrics else 0
        
        # Check condition
        triggered = self._check_condition(latest_value, condition, threshold)
        
        if triggered:
            await self._fire_alert(rule, latest_value)
        else:
            await self._resolve_alert(rule.get('name'))
            
    def _check_condition(self, value: float, condition: str, threshold: float) -> bool:
        """Check if condition is met"""
        if condition == 'greater_than':
            return value > threshold
        elif condition == 'less_than':
            return value < threshold
        elif condition == 'equals':
            return value == threshold
        elif condition == 'not_equals':
            return value != threshold
        elif condition == 'greater_than_or_equal':
            return value >= threshold
        elif condition == 'less_than_or_equal':
            return value <= threshold
        return False
        
    async def _fire_alert(self, rule: Dict[str, Any], value: float):
        """Fire an alert"""
        from .. import Alert
        
        rule_name = rule.get('name')
        
        # Check if alert is already firing
        if rule_name in self._active_alerts:
            return  # Alert already active
            
        # Check aggregation/rate limiting
        now = time.time()
        if rule_name in self._last_alert_time:
            if now - self._last_alert_time[rule_name] < self.aggregation_window:
                self._alert_counts[rule_name] = self._alert_counts.get(rule_name, 0) + 1
                if self._alert_counts[rule_name] > self.max_alerts_per_window:
                    logger.debug(f"Alert {rule_name} rate limited")
                    return
                    
        # Create alert
        alert_id = str(uuid.uuid4())
        alert = Alert(
            id=alert_id,
            rule_name=rule_name,
            metric=rule.get('metric'),
            value=value,
            threshold=rule.get('threshold'),
            level=rule.get('level', AlertLevel.WARNING),
            message=self._format_message(rule.get('message', ''), value, rule.get('threshold')),
            status="firing",
            fired_at=time.time()
        )
        
        # Store alert
        self._active_alerts[rule_name] = alert.to_dict()
        self._last_alert_time[rule_name] = now
        self._alert_counts[rule_name] = 1
        
        if hasattr(self.storage, 'store_alert'):
            await self.storage.store_alert(alert)
            
        # Send notifications
        await self._send_notifications(alert, rule.get('channels', self.default_channels))
        
        logger.warning(f"Alert fired: {rule_name} - {alert.message}")
        
    async def _resolve_alert(self, rule_name: str):
        """Resolve an active alert"""
        if rule_name not in self._active_alerts:
            return
            
        alert_data = self._active_alerts[rule_name]
        alert_data['status'] = 'resolved'
        alert_data['resolved_at'] = time.time()
        
        # Update in storage
        if hasattr(self.storage, 'store_alert'):
            from .. import Alert
            alert = Alert(**alert_data)
            await self.storage.store_alert(alert)
            
        del self._active_alerts[rule_name]
        
        logger.info(f"Alert resolved: {rule_name}")
        
    def _format_message(self, template: str, value: float, threshold: float) -> str:
        """Format alert message with values"""
        message = template.replace('{{value}}', f'{value:.2f}')
        message = message.replace('{{threshold}}', f'{threshold:.2f}')
        return message
        
    async def _send_notifications(self, alert: Any, channels: List[str]):
        """Send notifications through configured channels"""
        for channel in channels:
            try:
                if channel == AlertChannel.WEBHOOK:
                    await self._send_webhook(alert)
                elif channel == AlertChannel.EMAIL:
                    await self._send_email(alert)
                elif channel == AlertChannel.LOG:
                    self._log_alert(alert)
            except Exception as e:
                logger.error(f"Error sending alert via {channel}: {e}")
                
    async def _send_webhook(self, alert: Any):
        """Send alert via webhook"""
        webhook_config = self.channels.get('webhook', {})
        url = webhook_config.get('url')
        
        if not url:
            logger.warning("Webhook URL not configured")
            return
            
        payload = alert.to_dict() if hasattr(alert, 'to_dict') else alert
        
        headers = webhook_config.get('headers', {'Content-Type': 'application/json'})
        timeout = webhook_config.get('timeout_seconds', 10)
        retry_count = webhook_config.get('retry_count', 3)
        
        for attempt in range(retry_count):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        url,
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=timeout)
                    ) as response:
                        if response.status < 400:
                            logger.debug(f"Webhook alert sent successfully")
                            return
                        logger.warning(f"Webhook returned status {response.status}")
            except Exception as e:
                if attempt == retry_count - 1:
                    raise
                await asyncio.sleep(1)
                
    async def _send_email(self, alert: Any):
        """Send alert via email"""
        email_config = self.channels.get('email', {})
        
        smtp_host = email_config.get('smtp_host')
        smtp_port = email_config.get('smtp_port', 587)
        smtp_user = email_config.get('smtp_user')
        smtp_password = email_config.get('smtp_password')
        from_addr = email_config.get('from_address')
        to_addrs = email_config.get('to_addresses', [])
        
        if not all([smtp_host, smtp_user, smtp_password, from_addr, to_addrs]):
            logger.warning("Email configuration incomplete")
            return
            
        alert_data = alert.to_dict() if hasattr(alert, 'to_dict') else alert
        
        # Create email
        msg = MIMEMultipart()
        msg['From'] = from_addr
        msg['To'] = ', '.join(to_addrs)
        msg['Subject'] = f"[{alert_data.get('level', 'warning').upper()}] Alert: {alert_data.get('rule_name')}"
        
        body = f"""
Alert: {alert_data.get('rule_name')}
Level: {alert_data.get('level')}
Status: {alert_data.get('status')}

Metric: {alert_data.get('metric')}
Current Value: {alert_data.get('value', 0):.2f}
Threshold: {alert_data.get('threshold', 0):.2f}

Message: {alert_data.get('message')}

Time: {datetime.fromtimestamp(alert_data.get('fired_at', time.time())).isoformat()}
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        try:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_addr, to_addrs, msg.as_string())
            logger.debug(f"Email alert sent successfully")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise
            
    def _log_alert(self, alert: Any):
        """Log alert to system log"""
        alert_data = alert.to_dict() if hasattr(alert, 'to_dict') else alert
        level = alert_data.get('level', 'warning')
        
        if level == 'critical':
            logger.critical(f"ALERT: {alert_data}")
        elif level == 'warning':
            logger.warning(f"ALERT: {alert_data}")
        else:
            logger.info(f"ALERT: {alert_data}")
            
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active alerts"""
        return list(self._active_alerts.values())
        
    def get_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Get specific alert by ID"""
        for alert in self._active_alerts.values():
            if alert.get('id') == alert_id:
                return alert
        return None
        
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert"""
        for rule_name, alert in self._active_alerts.items():
            if alert.get('id') == alert_id:
                alert['acknowledged'] = True
                alert['acknowledged_at'] = time.time()
                self._active_alerts[rule_name] = alert
                return True
        return False
        
    async def start(self):
        """Start the alert manager"""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._alert_loop())
        logger.info("Alert manager started")
        
    async def stop(self):
        """Stop the alert manager"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Alert manager stopped")
        
    async def _alert_loop(self):
        """Main alert evaluation loop"""
        while self._running:
            try:
                await self.evaluate_rules()
                await asyncio.sleep(self._check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Alert loop error: {e}")
                await asyncio.sleep(self._check_interval)


class AlertAggregator:
    """Aggregates alerts to reduce noise"""
    
    def __init__(self, window_seconds: int = 300, max_alerts: int = 10):
        self.window_seconds = window_seconds
        self.max_alerts = max_alerts
        self._alerts: Dict[str, List[Dict[str, Any]]] = {}  # rule_name -> list of alerts
        
    def add_alert(self, alert: Dict[str, Any]) -> bool:
        """Add an alert, returns True if should be sent"""
        rule_name = alert.get('rule_name')
        now = time.time()
        
        if rule_name not in self._alerts:
            self._alerts[rule_name] = []
            
        # Clean old alerts
        self._alerts[rule_name] = [
            a for a in self._alerts[rule_name]
            if now - a.get('fired_at', 0) < self.window_seconds
        ]
        
        # Check if we should send
        if len(self._alerts[rule_name]) >= self.max_alerts:
            return False
            
        self._alerts[rule_name].append(alert)
        return True
        
    def get_summary(self, rule_name: str) -> Optional[Dict[str, Any]]:
        """Get alert summary for a rule"""
        if rule_name not in self._alerts or not self._alerts[rule_name]:
            return None
            
        alerts = self._alerts[rule_name]
        values = [a.get('value', 0) for a in alerts]
        
        return {
            "rule_name": rule_name,
            "count": len(alerts),
            "first_fired": min(a.get('fired_at', 0) for a in alerts),
            "last_fired": max(a.get('fired_at', 0) for a in alerts),
            "min_value": min(values),
            "max_value": max(values),
            "avg_value": sum(values) / len(values)
        }
