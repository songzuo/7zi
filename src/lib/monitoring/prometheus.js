"use strict";
/**
 * Prometheus/OpenMetrics Exporter
 * 标准化的 Prometheus 指标导出器
 *
 * 功能：
 * - 导出 Prometheus 格式的指标
 * - 支持多种指标类型 (Counter, Gauge, Histogram, Summary)
 * - 自动生成指标元数据
 * - 兼容 Prometheus/Grafana 监控栈
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prometheusExporter = exports.PrometheusExporter = void 0;
exports.exportPrometheusMetrics = exportPrometheusMetrics;
var api_performance_1 = require("@/lib/middleware/api-performance");
var rate_limit_1 = require("@/lib/middleware/rate-limit");
var db_performance_1 = require("@/lib/middleware/db-performance");
var logger_1 = require("@/lib/logger");
// ============================================
// 指标生成器
// ============================================
var PrometheusExporter = /** @class */ (function () {
    function PrometheusExporter() {
    }
    /**
     * 生成所有 Prometheus 指标
     */
    PrometheusExporter.prototype.export = function () {
        return __awaiter(this, void 0, void 0, function () {
            var lines, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        lines = [];
                        _b = 
                        // 系统指标
                        (_a = lines.push).apply;
                        _c = [
                            // 系统指标
                            lines];
                        return [4 /*yield*/, this.generateSystemMetrics()];
                    case 1:
                        // 系统指标
                        _b.apply(_a, _c.concat([(_d.sent())]));
                        // HTTP 指标
                        lines.push.apply(lines, this.generateHttpMetrics());
                        // 数据库指标
                        lines.push.apply(lines, this.generateDatabaseMetrics());
                        // 速率限制指标
                        lines.push.apply(lines, this.generateRateLimitMetrics());
                        return [2 /*return*/, lines.join('\n') + '\n'];
                }
            });
        });
    };
    /**
     * 生成系统指标
     */
    PrometheusExporter.prototype.generateSystemMetrics = function () {
        var lines = [];
        var memUsage = process.memoryUsage();
        var uptime = process.uptime();
        // 内存指标
        lines.push(this.formatMetric({
            name: 'nodejs_heap_size_total_bytes',
            type: 'gauge',
            help: 'Process heap size from Node.js in bytes',
            value: memUsage.heapTotal,
        }), this.formatMetric({
            name: 'nodejs_heap_size_used_bytes',
            type: 'gauge',
            help: 'Process heap size used from Node.js in bytes',
            value: memUsage.heapUsed,
        }), this.formatMetric({
            name: 'nodejs_external_memory_bytes',
            type: 'gauge',
            help: 'Node.js external memory size in bytes',
            value: memUsage.external,
        }), this.formatMetric({
            name: 'nodejs_process_resident_set_size_bytes',
            type: 'gauge',
            help: 'Resident set size',
            value: memUsage.rss,
        }));
        // 运行时间
        lines.push(this.formatMetric({
            name: 'process_uptime_seconds',
            type: 'gauge',
            help: 'Process uptime in seconds',
            value: uptime,
        }));
        // 事件循环延迟 (近似)
        lines.push(this.formatMetric({
            name: 'nodejs_eventloop_lag_seconds',
            type: 'gauge',
            help: 'Lag of event loop in seconds',
            value: 0, // 需要实际测量
        }));
        return lines;
    };
    /**
     * 生成 HTTP 指标
     */
    PrometheusExporter.prototype.generateHttpMetrics = function () {
        var _this = this;
        var lines = [];
        var report = (0, api_performance_1.getApiPerformanceReport)();
        // 请求总数
        lines.push(this.formatMetric({
            name: 'http_requests_total',
            type: 'counter',
            help: 'Total number of HTTP requests',
            value: report.summary.totalRequests,
        }));
        // 成功请求数
        lines.push(this.formatMetric({
            name: 'http_requests_success_total',
            type: 'counter',
            help: 'Total number of successful HTTP requests',
            value: report.summary.successfulRequests,
        }));
        // 失败请求数
        lines.push(this.formatMetric({
            name: 'http_requests_error_total',
            type: 'counter',
            help: 'Total number of failed HTTP requests',
            value: report.summary.failedRequests,
        }));
        // 慢请求数
        lines.push(this.formatMetric({
            name: 'http_requests_slow_total',
            type: 'counter',
            help: 'Total number of slow HTTP requests (>500ms)',
            value: report.summary.slowRequests,
        }));
        // 按状态码分组的请求
        Object.entries(report.summary.errors).forEach(function (_a) {
            var statusCode = _a[0], count = _a[1];
            lines.push(_this.formatMetric({
                name: 'http_requests_by_status_total',
                type: 'counter',
                help: 'Total number of HTTP requests by status code',
                value: count,
                labels: { status: statusCode },
            }));
        });
        // 平均响应时间
        lines.push(this.formatMetric({
            name: 'http_request_duration_seconds',
            type: 'gauge',
            help: 'Average HTTP request duration in seconds',
            value: report.summary.averageDuration / 1000,
        }));
        // 最大响应时间
        lines.push(this.formatMetric({
            name: 'http_request_duration_max_seconds',
            type: 'gauge',
            help: 'Maximum HTTP request duration in seconds',
            value: report.summary.maxDuration / 1000,
        }));
        // 最小响应时间
        lines.push(this.formatMetric({
            name: 'http_request_duration_min_seconds',
            type: 'gauge',
            help: 'Minimum HTTP request duration in seconds',
            value: report.summary.minDuration / 1000,
        }));
        // 按路由分组的指标
        Object.entries(report.routes).forEach(function (_a) {
            var route = _a[0], stats = _a[1];
            lines.push(_this.formatMetric({
                name: 'http_requests_by_route_total',
                type: 'counter',
                help: 'Total number of HTTP requests by route',
                value: stats.count,
                labels: { route: route },
            }), _this.formatMetric({
                name: 'http_request_duration_by_route_seconds',
                type: 'gauge',
                help: 'Average HTTP request duration by route in seconds',
                value: stats.avgDuration / 1000,
                labels: { route: route },
            }), _this.formatMetric({
                name: 'http_error_rate_by_route',
                type: 'gauge',
                help: 'HTTP error rate by route (0-1)',
                value: stats.errorRate / 100,
                labels: { route: route },
            }));
        });
        // P95 和 P99 响应时间 (需要从实际数据计算)
        var p95 = this.calculatePercentile(report.slowRequests, 0.95);
        var p99 = this.calculatePercentile(report.slowRequests, 0.99);
        if (p95 !== null) {
            lines.push(this.formatMetric({
                name: 'http_request_duration_p95_seconds',
                type: 'gauge',
                help: 'P95 HTTP request duration in seconds',
                value: p95 / 1000,
            }));
        }
        if (p99 !== null) {
            lines.push(this.formatMetric({
                name: 'http_request_duration_p99_seconds',
                type: 'gauge',
                help: 'P99 HTTP request duration in seconds',
                value: p99 / 1000,
            }));
        }
        return lines;
    };
    /**
     * 生成数据库指标
     */
    PrometheusExporter.prototype.generateDatabaseMetrics = function () {
        var _this = this;
        var lines = [];
        var dbSummary = (0, db_performance_1.getQueryMetricsSummary)();
        // 查询总数
        lines.push(this.formatMetric({
            name: 'db_queries_total',
            type: 'counter',
            help: 'Total number of database queries',
            value: dbSummary.total,
        }));
        // 平均查询时间
        lines.push(this.formatMetric({
            name: 'db_query_duration_seconds',
            type: 'gauge',
            help: 'Average database query duration in seconds',
            value: dbSummary.avgDuration / 1000,
        }));
        // 慢查询数
        lines.push(this.formatMetric({
            name: 'db_queries_slow_total',
            type: 'counter',
            help: 'Total number of slow database queries',
            value: dbSummary.slowQueries.length,
        }));
        // 查询成功率
        lines.push(this.formatMetric({
            name: 'db_query_success_rate',
            type: 'gauge',
            help: 'Database query success rate (0-1)',
            value: dbSummary.successRate,
        }));
        // 按操作类型分组的指标
        Object.entries(dbSummary.byOperation).forEach(function (_a) {
            var operation = _a[0], stats = _a[1];
            lines.push(_this.formatMetric({
                name: 'db_queries_by_operation_total',
                type: 'counter',
                help: 'Total number of database queries by operation type',
                value: stats.count,
                labels: { operation: operation },
            }), _this.formatMetric({
                name: 'db_query_duration_by_operation_seconds',
                type: 'gauge',
                help: 'Average database query duration by operation type in seconds',
                value: stats.avgDuration / 1000,
                labels: { operation: operation },
            }), _this.formatMetric({
                name: 'db_query_error_rate_by_operation',
                type: 'gauge',
                help: 'Database query error rate by operation type (0-1)',
                value: stats.errorRate,
                labels: { operation: operation },
            }));
        });
        return lines;
    };
    /**
     * 生成速率限制指标
     */
    PrometheusExporter.prototype.generateRateLimitMetrics = function () {
        var lines = [];
        var rateLimitStats = (0, rate_limit_1.getRateLimitStats)();
        // 总条目数
        lines.push(this.formatMetric({
            name: 'rate_limit_entries_total',
            type: 'gauge',
            help: 'Total number of rate limit entries',
            value: rateLimitStats.totalEntries,
        }));
        // 追踪的路径数
        lines.push(this.formatMetric({
            name: 'rate_limit_tracked_paths',
            type: 'gauge',
            help: 'Number of paths with rate limiting',
            value: rateLimitStats.trackedPaths.length,
        }));
        // 总请求数
        lines.push(this.formatMetric({
            name: 'rate_limit_requests_total',
            type: 'counter',
            help: 'Total number of rate-limited requests',
            value: rateLimitStats.totalRequests,
        }));
        return lines;
    };
    /**
     * 计算百分位数
     */
    PrometheusExporter.prototype.calculatePercentile = function (metrics, percentile) {
        if (metrics.length === 0)
            return null;
        var sorted = __spreadArray([], metrics, true).sort(function (a, b) { return a.duration - b.duration; });
        var index = Math.ceil(sorted.length * percentile) - 1;
        return sorted[Math.max(0, index)].duration;
    };
    /**
     * 格式化 Prometheus 指标
     */
    PrometheusExporter.prototype.formatMetric = function (metric) {
        var _this = this;
        var lines = [];
        // HELP 注释
        lines.push("# HELP ".concat(metric.name, " ").concat(metric.help));
        // TYPE 注释
        lines.push("# TYPE ".concat(metric.name, " ").concat(metric.type));
        // 指标值
        var labels = metric.labels
            ? "{".concat(Object.entries(metric.labels)
                .map(function (_a) {
                var k = _a[0], v = _a[1];
                return "".concat(k, "=\"").concat(_this.escapeLabelValue(v), "\"");
            })
                .join(','), "}")
            : '';
        lines.push("".concat(metric.name).concat(labels, " ").concat(metric.value));
        return lines.join('\n');
    };
    /**
     * 转义标签值
     */
    PrometheusExporter.prototype.escapeLabelValue = function (value) {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    };
    return PrometheusExporter;
}());
exports.PrometheusExporter = PrometheusExporter;
// ============================================
// 单例
// ============================================
exports.prometheusExporter = new PrometheusExporter();
// ============================================
// 便捷函数
// ============================================
/**
 * 导出 Prometheus 指标
 */
function exportPrometheusMetrics() {
    return __awaiter(this, void 0, void 0, function () {
        var metrics, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, exports.prometheusExporter.export()];
                case 1:
                    metrics = _a.sent();
                    logger_1.logger.debug('[Prometheus] Metrics exported successfully');
                    return [2 /*return*/, metrics];
                case 2:
                    error_1 = _a.sent();
                    logger_1.logger.error('[Prometheus] Failed to export metrics', error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
