# 新增功能文档

## 1. 联系表单功能 (Contact Form)

### 位置
`src/components/ContactForm.tsx`

### 功能特性
- ✅ 完整的表单验证（姓名、邮箱、消息必填）
- ✅ 邮箱格式验证
- ✅ 消息长度验证（最少 10 字符）
- ✅ 提交状态反馈（发送中、成功、失败）
- ✅ 错误提示
- ✅ 深色模式支持
- ✅ 响应式设计

### 使用方式
```tsx
import { ContactForm } from "@/components/ContactForm";

<ContactForm />
```

### 集成后端
在 `ContactForm.tsx` 的 `handleSubmit` 函数中，替换模拟 API 调用为实际的后端接口：

```typescript
// 选项 1: Formspree
const response = await fetch("https://formspree.io/f/your-form-id", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});

// 选项 2: EmailJS
emailjs.send("your-service-id", "your-template-id", formData);

// 选项 3: 自定义 API
const response = await fetch("/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});
```

---

## 2. 社交媒体链接组件 (Social Links)

### 位置
`src/components/SocialLinks.tsx`

### 功能特性
- ✅ 6 个预设社交平台（微信、GitHub、Twitter、LinkedIn、Discord、YouTube）
- ✅ 3 种布局变体（horizontal、vertical、grid）
- ✅ 3 种尺寸（sm、md、lg）
- ✅ 渐变背景色
- ✅ 悬停动画效果
- ✅ 深色模式支持
- ✅ 响应式设计

### 使用方式
```tsx
import { SocialLinks } from "@/components/SocialLinks";

// 网格布局（默认）
<SocialLinks />

// 水平布局
<SocialLinks variant="horizontal" />

// 垂直布局
<SocialLinks variant="vertical" />

// 小尺寸
<SocialLinks size="sm" />

// 大尺寸
<SocialLinks size="lg" />
```

### 自定义社交链接
编辑 `src/components/SocialLinks.tsx` 中的 `socialLinks` 数组：

```typescript
const socialLinks: SocialLink[] = [
  {
    name: "平台名称",
    icon: "emoji",
    description: "描述文字",
    link: "https://...",
    color: "from-color-500 to-color-600",
  },
];
```

---

## 3. 网站统计代码 (Analytics)

### 位置
`src/components/Analytics.tsx`

### 支持的统计服务
- ✅ Google Analytics 4
- ✅ Umami Analytics
- ✅ Plausible Analytics
- ✅ 百度统计

### 配置方式

1. 复制环境变量示例文件：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 填入您的统计服务 ID：
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=your-umami-id
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.studio
NEXT_PUBLIC_BAIDU_ID=your-baidu-id
```

3. 组件会自动注入对应的统计代码

### 使用方式
已在 `src/app/layout.tsx` 中全局集成，无需额外配置。

---

## 4. 文件结构

```
src/
├── app/
│   ├── layout.tsx          # 已集成 Analytics 组件
│   └── contact/
│       └── page.tsx        # 已使用 ContactForm 和 SocialLinks
├── components/
│   ├── ContactForm.tsx     # 联系表单组件
│   ├── SocialLinks.tsx     # 社交媒体链接组件
│   └── Analytics.tsx       # 网站统计组件
└── ...
```

---

## 5. 下一步建议

### 联系表单后端集成
- [ ] 创建 Serverless Function 处理表单提交
- [ ] 集成邮件发送服务（SendGrid、Resend 等）
- [ ] 添加表单提交速率限制
- [ ] 添加 reCAPTCHA 防 spam

### 统计数据分析
- [ ] 创建数据分析仪表板
- [ ] 集成实时访问统计
- [ ] 添加转化追踪

### 社交媒体
- [ ] 添加社交媒体分享按钮
- [ ] 集成 Open Graph 元标签
- [ ] 添加社交媒体 feed 展示
