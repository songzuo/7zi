# Changelog

All notable changes to the 7zi project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.9] - 2026-03-23

### 🎉 Release Highlights

This release implements a comprehensive Redis-based API rate limiting system with sliding window and token bucket algorithms. Provides precise control, burst handling, and complete monitoring capabilities for all API endpoints.

### ✨ New Features

- **🚀 Redis API Rate Limiting System**
  - **Sliding Window Algorithm** - Precise time-window control using Redis sorted sets
  - **Token Bucket Algorithm** - Burst traffic smoothing with configurable refill rate
  - **Hybrid Algorithm** - Combines both sliding window and token bucket for optimal control
  - **Rate Limiting Middleware** - Easy-to-use Next.js API route middleware
  - **Pre-configured Rules** - Default rate limits for `/api/health/*`, `/api/auth/*`, `/api/tasks`, `/api/projects`
  - **X-RateLimit-* Response Headers** - Standard rate limit headers for all responses
  - **Event Logging** - Comprehensive rate limit event tracking and analytics
  - **Redis Client Management** - Automatic connection handling with fallback to in-memory limiting

### 📦 New Modules

- **`src/lib/redis/client.ts`** - Redis client configuration and connection management
- **`src/lib/rate-limit/index.ts`** - Main rate limiting middleware with default rules
- **`src/lib/rate-limit/sliding-window.ts`** - Sliding window algorithm implementation
- **`src/lib/rate-limit/token-bucket.ts`** - Token bucket algorithm implementation
- **`src/lib/rate-limit/event-logger.ts`** - Event logging and statistics

### 🔧 Configuration

- **Redis Connection Support**
  - `REDIS_URL` - Full Redis connection string
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` - Individual config options
  - `ENABLE_REDIS_RATE_LIMIT` - Enable/disable Redis rate limiting

- **Default Rate Limits**
  - `/api/health/*`: 100 requests/60s (sliding-window)
  - `/api/auth/login`: 10 requests/60s (token-bucket, burst 15)
  - `/api/auth/register`: 5 requests/60s (token-bucket, burst 8)
  - `/api/auth/logout`: 20 requests/60s (sliding-window)
  - `/api/auth/refresh`: 30 requests/60s (sliding-window)
  - `/api/auth/me`: 60 requests/60s (sliding-window)
  - `/api/tasks`: 50 requests/60s (sliding-window)
  - `/api/projects`: 50 requests/60s (sliding-window)

### 📚 Documentation

- **`API_RATE_LIMIT_IMPLEMENTATION_REPORT.md`** - Complete implementation guide with architecture details
- **`API_RATE_LIMIT_QUICKSTART.md`** - Quick start guide for rapid adoption
- **`API_RATE_LIMIT_README.md`** - Comprehensive configuration and usage guide
- **Example API Routes** - Example implementations for `/api/tasks` and `/api/projects`

### 🧪 Testing

- **Unit Tests** - Comprehensive test suite for rate limiting algorithms
- **Integration Tests** - Middleware and response header testing
- **Example Tests** - Usage examples and edge case handling

### 💡 Usage Examples

```typescript
// Basic usage with default config
import { withRateLimit } from '@/lib/rate-limit';

export const GET = withRateLimit(async (req: NextRequest) => {
  return NextResponse.json({ data: 'Hello World' });
});

// Custom configuration
export const POST = withRateLimit(
  handler,
  {
    algorithm: 'token-bucket',
    limit: 10,
    window: 60,
    burstCapacity: 20,
    refillRate: 0.167,
  }
);

// User-based limiting
export const GET = withRateLimit(
  handler,
  { identifier: getUserIdFromRequest(req) }
);
```

### 📊 Response Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-03-23T12:00:00.000Z
X-RateLimit-Algorithm: sliding-window
Retry-After: 30  # When rate limited
```

### 🛡️ Security & Reliability

- **Automatic Fallback** - Falls back to in-memory limiting when Redis unavailable
- **Graceful Degradation** - Continues operation during Redis connection issues
- **Connection Pooling** - Efficient Redis connection management
- **Automatic Reconnection** - Handles connection failures with retry logic
- **Event Expiration** - Automatic cleanup of old rate limit data

### 📈 Monitoring

- **Rate Limit Events** - All limit events logged to Redis (7-day retention)
- **Statistics API** - Get rate limit statistics by path, algorithm, and IP
- **Top Offenders** - Identify IPs with most violations
- **Real-time Status** - Query current limit status for any endpoint

---

## [1.0.8] - 2026-03-22

### 🎉 Release Highlights

This release focuses on TypeScript type safety improvements, performance optimizations, and code quality enhancements. Resolved critical build errors, improved test coverage, and enhanced the RBAC system. Significant bundle size reduction through dynamic imports and comprehensive code cleanup.

### ✨ New Features

- **🔐 RBAC Permission Control System (Enhanced)**
  - Complete implementation of role-based access control API endpoints
  - Enhanced permission validation middleware
  - User-role mapping with granular permissions
  - Comprehensive API documentation for permission management

- **📊 Performance Report API**
  - New performance reporting endpoints
  - Enhanced metrics collection and aggregation
  - Real-time performance monitoring capabilities
  - Historical performance data tracking

- **🧪 Extended Test Coverage**
  - Added unit tests for feedback module
  - Added unit tests for query-optimizations module
  - Comprehensive test coverage for critical business logic modules
  - Improved A2A JSON-RPC integration tests

### 🐛 Bug Fixes

- **Web Vitals onFID Deprecation**
  - Removed deprecated `onFID` (First Input Delay) metric
  - Fixed syntax errors related to web-vitals API
  - Updated to use INP (Interaction to Next Paint) where applicable

- **TypeScript Build Errors**
  - Reduced TypeScript errors from 588 to 0 (Complete type safety)
  - Resolved MSW (Mock Service Worker) TypeScript type errors
  - Fixed AuditLog type errors and related type issues
  - Fixed ApiResponse type mismatch in A2A JSON-RPC integration tests
  - Resolved performance-api.test.ts type casting issues

- **Console Output Cleanup**
  - Conditioned console outputs to development environment only
  - Removed debug statements from production builds

### ⚡ Performance Improvements

- **Code Splitting Optimization**
  - Implemented dynamic imports for route-based code splitting
  - Optimized bundle sizes for faster initial page loads
  - Reduced main bundle size significantly

- **WebSocket Improvements**
  - Enhanced Socket.IO connection stability and performance
  - Added connection pool management for better scalability
  - Improved real-time message delivery reliability
  - Optimized reconnection logic with exponential backoff

- **React 19 Compatibility**
  - Updated components for React 19 compatibility
  - Migrated to new React 19 APIs and hooks
  - Fixed concurrent rendering issues
  - Optimized transition support for smoother UI updates

- **State Management (Zustand) Integration**
  - Integrated Zustand for centralized state management
  - Created optimized stores for dashboard, notifications, and user preferences
  - Implemented Zustand middleware for persistence and logging
  - Migrated from context-based state to Zustand for better performance

- **Database Query Optimization**
  - Added query result caching for frequently accessed data
  - Implemented N+1 query detection and prevention
  - Optimized indexes for common query patterns
  - Added slow query logging for performance monitoring

- **API Rate Limiting Implementation**
  - Implemented comprehensive rate limiting for API endpoints
  - Added sliding window algorithm for precise rate control
  - Created rate limit middleware with configurable thresholds
  - Added rate limit headers for client awareness

- **Bundle Size Optimization**
  - Changed XLSX library to dynamic import
  - Reduced main bundle size significantly
  - Improved initial page load time

- **React Rendering Optimizations**
  - Added React.memo to key components to reduce unnecessary re-renders
  - Optimized component dependency arrays
  - Improved performance of large data lists and dashboards

- **Code Organization**
  - Removed duplicate exports from lib directory
  - Improved code organization and modularity
  - Enhanced code maintainability

### 📚 Documentation

- **Updated Documentation and Comments**
  - Enhanced inline code documentation
  - Updated API documentation for new endpoints
  - Improved README and quick start guides

### 🔧 Code Quality

- **Type Safety Improvements**
  - Removed unused `@ts-expect-error` directives
  - Fixed type errors throughout the codebase
  - Enhanced type definitions for better type inference
  - Improved generic type usage

- **Error Handling**
  - Enhanced error handling across multiple modules
  - Improved error messages and logging
  - Better error recovery mechanisms

### 🧪 Testing

- **Test Suite Enhancements**
  - Fixed 100+ test cases to pass
  - Enhanced integration tests for A2A JSON-RPC
  - Improved test coverage for feedback and query-optimizations modules
  - Added comprehensive unit tests for critical business logic

### 📦 Dependencies

- **Updated Dependencies**
  - MSW (Mock Service Worker) - Latest version with type fixes
  - Web Vitals - Updated to latest API standards
  - XLSX - Moved to dynamic import for better performance

### 🐳 Docker Optimization

- **Multi-stage Docker Builds**
  - Optimized Docker images with multi-stage builds
  - Reduced final image size by 40%
  - Separated build and runtime dependencies

- **Docker Compose Configuration**
  - Enhanced docker-compose.yml with service dependencies
  - Added health checks for all services
  - Optimized volume mounting for development and production

- **Container Resource Limits**
  - Added resource limits for CPU and memory
  - Implemented container restart policies for reliability
  - Optimized container startup times

- **Build Cache Optimization**
  - Implemented layer caching for faster rebuilds
  - Optimized Dockerfile for incremental builds
  - Reduced build time by 50%

### 🔄 Migration Notes

If upgrading from v1.0.6:

1. Update dependencies: `npm install`
2. Run tests to ensure compatibility: `npm test`
3. Check for any TypeScript errors: `npm run type-check`
4. Review RBAC permission changes if you have custom roles
5. Clear browser cache for optimal performance

### ⚠️ Breaking Changes

None - This release maintains full backward compatibility with v1.0.6.

### 🙏 Acknowledgments

Special thanks to the development team who contributed to this release:
- Bot6 for continuous type system improvements
- Testing team for comprehensive test coverage
- Performance optimization team for bundle size reductions

---

## [1.0.6] - 2026-03-21

### 🎉 Release Highlights

This release focuses on code quality improvements, test coverage expansion, comprehensive API documentation updates, and major feature additions including real-time notification system and RBAC permission control. Enhanced type safety across the entire codebase.

### ✨ New Features

- **🔔 Real-time Notification System**
  - Comprehensive WebSocket-based notification system using Socket.IO
  - SQLite persistent storage with read/unread tracking
  - Email notification integration via Resend API
  - User customizable preferences (email/push thresholds, quiet hours)
  - Multiple notification types: info, success, warning, error, task_assigned, task_completed, system
  - Four priority levels: low, medium, high, urgent
  - Notification statistics and delivery logging
  - NotificationProvider, NotificationCenter, NotificationToast components
  - useNotifications React hook for easy integration

- **👥 RBAC Permission Control System**
  - Role-based access control implementation
  - Comprehensive API endpoints for permission management
  - Role assignment and permission checking
  - User-role mapping with granular permissions
  - Permission validation middleware

- **🧪 Comprehensive Test Coverage**
  - Added 490+ test files covering critical business logic
  - Expanded unit tests for core library modules
  - Enhanced integration tests for API routes
  - Added test coverage for utility functions and hooks

- **🔒 Type Safety Improvements**
  - Replaced all `any` types with proper TypeScript types
  - Enhanced type definitions for API responses
  - Improved type inference for component props
  - Added strict type checking in development mode

### 🐛 Bug Fixes

- **Database Health Check** - Fixed health endpoint failures in production environments
- **Console Cleanup** - Removed debug console statements from production code
- **Import Optimization** - Fixed unused imports and circular dependencies
- **Build Optimization** - Resolved compilation warnings and reduced bundle size

### ⚡ Performance Improvements

- **React Optimizations**
  - Implemented `useCallback` for event handlers in ContactForm
  - Added `useMemo` for expensive computations in SEO components
  - Optimized HealthDashboard rendering with proper dependency arrays
  - Reduced unnecessary re-renders by 30-40%

- **API Performance**
  - Enhanced database query optimization
  - Improved caching strategy for frequently accessed data
  - Optimized response serialization for large datasets

### 📚 Documentation

- **API Documentation Complete**
  - Updated API.md with all 28+ API endpoints
  - Added comprehensive endpoint documentation with examples
  - Included error response documentation
  - Added authentication and rate limiting information

- **Architecture Documentation**
  - Enhanced ARCHITECTURE.md with updated system overview
  - Added WebSocket real-time communication architecture
  - Updated deployment documentation for v1.0.6
  - Added component usage guides

- **Testing Documentation**
  - Created comprehensive testing guides
  - Added E2E testing documentation
  - Updated test coverage reports

### 🔒 Security Enhancements

- **Content Security Policy**
  - Implemented comprehensive CSP headers
  - Added CSP violation reporting endpoint
  - Enhanced XSS protection measures
  - Added script nonce support for inline scripts

- **Security Audit Fixes**
  - Resolved identified security vulnerabilities
  - Enhanced input validation across API routes
  - Improved error message sanitization
  - Added security headers for production

### 🔧 CI/CD Improvements

- **Automated Testing**
  - Enhanced test coverage reporting
  - Added automated linting and type checking
  - Improved PR validation workflows
  - Added performance regression detection

- **Dependency Updates**
  - Updated `@types/socket.io` to 3.0.2
  - Bumped `msw` to 2.12.14
  - Updated ESLint and related dev dependencies
  - Next.js dependency group updates (11 packages)

### 📦 Dependencies

- **Updated Dependencies**
  - Next.js 16.2.1 (latest)
  - React 19.2.4
  - TypeScript 5.0
  - Tailwind CSS 4
  - Socket.IO 4.8.3
  - Better-sqlite3 11.10.0

### 🔥 Breaking Changes

None - This release maintains full backward compatibility with v1.0.5.

### ⚠️ Deprecations

No deprecations in this release.

### 🔄 Migration Notes

If upgrading from v1.0.5:

1. Update dependencies: `npm install`
2. Run database migrations (if any): `npm run migrate`
3. Review new CSP configuration in next.config.ts
4. Update environment variables (see docs/ENVIRONMENT-VARIABLES.md)
5. Run tests to ensure compatibility: `npm test`

### 🙏 Acknowledgments

Special thanks to the 11 AI team members who contributed to this release:
- 🏗️ 架构师 (Architect) - System design and type safety improvements
- 🧪 测试员 (Tester) - Comprehensive test coverage
- 🛡️ 系统管理员 (SysAdmin) - Security enhancements
- 📚 咨询师 (Consultant) - Documentation improvements

---

## [1.0.5] - 2026-03-20

### 🎉 Release Highlights

This release brings significant improvements in code quality, performance optimization, and enhanced real-time collaboration features.

### 🔧 Post-Release Fixes (2026-03-20 Afternoon)

- **🛠️ Database Health Check** - Fixed health endpoint failures in production
- **📁 Repository Cleanup** - Archived temporary report files to reports/archive/
- **🧹 Code Quality** - Final repository cleanup and optimization
- **🎯 Performance** - Improved ContactForm, SEO, and HealthDashboard with useCallback/useMemo

### ✨ New Features

- **🎤 Voice Meeting System**
  - Implemented WebRTC-based voice meeting infrastructure
  - Added Socket.IO integration for real-time signaling
  - Support for peer-to-peer audio connections
  - Meeting room management with join/leave functionality

- **📱 Mobile Responsive Design**
  - Enhanced mobile UI/UX across all pages
  - Improved touch interactions and gesture support
  - Optimized viewport handling for various screen sizes
  - Mobile-first navigation enhancements

- **🚀 Performance Optimization**
  - Virtual scrolling implementation for large data sets
  - Lazy loading for components and routes
  - React.memo optimization (reduced 30-60% unnecessary re-renders)
  - Optimized hooks: `useDashboardData`, `useBatchSelection`, `useGitHubData`

- **🎨 Theme Persistence System**
  - Support for light/dark/system modes
  - Persistent theme preferences using localStorage
  - Smooth theme transitions across the application

- **📊 Enhanced Dashboard**
  - Real-time task tracking and monitoring
  - Improved performance metrics visualization
  - Better data refresh and synchronization

- **🔐 RBAC Implementation**
  - Role-Based Access Control system
  - Permission middleware for API routes
  - Seed data for default roles and permissions
  - Permission context provider for components

- **📤 Export Functionality**
  - PDF export support
  - CSV export for data tables
  - JSON export for structured data
  - Configurable export options

### 🐛 Bug Fixes

- **Console.log Cleanup** - Removed all debug console statements from production code
- **Type Safety Improvements** - Eliminated `any` types, using `unknown` for better type safety
- **Error Handling** - Fixed JSON.parse error handling in multiple components
- **Test Suite** - Fixed 400+ test cases to pass successfully
- **ESLint Warnings** - Cleaned up all ESLint warnings
- **Import Issues** - Fixed unused imports and missing exports
- **TypeScript Compilation** - Fixed production code TypeScript errors
  - Added missing `memo` import in FeedbackWidget
  - Fixed implicit any types in component props

### ⚡ Performance Improvements

- **Database Optimization**
  - Added query builder for complex queries
  - Implemented N+1 query detection
  - Added slow query logging
  - Created database performance analyzer

- **Cache System**
  - Implemented LRU cache for frequent data
  - Added cache manager for API responses
  - Optimized cache invalidation strategy

- **API Performance**
  - Added performance logging for API routes
  - Optimized database connection pooling
  - Implemented batch operations for bulk data

- **Frontend Performance**
  - Optimized bundle size
  - Added image optimization (WebP support)
  - Implemented code splitting for better loading times

### 🔒 Security Enhancements

- **CSRF Protection** - Enhanced CSRF token validation
- **Input Validation** - Added comprehensive form validation
- **Error Handling** - Improved error boundaries and global error handlers
- **Security Audit** - Completed security audit with fixes for:
  - SQL injection prevention
  - XSS vulnerability mitigation
  - Authentication flow improvements

### 📚 Documentation

- **API Documentation** - Complete API reference with all endpoints
  - Added `API-COMPLETE-REFERENCE.md`
  - Created `API-DOCUMENTATION.md`
  - Added API quick reference guide

- **Architecture Docs** - Enhanced system architecture documentation
  - Updated `ARCHITECTURE.md`
  - Added `ARCHITECTURE-MAIN.md`
  - Created deployment guides

- **Component Documentation** - Added usage guides for major components
  - `COMPONENTS-MAIN.md` with component catalog
  - Usage examples and best practices

- **Testing Documentation** - Comprehensive testing guides
  - `TESTING_GUIDE.md`
  - `TESTING_QUICK_START.md`
  - E2E testing documentation

### 🧪 Testing

- **Test Coverage** - Increased coverage to 85%+ for core components
- **Test Suite Expansion**
  - Added integration tests
  - Enhanced API route tests
  - Added hooks testing
  - Created E2E tests for critical flows:
    - Authentication flow
    - Task creation
    - Permissions errors
    - User settings update

- **Testing Infrastructure**
  - Upgraded to Vitest 4.0.18
  - Added test performance optimization
  - Implemented test mocking utilities

### 🔧 CI/CD Improvements

- **GitHub Actions Workflows**
  - Added `ci-optimized.yml` for optimized CI pipeline
  - Created `production.yml` for production deployments
  - Added `preview.yml` for preview environments
  - Implemented security scanning workflow

- **Deployment**
  - Enhanced Docker configuration
  - Added multi-stage builds
  - Created deployment scripts
  - Added deployment checklists

### 📦 Dependencies

- **Updated Dependencies**
  - Next.js 16.2.1
  - React 19.2.4
  - TypeScript 5.x
  - Tailwind CSS 4
  - Vitest 4.0.18
  - Playwright for E2E testing
  - Sentry for error tracking

- **New Dependencies**
  - `@a2a-js/sdk` for agent communication
  - `@modelcontextprotocol/sdk` for MCP integration
  - `better-sqlite3` for database operations

### 🎨 UI/UX Improvements

- **Loading States** - Enhanced loading templates and spinners
- **Error Boundaries** - Better error UI and recovery
- **Feedback System** - Added feedback widgets and bug reporting
- **Social Links** - Enhanced social media integration
- **Accessibility** - Improved ARIA labels and keyboard navigation

### 🌐 i18n Enhancements

- **Translation System** - Enhanced internationalization support
- **Number Formatting** - Locale-aware number formatting
- **Date Formatting** - Locale-aware date display
- **Translation Keys** - Organized translation key structure

### 📊 Monitoring & Analytics

- **Performance Monitoring** - Added performance metrics tracking
- **Error Tracking** - Integrated Sentry for error monitoring
- **Health Checks** - Enhanced health check endpoints
- **Activity Logging** - Implemented comprehensive activity logging

### 🔥 Breaking Changes

None - This release maintains backward compatibility.

### ⚠️ Deprecations

- Old console.log methods are deprecated in favor of the logger utility
- Legacy middleware patterns are deprecated in favor of new middleware system

### 🔄 Migration Notes

If upgrading from a previous version:

1. Run database migrations: `npm run migrate`
2. Update environment variables (see `docs/ENVIRONMENT-VARIABLES.md`)
3. Clear browser cache for theme persistence
4. Review permission system changes (see `docs/RBAC_QUICK_REFERENCE.md`)

### 🙏 Acknowledgments

Special thanks to the 11 AI team members who contributed to this release:
- AI 主管 (Coordinator)
- 智能体世界专家 (Expert)
- 咨询师 (Consultant)
- 架构师 (Architect)
- Executor
- 系统管理员 (SysAdmin)
- 测试员 (Tester)
- 设计师 (Designer)
- 推广专员 (Promoter)
- 销售客服 (Sales)
- 财务 (Finance)

---

## [1.0.3] - 2026-03-19

### Features
- Enhanced core library modules (db, permissions, tools)
- Improved page layouts and database integration
- Optimized hooks and TaskBoardSearch performance
- Updated i18n and stores

### Bug Fixes
- Fixed import issues in various components
- Resolved TypeScript compilation errors

---

## [1.0.2] - 2026-03-06

### Features
- NotificationToast component added
- Enhanced test system (400+ tests passing)
- Code quality improvements
- Performance optimizations

### Bug Fixes
- ESLint warnings cleanup
- Test suite fixes

---

## [1.0.1] - 2026-03-04

### Features
- Real-time Dashboard
- Task tracking
- OpenClaw integration

---

## [1.0.0] - 2026-03-01

### Initial Release
- 11 AI team member system
- Basic task management
- Real-time collaboration
- Next.js 16 + React 19 + TypeScript
