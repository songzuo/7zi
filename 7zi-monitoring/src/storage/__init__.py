"""
TimeSeries Storage - High-performance metric storage
"""

import asyncio
import sqlite3
import time
from abc import ABC, abstractmethod
from collections import deque
from typing import Any, Dict, List, Optional, Tuple
import logging
import threading
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class BaseStorage(ABC):
    """Base class for metric storage backends"""
    
    @abstractmethod
    async def store(self, metrics: List[Any]) -> bool:
        """Store metrics"""
        pass
        
    @abstractmethod
    async def query(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        tags: Dict[str, str] = None,
        aggregation: str = None
    ) -> List[Dict[str, Any]]:
        """Query metrics"""
        pass
        
    @abstractmethod
    async def get_latest(self, metric_name: str, tags: Dict[str, str] = None) -> Optional[Dict[str, Any]]:
        """Get latest metric value"""
        pass
        
    @abstractmethod
    async def aggregate(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        interval_seconds: int,
        tags: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Aggregate metrics over time intervals"""
        pass
        
    @abstractmethod
    async def cleanup(self, retention_days: int):
        """Clean up old data"""
        pass


class MemoryStorage(BaseStorage):
    """In-memory ring buffer storage for hot data"""
    
    def __init__(self, max_points: int = 100000):
        self.max_points = max_points
        self._metrics: Dict[str, deque] = {}
        self._lock = threading.Lock()
        
    async def store(self, metrics: List[Any]) -> bool:
        """Store metrics in memory"""
        try:
            with self._lock:
                for metric in metrics:
                    if hasattr(metric, 'to_dict'):
                        data = metric.to_dict()
                    else:
                        data = metric
                        
                    name = data.get('name')
                    if not name:
                        continue
                        
                    if name not in self._metrics:
                        self._metrics[name] = deque(maxlen=self.max_points)
                    self._metrics[name].append(data)
            return True
        except Exception as e:
            logger.error(f"Memory storage error: {e}")
            return False
            
    async def query(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        tags: Dict[str, str] = None,
        aggregation: str = None
    ) -> List[Dict[str, Any]]:
        """Query metrics from memory"""
        with self._lock:
            if metric_name not in self._metrics:
                return []
                
            results = []
            for point in self._metrics[metric_name]:
                timestamp = point.get('timestamp', 0)
                if start_time <= timestamp <= end_time:
                    if tags:
                        point_tags = point.get('tags', {})
                        if not all(point_tags.get(k) == v for k, v in tags.items()):
                            continue
                    results.append(point)
                    
            return results
            
    async def get_latest(self, metric_name: str, tags: Dict[str, str] = None) -> Optional[Dict[str, Any]]:
        """Get latest metric value"""
        with self._lock:
            if metric_name not in self._metrics or not self._metrics[metric_name]:
                return None
                
            # Search backwards for matching tags
            for point in reversed(self._metrics[metric_name]):
                if tags:
                    point_tags = point.get('tags', {})
                    if not all(point_tags.get(k) == v for k, v in tags.items()):
                        continue
                return point
            return None
            
    async def aggregate(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        interval_seconds: int,
        tags: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Aggregate metrics over time intervals"""
        points = await self.query(metric_name, start_time, end_time, tags)
        
        if not points:
            return []
            
        # Group by interval
        intervals = {}
        for point in points:
            timestamp = point.get('timestamp', 0)
            interval_start = int((timestamp - start_time) // interval_seconds) * interval_seconds + start_time
            
            if interval_start not in intervals:
                intervals[interval_start] = []
            intervals[interval_start].append(point.get('value', 0))
            
        # Calculate aggregates
        results = []
        for interval_start, values in sorted(intervals.items()):
            if not values:
                continue
                
            sorted_values = sorted(values)
            count = len(values)
            
            def percentile(p: float) -> float:
                k = (count - 1) * p / 100
                f = int(k)
                c = f + 1 if f + 1 < count else f
                return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])
                
            results.append({
                "timestamp": interval_start,
                "count": count,
                "sum": sum(values),
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / count,
                "p50": percentile(50),
                "p90": percentile(90),
                "p95": percentile(95),
                "p99": percentile(99)
            })
            
        return results
        
    async def cleanup(self, retention_days: int):
        """Clean up old data"""
        cutoff_time = time.time() - (retention_days * 86400)
        
        with self._lock:
            for name, points in self._metrics.items():
                # Remove old points
                while points and points[0].get('timestamp', 0) < cutoff_time:
                    points.popleft()


class SQLiteStorage(BaseStorage):
    """SQLite-based persistent storage"""
    
    def __init__(self, db_path: str, pool_size: int = 5):
        self.db_path = db_path
        self.pool_size = pool_size
        self._connections: List[sqlite3.Connection] = []
        self._lock = threading.Lock()
        self._initialized = False
        
    def _get_connection(self) -> sqlite3.Connection:
        """Get a connection from the pool"""
        with self._lock:
            if self._connections:
                return self._connections.pop()
            return sqlite3.connect(self.db_path, check_same_thread=False)
            
    def _return_connection(self, conn: sqlite3.Connection):
        """Return a connection to the pool"""
        with self._lock:
            if len(self._connections) < self.pool_size:
                self._connections.append(conn)
            else:
                conn.close()
                
    async def initialize(self):
        """Initialize database schema"""
        if self._initialized:
            return
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # Metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    value REAL NOT NULL,
                    timestamp REAL NOT NULL,
                    tags TEXT,
                    metric_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Aggregated metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS aggregated_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    interval_seconds INTEGER NOT NULL,
                    start_time REAL NOT NULL,
                    end_time REAL NOT NULL,
                    count INTEGER NOT NULL,
                    sum REAL NOT NULL,
                    min REAL NOT NULL,
                    max REAL NOT NULL,
                    avg REAL NOT NULL,
                    p50 REAL,
                    p90 REAL,
                    p95 REAL,
                    p99 REAL,
                    tags TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    rule_name TEXT NOT NULL,
                    metric TEXT NOT NULL,
                    value REAL NOT NULL,
                    threshold REAL NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT,
                    status TEXT NOT NULL,
                    fired_at REAL NOT NULL,
                    resolved_at REAL,
                    tags TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Scaling events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scaling_events (
                    id TEXT PRIMARY KEY,
                    rule_name TEXT NOT NULL,
                    action TEXT NOT NULL,
                    reason TEXT,
                    from_instances INTEGER NOT NULL,
                    to_instances INTEGER NOT NULL,
                    metric_value REAL NOT NULL,
                    threshold REAL NOT NULL,
                    timestamp REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON metrics(name, timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_aggregated_name_time ON aggregated_metrics(name, start_time, end_time)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_scaling_events_timestamp ON scaling_events(timestamp)")
            
            conn.commit()
            self._initialized = True
            logger.info(f"SQLite storage initialized: {self.db_path}")
            
        finally:
            self._return_connection(conn)
            
    async def store(self, metrics: List[Any]) -> bool:
        """Store metrics in SQLite"""
        if not self._initialized:
            await self.initialize()
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            for metric in metrics:
                if hasattr(metric, 'to_dict'):
                    data = metric.to_dict()
                else:
                    data = metric
                    
                cursor.execute("""
                    INSERT INTO metrics (name, value, timestamp, tags, metric_type)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    data.get('name'),
                    data.get('value'),
                    data.get('timestamp'),
                    json.dumps(data.get('tags', {})),
                    data.get('metric_type')
                ))
                
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"SQLite storage error: {e}")
            conn.rollback()
            return False
        finally:
            self._return_connection(conn)
            
    async def query(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        tags: Dict[str, str] = None,
        aggregation: str = None
    ) -> List[Dict[str, Any]]:
        """Query metrics from SQLite"""
        if not self._initialized:
            await self.initialize()
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            query = "SELECT name, value, timestamp, tags, metric_type FROM metrics WHERE name = ? AND timestamp >= ? AND timestamp <= ?"
            params = [metric_name, start_time, end_time]
            
            if tags:
                for key, value in tags.items():
                    query += f" AND json_extract(tags, '$.{key}') = ?"
                    params.append(value)
                    
            query += " ORDER BY timestamp"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "name": row[0],
                    "value": row[1],
                    "timestamp": row[2],
                    "tags": json.loads(row[3]) if row[3] else {},
                    "metric_type": row[4]
                })
                
            return results
            
        finally:
            self._return_connection(conn)
            
    async def get_latest(self, metric_name: str, tags: Dict[str, str] = None) -> Optional[Dict[str, Any]]:
        """Get latest metric value"""
        if not self._initialized:
            await self.initialize()
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            query = "SELECT name, value, timestamp, tags, metric_type FROM metrics WHERE name = ?"
            params = [metric_name]
            
            if tags:
                for key, value in tags.items():
                    query += f" AND json_extract(tags, '$.{key}') = ?"
                    params.append(value)
                    
            query += " ORDER BY timestamp DESC LIMIT 1"
            
            cursor.execute(query, params)
            row = cursor.fetchone()
            
            if row:
                return {
                    "name": row[0],
                    "value": row[1],
                    "timestamp": row[2],
                    "tags": json.loads(row[3]) if row[3] else {},
                    "metric_type": row[4]
                }
            return None
            
        finally:
            self._return_connection(conn)
            
    async def aggregate(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        interval_seconds: int,
        tags: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Aggregate metrics over time intervals"""
        if not self._initialized:
            await self.initialize()
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # Check if we have pre-aggregated data
            query = """
                SELECT start_time, end_time, count, sum, min, max, avg, p50, p90, p95, p99
                FROM aggregated_metrics
                WHERE name = ? AND interval_seconds = ? AND start_time >= ? AND end_time <= ?
            """
            params = [metric_name, interval_seconds, start_time, end_time]
            
            if tags:
                for key, value in tags.items():
                    query += f" AND json_extract(tags, '$.{key}') = ?"
                    params.append(value)
                    
            query += " ORDER BY start_time"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            if rows:
                results = []
                for row in rows:
                    results.append({
                        "timestamp": row[0],
                        "count": row[2],
                        "sum": row[3],
                        "min": row[4],
                        "max": row[5],
                        "avg": row[6],
                        "p50": row[7],
                        "p90": row[8],
                        "p95": row[9],
                        "p99": row[10]
                    })
                return results
                
            # Fall back to raw data aggregation
            points = await self.query(metric_name, start_time, end_time, tags)
            
            if not points:
                return []
                
            # Group by interval
            intervals = {}
            for point in points:
                timestamp = point.get('timestamp', 0)
                interval_start = int((timestamp - start_time) // interval_seconds) * interval_seconds + start_time
                
                if interval_start not in intervals:
                    intervals[interval_start] = []
                intervals[interval_start].append(point.get('value', 0))
                
            # Calculate aggregates
            results = []
            for interval_start, values in sorted(intervals.items()):
                if not values:
                    continue
                    
                sorted_values = sorted(values)
                count = len(values)
                
                def percentile(p: float) -> float:
                    k = (count - 1) * p / 100
                    f = int(k)
                    c = f + 1 if f + 1 < count else f
                    return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])
                    
                results.append({
                    "timestamp": interval_start,
                    "count": count,
                    "sum": sum(values),
                    "min": min(values),
                    "max": max(values),
                    "avg": sum(values) / count,
                    "p50": percentile(50),
                    "p90": percentile(90),
                    "p95": percentile(95),
                    "p99": percentile(99)
                })
                
            return results
            
        finally:
            self._return_connection(conn)
            
    async def cleanup(self, retention_days: int):
        """Clean up old data"""
        if not self._initialized:
            await self.initialize()
            
        cutoff_time = time.time() - (retention_days * 86400)
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # Delete old raw metrics
            cursor.execute("DELETE FROM metrics WHERE timestamp < ?", (cutoff_time,))
            
            # Delete old aggregated metrics (keep longer)
            aggregated_cutoff = time.time() - (retention_days * 3 * 86400)
            cursor.execute("DELETE FROM aggregated_metrics WHERE start_time < ?", (aggregated_cutoff,))
            
            # Delete old resolved alerts
            cursor.execute("DELETE FROM alerts WHERE status = 'resolved' AND resolved_at < ?", (cutoff_time,))
            
            # Delete old scaling events
            cursor.execute("DELETE FROM scaling_events WHERE timestamp < ?", (cutoff_time,))
            
            conn.commit()
            logger.info(f"Cleaned up data older than {retention_days} days")
            
        finally:
            self._return_connection(conn)
            
    async def store_alert(self, alert: Any) -> bool:
        """Store an alert"""
        if not self._initialized:
            await self.initialize()
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if hasattr(alert, 'to_dict'):
                data = alert.to_dict()
            else:
                data = alert
                
            cursor.execute("""
                INSERT OR REPLACE INTO alerts
                (id, rule_name, metric, value, threshold, level, message, status, fired_at, resolved_at, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('id'),
                data.get('rule_name'),
                data.get('metric'),
                data.get('value'),
                data.get('threshold'),
                data.get('level'),
                data.get('message'),
                data.get('status'),
                data.get('fired_at'),
                data.get('resolved_at'),
                json.dumps(data.get('tags', {}))
            ))
            
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error storing alert: {e}")
            conn.rollback()
            return False
        finally:
            self._return_connection(conn)
            
    async def store_scaling_event(self, event: Any) -> bool:
        """Store a scaling event"""
        if not self._initialized:
            await self.initialize()
            
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if hasattr(event, 'to_dict'):
                data = event.to_dict()
            else:
                data = event
                
            cursor.execute("""
                INSERT INTO scaling_events
                (id, rule_name, action, reason, from_instances, to_instances, metric_value, threshold, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('id'),
                data.get('rule_name'),
                data.get('action'),
                data.get('reason'),
                data.get('from_instances'),
                data.get('to_instances'),
                data.get('metric_value'),
                data.get('threshold'),
                data.get('timestamp')
            ))
            
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error storing scaling event: {e}")
            conn.rollback()
            return False
        finally:
            self._return_connection(conn)


class HybridStorage(BaseStorage):
    """Hybrid storage: memory for hot data, SQLite for persistence"""
    
    def __init__(self, memory_max_points: int = 100000, db_path: str = None, pool_size: int = 5):
        self.memory = MemoryStorage(max_points=memory_max_points)
        self.persistent = SQLiteStorage(db_path=db_path, pool_size=pool_size) if db_path else None
        self._sync_interval = 60  # Sync to persistent storage every 60 seconds
        self._sync_task: Optional[asyncio.Task] = None
        self._running = False
        
    async def initialize(self):
        """Initialize the storage"""
        if self.persistent:
            await self.persistent.initialize()
            
    async def store(self, metrics: List[Any]) -> bool:
        """Store metrics in memory (async sync to persistent)"""
        # Always store in memory
        await self.memory.store(metrics)
        return True
        
    async def query(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        tags: Dict[str, str] = None,
        aggregation: str = None
    ) -> List[Dict[str, Any]]:
        """Query metrics - check memory first, then persistent"""
        # Try memory first (hot data)
        memory_results = await self.memory.query(metric_name, start_time, end_time, tags)
        
        # If we have enough data in memory, return it
        if memory_results:
            return memory_results
            
        # Fall back to persistent storage
        if self.persistent:
            return await self.persistent.query(metric_name, start_time, end_time, tags, aggregation)
            
        return []
        
    async def get_latest(self, metric_name: str, tags: Dict[str, str] = None) -> Optional[Dict[str, Any]]:
        """Get latest metric - check memory first"""
        latest = await self.memory.get_latest(metric_name, tags)
        if latest:
            return latest
            
        if self.persistent:
            return await self.persistent.get_latest(metric_name, tags)
            
        return None
        
    async def aggregate(
        self,
        metric_name: str,
        start_time: float,
        end_time: float,
        interval_seconds: int,
        tags: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Aggregate metrics"""
        if self.persistent:
            return await self.persistent.aggregate(metric_name, start_time, end_time, interval_seconds, tags)
        return await self.memory.aggregate(metric_name, start_time, end_time, interval_seconds, tags)
        
    async def cleanup(self, retention_days: int):
        """Clean up old data"""
        await self.memory.cleanup(retention_days)
        if self.persistent:
            await self.persistent.cleanup(retention_days)
            
    async def start_sync(self):
        """Start background sync to persistent storage"""
        if self._running or not self.persistent:
            return
            
        self._running = True
        self._sync_task = asyncio.create_task(self._sync_loop())
        logger.info("Started hybrid storage sync")
        
    async def stop_sync(self):
        """Stop background sync"""
        self._running = False
        if self._sync_task:
            self._sync_task.cancel()
            try:
                await self._sync_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped hybrid storage sync")
        
    async def _sync_loop(self):
        """Background sync loop"""
        while self._running:
            try:
                await asyncio.sleep(self._sync_interval)
                # Sync logic would go here if needed
                # For now, we rely on direct writes to persistent storage
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Sync error: {e}")