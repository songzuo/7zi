# Changelog

All notable changes to the 7zi project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Next.js 16.1.7
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
