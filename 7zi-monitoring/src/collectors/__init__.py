"""
Metrics Collectors - System, Application, and Business Metrics
"""

import asyncio
import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Callable
import logging
import threading
from collections import deque
import json

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """Base class for all metric collectors"""
    
    def __init__(self, name: str, interval_seconds: int = 10):
        self.name = name
        self.interval_seconds = interval_seconds
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._callbacks: List[Callable] = []
        self._last_collection_time: float = 0
        
    def add_callback(self, callback: Callable):
        """Add callback to be called when metrics are collected"""
        self._callbacks.append(callback)
        
    async def _emit_metrics(self, metrics: List[Any]):
        """Emit collected metrics to all callbacks"""
        for callback in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(metrics)
                else:
                    callback(metrics)
            except Exception as e:
                logger.error(f"Callback error in {self.name}: {e}")
                
    @abstractmethod
    async def collect(self) -> List[Any]:
        """Collect metrics - to be implemented by subclasses"""
        pass
    
    async def _collection_loop(self):
        """Main collection loop"""
        while self._running:
            try:
                start_time = time.time()
                metrics = await self.collect()
                await self._emit_metrics(metrics)
                self._last_collection_time = time.time()
                
                elapsed = time.time() - start_time
                sleep_time = max(0, self.interval_seconds - elapsed)
                await asyncio.sleep(sleep_time)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Collection error in {self.name}: {e}")
                await asyncio.sleep(self.interval_seconds)
                
    def start(self):
        """Start the collector"""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._collection_loop())
        logger.info(f"Started collector: {self.name}")
        
    async def stop(self):
        """Stop the collector"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info(f"Stopped collector: {self.name}")


class SystemCollector(BaseCollector):
    """Collects system-level metrics: CPU, Memory, Disk, Network"""
    
    def __init__(self, interval_seconds: int = 5, disk_paths: List[str] = None):
        super().__init__("system", interval_seconds)
        self.disk_paths = disk_paths or ["/"]
        self._prev_net_stats = None
        self._prev_net_time = 0
        
    async def collect(self) -> List:
        """Collect system metrics"""
        from .. import MetricPoint, SystemMetrics, MetricType
        
        # CPU metrics
        cpu_usage = self._get_cpu_usage()
        cpu_count = os.cpu_count() or 1
        
        # Memory metrics
        mem_info = self._get_memory_info()
        
        # Disk metrics
        disk_info = self._get_disk_info()
        
        # Network metrics
        net_info = self._get_network_info()
        
        # Load average
        load_avg = self._get_load_average()
        
        # Create SystemMetrics object
        sys_metrics = SystemMetrics(
            cpu_usage=cpu_usage,
            cpu_count=cpu_count,
            memory_usage=mem_info["usage_percent"],
            memory_total=mem_info["total"],
            memory_used=mem_info["used"],
            disk_usage=disk_info["usage_percent"],
            disk_total=disk_info["total"],
            disk_used=disk_info["used"],
            network_in_bytes=net_info["in_bytes"],
            network_out_bytes=net_info["out_bytes"],
            load_avg_1=load_avg[0],
            load_avg_5=load_avg[1],
            load_avg_15=load_avg[2]
        )
        
        return sys_metrics.to_metric_points()
    
    def _get_cpu_usage(self) -> float:
        """Get CPU usage percentage"""
        try:
            with open('/proc/stat', 'r') as f:
                line = f.readline()
                values = line.split()[1:8]
                values = [int(v) for v in values]
                total = sum(values)
                idle = values[3]
                
                # Calculate usage over time
                if not hasattr(self, '_prev_cpu'):
                    self._prev_cpu = (total, idle, time.time())
                    return 0.0
                    
                prev_total, prev_idle, prev_time = self._prev_cpu
                self._prev_cpu = (total, idle, time.time())
                
                total_diff = total - prev_total
                idle_diff = idle - prev_idle
                
                if total_diff == 0:
                    return 0.0
                    
                usage = (1 - idle_diff / total_diff) * 100
                return round(usage, 2)
        except Exception:
            return 0.0
            
    def _get_memory_info(self) -> Dict[str, Any]:
        """Get memory information"""
        try:
            with open('/proc/meminfo', 'r') as f:
                lines = f.readlines()
                
            mem_info = {}
            for line in lines:
                parts = line.split()
                key = parts[0].rstrip(':')
                value = int(parts[1]) * 1024  # Convert from KB to bytes
                mem_info[key] = value
                
            total = mem_info.get('MemTotal', 0)
            available = mem_info.get('MemAvailable', mem_info.get('MemFree', 0))
            used = total - available
            
            return {
                "total": total,
                "used": used,
                "available": available,
                "usage_percent": round((used / total) * 100, 2) if total > 0 else 0
            }
        except Exception:
            return {"total": 0, "used": 0, "available": 0, "usage_percent": 0}
            
    def _get_disk_info(self) -> Dict[str, Any]:
        """Get disk usage information"""
        try:
            import shutil
            total, used, free = shutil.disk_usage(self.disk_paths[0])
            return {
                "total": total,
                "used": used,
                "free": free,
                "usage_percent": round((used / total) * 100, 2) if total > 0 else 0
            }
        except Exception:
            return {"total": 0, "used": 0, "free": 0, "usage_percent": 0}
            
    def _get_network_info(self) -> Dict[str, Any]:
        """Get network I/O statistics"""
        try:
            with open('/proc/net/dev', 'r') as f:
                lines = f.readlines()[2:]  # Skip header lines
                
            total_in = 0
            total_out = 0
            
            for line in lines:
                parts = line.split()
                if len(parts) < 10:
                    continue
                # Skip loopback
                if parts[0].rstrip(':') == 'lo':
                    continue
                total_in += int(parts[1])
                total_out += int(parts[9])
                
            current_time = time.time()
            
            if self._prev_net_stats is None:
                self._prev_net_stats = (total_in, total_out, current_time)
                return {"in_bytes": 0, "out_bytes": 0, "in_rate": 0, "out_rate": 0}
                
            prev_in, prev_out, prev_time = self._prev_net_stats
            self._prev_net_stats = (total_in, total_out, current_time)
            
            time_diff = current_time - prev_time
            in_rate = (total_in - prev_in) / time_diff if time_diff > 0 else 0
            out_rate = (total_out - prev_out) / time_diff if time_diff > 0 else 0
            
            return {
                "in_bytes": total_in,
                "out_bytes": total_out,
                "in_rate": in_rate,
                "out_rate": out_rate
            }
        except Exception:
            return {"in_bytes": 0, "out_bytes": 0, "in_rate": 0, "out_rate": 0}
            
    def _get_load_average(self) -> tuple:
        """Get system load average"""
        try:
            return os.getloadavg()
        except Exception:
            return (0.0, 0.0, 0.0)


class ApplicationCollector(BaseCollector):
    """Collects application-level metrics"""
    
    def __init__(self, interval_seconds: int = 10):
        super().__init__("application", interval_seconds)
        self._request_times: deque = deque(maxlen=10000)
        self._request_count = 0
        self._error_count = 0
        self._active_connections = 0
        self._queue_length = 0
        self._lock = threading.Lock()
        self._window_start = time.time()
        
    def record_request(self, response_time_ms: float, is_error: bool = False):
        """Record a request"""
        with self._lock:
            self._request_times.append(response_time_ms)
            self._request_count += 1
            if is_error:
                self._error_count += 1
                
    def set_active_connections(self, count: int):
        """Set current active connections"""
        self._active_connections = count
        
    def set_queue_length(self, length: int):
        """Set current queue length"""
        self._queue_length = length
        
    async def collect(self) -> List:
        """Collect application metrics"""
        from .. import MetricPoint, ApplicationMetrics, MetricType
        
        with self._lock:
            request_times = list(self._request_times)
            request_count = self._request_count
            error_count = self._error_count
            self._request_times.clear()
            self._request_count = 0
            self._error_count = 0
            
        if not request_times:
            request_times = [0]
            
        sorted_times = sorted(request_times)
        count = len(sorted_times)
        
        def percentile(data: List[float], p: float) -> float:
            if not data:
                return 0.0
            k = (len(data) - 1) * p / 100
            f = int(k)
            c = f + 1 if f + 1 < len(data) else f
            return data[f] + (k - f) * (data[c] - data[f]) if c != f else data[f]
            
        app_metrics = ApplicationMetrics(
            request_count=request_count,
            error_count=error_count,
            response_time_ms=sum(request_times) / count,
            response_time_p50=percentile(sorted_times, 50),
            response_time_p90=percentile(sorted_times, 90),
            response_time_p95=percentile(sorted_times, 95),
            response_time_p99=percentile(sorted_times, 99),
            active_connections=self._active_connections,
            queue_length=self._queue_length
        )
        
        return app_metrics.to_metric_points()


class BusinessCollector(BaseCollector):
    """Collects custom business metrics"""
    
    def __init__(self, interval_seconds: int = 10):
        super().__init__("business", interval_seconds)
        self._counters: Dict[str, float] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, deque] = {}
        self._lock = threading.Lock()
        
    def increment_counter(self, name: str, value: float = 1, tags: Dict[str, str] = None):
        """Increment a counter metric"""
        with self._lock:
            key = self._make_key(name, tags)
            self._counters[key] = self._counters.get(key, 0) + value
            
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """Set a gauge metric value"""
        with self._lock:
            key = self._make_key(name, tags)
            self._gauges[key] = value
            
    def record_histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a histogram value"""
        with self._lock:
            key = self._make_key(name, tags)
            if key not in self._histograms:
                self._histograms[key] = deque(maxlen=10000)
            self._histograms[key].append(value)
            
    def _make_key(self, name: str, tags: Dict[str, str] = None) -> str:
        """Create a unique key from name and tags"""
        if not tags:
            return name
        sorted_tags = sorted(tags.items())
        tag_str = ",".join(f"{k}={v}" for k, v in sorted_tags)
        return f"{name}:{tag_str}"
        
    async def collect(self) -> List:
        """Collect business metrics"""
        from .. import MetricPoint, MetricType
        
        metrics = []
        
        with self._lock:
            # Collect counters
            for key, value in self._counters.items():
                name, tags = self._parse_key(key)
                metrics.append(MetricPoint(
                    name=f"business.{name}",
                    value=value,
                    metric_type=MetricType.COUNTER,
                    tags=tags
                ))
            self._counters.clear()
            
            # Collect gauges
            for key, value in self._gauges.items():
                name, tags = self._parse_key(key)
                metrics.append(MetricPoint(
                    name=f"business.{name}",
                    value=value,
                    metric_type=MetricType.GAUGE,
                    tags=tags
                ))
                
            # Collect histograms
            for key, values in self._histograms.items():
                name, tags = self._parse_key(key)
                if values:
                    sorted_values = sorted(values)
                    count = len(sorted_values)
                    
                    def percentile(p: float) -> float:
                        k = (count - 1) * p / 100
                        f = int(k)
                        c = f + 1 if f + 1 < count else f
                        return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])
                    
                    metrics.extend([
                        MetricPoint(f"business.{name}.count", count, metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.sum", sum(values), metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.avg", sum(values) / count, metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.min", min(values), metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.max", max(values), metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.p50", percentile(50), metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.p95", percentile(95), metric_type=MetricType.GAUGE, tags=tags),
                        MetricPoint(f"business.{name}.p99", percentile(99), metric_type=MetricType.GAUGE, tags=tags),
                    ])
                values.clear()
                
        return metrics
        
    def _parse_key(self, key: str) -> tuple:
        """Parse key back to name and tags"""
        if ":" not in key:
            return key, {}
            
        name, tag_str = key.split(":", 1)
        tags = {}
        for part in tag_str.split(","):
            if "=" in part:
                k, v = part.split("=", 1)
                tags[k] = v
        return name, tags


class CollectorManager:
    """Manages all collectors"""
    
    def __init__(self):
        self.collectors: Dict[str, BaseCollector] = {}
        self._metrics_callback: Optional[Callable] = None
        
    def set_metrics_callback(self, callback: Callable):
        """Set callback for all collected metrics"""
        self._metrics_callback = callback
        
    def add_collector(self, collector: BaseCollector):
        """Add a collector"""
        self.collectors[collector.name] = collector
        if self._metrics_callback:
            collector.add_callback(self._metrics_callback)
            
    def get_collector(self, name: str) -> Optional[BaseCollector]:
        """Get collector by name"""
        return self.collectors.get(name)
        
    async def start_all(self):
        """Start all collectors"""
        for collector in self.collectors.values():
            collector.start()
            
    async def stop_all(self):
        """Stop all collectors"""
        for collector in self.collectors.values():
            await collector.stop()
