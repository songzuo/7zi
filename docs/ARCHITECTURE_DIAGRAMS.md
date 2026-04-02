# 7zi-Frontend 架构图 (Mermaid)

## 整体架构

```mermaid
graph TB
    subgraph "用户层"
        U[用户浏览器]
    end

    subgraph "前端应用 - Next.js 15"
        subgraph "路由层"
            MW[Middleware<br/>语言检测/重定向]
            LR[Locale Router<br/>/zh /en]
            API[API Routes<br/>/api/*]
        end

        subgraph "页面层"
            HOME[首页]
            ABOUT[关于页]
            BLOG[博客页]
            CONTACT[联系页]
            DASH[Dashboard]
            TEAM[团队页]
        end

        subgraph "组件层"
            NAV[Navigation]
            HERO[Hero3D]
            GH[GitHubActivity]
            PD[ProjectDashboard]
            AI[AIChat]
            FOOTER[Footer]
        end

        subgraph "状态层"
            CTX[SettingsContext<br/>theme/language]
            ZUST[Zustand Store<br/>dashboard/chat]
        end

        subgraph "数据层"
            HOOKS[Custom Hooks<br/>useFetch/useGitHubData]
            CACHE[Cache Layer<br/>TTL 5min]
            LS[localStorage]
        end
    end

    subgraph "外部服务"
        GHAPI[GitHub API]
        SENTRY[Sentry]
        ANALYTICS[Analytics]
    end

    U --> MW
    MW --> LR
    LR --> HOME & ABOUT & BLOG & CONTACT & DASH & TEAM
    API --> HOOKS

    HOME --> NAV & HERO & GH & PD & AI & FOOTER
    NAV <--> CTX
    AI <--> ZUST
    PD <--> ZUST

    HOOKS --> CACHE
    HOOKS --> GHAPI
    CACHE --> LS

    U -.-> SENTRY
    U -.-> ANALYTICS
```

## 组件依赖关系

```mermaid
graph LR
    subgraph "Layout"
        RL[RootLayout]
        CL[ClientProviders]
    end

    subgraph "Providers"
        SC[SettingsContext]
        TP[ThemeProvider]
    end

    subgraph "Page Components"
        NAV[Navigation]
        HERO[Hero3D]
        GH[GitHubActivity]
        PD[ProjectDashboard]
        AI[AIChat]
        FT[Footer]
    end

    subgraph "UI Components"
        BTN[Button]
        CARD[Card]
        SKEL[Skeleton]
        ERR[ErrorBoundary]
    end

    RL --> CL
    CL --> SC
    SC --> TP

    SC --> NAV
    TP --> NAV

    NAV --> BTN
    GH --> SKEL
    PD --> CARD & SKEL
    AI --> CARD & ERR
```

## 数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant C as Component
    participant H as Hook
    participant Cache as 缓存层
    participant API as API/External
    participant LS as localStorage

    U->>C: 交互操作
    C->>H: 调用 Hook

    alt 缓存命中
        H->>Cache: 检查缓存
        Cache-->>H: 返回数据
    else 缓存未命中
        H->>API: 发起请求
        API-->>H: 返回数据
        H->>Cache: 存入缓存
    end

    H-->>C: 返回数据
    C-->>U: 更新 UI

    Note over H,LS: 持久化到 localStorage
    H->>LS: 异步存储
```

## 状态管理

```mermaid
stateDiagram-v2
    [*] --> Light: 默认
    [*] --> Dark: localStorage

    state "主题状态" as Theme {
        Light --> Dark: toggle
        Dark --> Light: toggle
        Light --> System: setSystem
        Dark --> System: setSystem
        System --> Light: 系统偏好亮色
        System --> Dark: 系统偏好暗色
    }

    state "语言状态" as Lang {
        zh --> en: switch
        en --> zh: switch
    }

    state "通知状态" as Notif {
        enabled --> disabled: toggle
        disabled --> enabled: toggle
    }
```

## 部署架构

```mermaid
graph TB
    subgraph "开发环境"
        DEV[Developer Machine]
        GIT[Git Repository]
    end

    subgraph "CI/CD"
        GH Actions[GitHub Actions]
        BUILD[Build Process]
        TEST[Test Suite]
    end

    subgraph "生产环境"
        subgraph "Docker Container"
            NEXT[Next.js Server<br/>Standalone]
            NGINX[Nginx Reverse Proxy]
        end
        subgraph "Static Assets"
            CDN[CDN/Static Files]
            IMG[Optimized Images]
        end
    end

    subgraph "监控"
        SENTRY[Sentry Error Tracking]
        VITALS[Web Vitals]
    end

    DEV -->|push| GIT
    GIT -->|trigger| GH Actions
    GH Actions --> BUILD
    BUILD --> TEST
    TEST -->|pass| NGINX
    NGINX --> NEXT
    NEXT --> CDN & IMG

    NEXT -->|errors| SENTRY
    NEXT -->|metrics| VITALS
```

## 目录结构

```mermaid
graph TD
    ROOT[7zi-frontend/] --> SRC[src/]
    ROOT --> PUBLIC[public/]
    ROOT --> DOCS[docs/]
    ROOT --> E2E[e2e/]

    SRC --> APP[app/]
    SRC --> COMP[components/]
    SRC --> HOOKS[hooks/]
    SRC --> STORES[stores/]
    SRC --> CONTEXTS[contexts/]
    SRC --> I18N[i18n/]
    SRC --> LIB[lib/]
    SRC --> TYPES[types/]

    APP --> LOCALE["[locale]/"]
    APP --> API[api/]

    LOCALE --> PAGES[pages...]
    API --> HEALTH[health/]
    API --> GITHUB[github/]

    COMP --> AICHAT[AIChat/]
    COMP --> NOTIFY[NotificationCenter/]
    COMP --> SHARED[shared/]
```

## 技术栈关系

```mermaid
graph LR
    subgraph "Core"
        NEXT[Next.js 16]
        REACT[React 19]
        TS[TypeScript 5]
    end

    subgraph "Styling"
        TW[Tailwind CSS 4]
        CSS[CSS Variables]
    end

    subgraph "State"
        CTX[React Context]
        ZUS[Zustand 5]
    end

    subgraph "i18n"
        INTL[next-intl 4]
        MSG[Messages JSON]
    end

    subgraph "Testing"
        VIT[Vitest 4]
        PW[Playwright 1.58]
        TL[Testing Library]
    end

    subgraph "Monitoring"
        SEN[Sentry 10]
        WV[web-vitals 4]
    end

    NEXT --> REACT
    REACT --> TS
    NEXT --> TW
    TW --> CSS

    REACT --> CTX
    REACT --> ZUS

    NEXT --> INTL
    INTL --> MSG

    REACT --> TL
    TL --> VIT
    TL --> PW

    NEXT --> SEN
    REACT --> WV
```

---

_使用 Mermaid.js 渲染 - 可在支持 Mermaid 的 Markdown 查看器中查看_
