"""
7zi Performance Monitoring System - Core Types and Models
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
import time


class MetricType(Enum):
    """Metric type enumeration"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertChannel(Enum):
    """Alert notification channels"""
    WEBHOOK = "webhook"
    EMAIL = "email"
    LOG = "log"


class ScalingAction(Enum):
    """Scaling action types"""
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    NONE = "none"


class ConditionType(Enum):
    """Alert condition types"""
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"


@dataclass
class MetricPoint:
    """A single metric data point"""
    name: str
    value: float
    timestamp: float = field(default_factory=time.time)
    tags: Dict[str, str] = field(default_factory=dict)
    metric_type: MetricType = MetricType.GAUGE
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "timestamp": self.timestamp,
            "tags": self.tags,
            "metric_type": self.metric_type.value
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MetricPoint":
        return cls(
            name=data["name"],
            value=data["value"],
            timestamp=data.get("timestamp", time.time()),
            tags=data.get("tags", {}),
            metric_type=MetricType(data.get("metric_type", "gauge"))
        )


@dataclass
class MetricAggregation:
    """Aggregated metric statistics"""
    name: str
    count: int
    sum: float
    min: float
    max: float
    avg: float
    p50: float
    p90: float
    p95: float
    p99: float
    start_time: float
    end_time: float
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "count": self.count,
            "sum": self.sum,
            "min": self.min,
            "max": self.max,
            "avg": self.avg,
            "p50": self.p50,
            "p90": self.p90,
            "p95": self.p95,
            "p99": self.p99,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "tags": self.tags
        }


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    metric: str
    condition: ConditionType
    threshold: float
    duration_seconds: int
    level: AlertLevel
    message: str
    channels: List[AlertChannel]
    enabled: bool = True
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "metric": self.metric,
            "condition": self.condition.value,
            "threshold": self.threshold,
            "duration_seconds": self.duration_seconds,
            "level": self.level.value,
            "message": self.message,
            "channels": [c.value for c in self.channels],
            "enabled": self.enabled,
            "tags": self.tags
        }


@dataclass
class Alert:
    """An active or resolved alert"""
    id: str
    rule_name: str
    metric: str
    value: float
    threshold: float
    level: AlertLevel
    message: str
    status: str  # "firing", "resolved"
    fired_at: float
    resolved_at: Optional[float] = None
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "rule_name": self.rule_name,
            "metric": self.metric,
            "value": self.value,
            "threshold": self.threshold,
            "level": self.level.value,
            "message": self.message,
            "status": self.status,
            "fired_at": self.fired_at,
            "resolved_at": self.resolved_at,
            "tags": self.tags
        }


@dataclass
class ScalingRule:
    """Auto-scaling rule configuration"""
    name: str
    metric: str
    metric_type: str  # "average", "max", "min"
    window_seconds: int
    scale_up_threshold: float
    scale_down_threshold: float
    scale_up_step: int
    scale_down_step: int
    enabled: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "metric": self.metric,
            "metric_type": self.metric_type,
            "window_seconds": self.window_seconds,
            "scale_up_threshold": self.scale_up_threshold,
            "scale_down_threshold": self.scale_down_threshold,
            "scale_up_step": self.scale_up_step,
            "scale_down_step": self.scale_down_step,
            "enabled": self.enabled
        }


@dataclass
class ScalingEvent:
    """A scaling action event"""
    id: str
    rule_name: str
    action: ScalingAction
    reason: str
    from_instances: int
    to_instances: int
    metric_value: float
    threshold: float
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "rule_name": self.rule_name,
            "action": self.action.value,
            "reason": self.reason,
            "from_instances": self.from_instances,
            "to_instances": self.to_instances,
            "metric_value": self.metric_value,
            "threshold": self.threshold,
            "timestamp": self.timestamp
        }


@dataclass
class ScalingStatus:
    """Current scaling status"""
    current_instances: int
    min_instances: int
    max_instances: int
    last_scale_action: Optional[ScalingEvent]
    last_scale_time: Optional[float]
    cooldown_remaining_seconds: int = 0
    active_rules: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "current_instances": self.current_instances,
            "min_instances": self.min_instances,
            "max_instances": self.max_instances,
            "last_scale_action": self.last_scale_action.to_dict() if self.last_scale_action else None,
            "last_scale_time": self.last_scale_time,
            "cooldown_remaining_seconds": self.cooldown_remaining_seconds,
            "active_rules": self.active_rules
        }


@dataclass
class SystemMetrics:
    """System resource metrics"""
    cpu_usage: float
    cpu_count: int
    memory_usage: float
    memory_total: int
    memory_used: int
    disk_usage: float
    disk_total: int
    disk_used: int
    network_in_bytes: int
    network_out_bytes: int
    load_avg_1: float
    load_avg_5: float
    load_avg_15: float
    timestamp: float = field(default_factory=time.time)
    
    def to_metric_points(self) -> List[MetricPoint]:
        """Convert to metric points"""
        return [
            MetricPoint("system.cpu.usage", self.cpu_usage),
            MetricPoint("system.cpu.count", self.cpu_count, metric_type=MetricType.GAUGE),
            MetricPoint("system.memory.usage", self.memory_usage),
            MetricPoint("system.memory.total", self.memory_total, metric_type=MetricType.GAUGE),
            MetricPoint("system.memory.used", self.memory_used, metric_type=MetricType.GAUGE),
            MetricPoint("system.disk.usage", self.disk_usage),
            MetricPoint("system.disk.total", self.disk_total, metric_type=MetricType.GAUGE),
            MetricPoint("system.disk.used", self.disk_used, metric_type=MetricType.GAUGE),
            MetricPoint("system.network.in_bytes", self.network_in_bytes, metric_type=MetricType.COUNTER),
            MetricPoint("system.network.out_bytes", self.network_out_bytes, metric_type=MetricType.COUNTER),
            MetricPoint("system.load.1m", self.load_avg_1),
            MetricPoint("system.load.5m", self.load_avg_5),
            MetricPoint("system.load.15m", self.load_avg_15),
        ]


@dataclass
class ApplicationMetrics:
    """Application performance metrics"""
    request_count: int
    error_count: int
    response_time_ms: float
    response_time_p50: float
    response_time_p90: float
    response_time_p95: float
    response_time_p99: float
    active_connections: int
    queue_length: int
    timestamp: float = field(default_factory=time.time)
    
    @property
    def error_rate(self) -> float:
        if self.request_count == 0:
            return 0.0
        return (self.error_count / self.request_count) * 100
    
    @property
    def throughput(self) -> float:
        """Requests per second (assuming 1-minute window)"""
        return self.request_count / 60.0
    
    def to_metric_points(self) -> List[MetricPoint]:
        return [
            MetricPoint("application.requests.count", self.request_count, metric_type=MetricType.COUNTER),
            MetricPoint("application.errors.count", self.error_count, metric_type=MetricType.COUNTER),
            MetricPoint("application.error_rate", self.error_rate),
            MetricPoint("application.response_time.avg", self.response_time_ms),
            MetricPoint("application.response_time.p50", self.response_time_p50),
            MetricPoint("application.response_time.p90", self.response_time_p90),
            MetricPoint("application.response_time.p95", self.response_time_p95),
            MetricPoint("application.response_time.p99", self.response_time_p99),
            MetricPoint("application.throughput", self.throughput),
            MetricPoint("application.connections.active", self.active_connections),
            MetricPoint("application.queue.length", self.queue_length),
        ]


@dataclass
class Report:
    """Generated report"""
    id: str
    type: str  # "daily", "weekly", "monthly"
    start_time: float
    end_time: float
    generated_at: float
    metrics_summary: Dict[str, MetricAggregation]
    alerts_summary: Dict[str, int]
    scaling_events: List[ScalingEvent]
    recommendations: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "generated_at": self.generated_at,
            "metrics_summary": {k: v.to_dict() for k, v in self.metrics_summary.items()},
            "alerts_summary": self.alerts_summary,
            "scaling_events": [e.to_dict() for e in self.scaling_events],
            "recommendations": self.recommendations
        }
