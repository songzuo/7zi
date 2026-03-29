# 反馈系统快速开始指南

## 🚀 快速部署

### 1. 安装依赖

```bash
cd /root/.openclaw/workspace/7zi-frontend
npm install better-sqlite3 --legacy-peer-deps
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问应用

- 用户反馈页面: http://localhost:3000/feedback
- 管理员后台: http://localhost:3000/admin/feedback

## 📝 测试流程

### 提交反馈

1. 访问 `/feedback`
2. 选择反馈类型卡片
3. 填写反馈信息
4. 提交

### 管理反馈

1. 使用管理员账号登录
2. 访问 `/admin/feedback`
3. 查看反馈列表
4. 点击查看详情
5. 更新状态或回复

## 🔧 配置说明

### 数据库位置

数据库文件会自动创建在：
```
data/feedback.db
```

### 认证配置

确保在 `.env.local` 中配置：
```env
JWT_SECRET=your-secret-key
```

## 📊 数据库结构

系统会自动创建以下表：
- `feedback` - 反馈主表
- `feedback_comments` - 评论表
- `feedback_ratings` - 评分历史表

## 🎨 自定义

### 修改反馈类型

编辑 `src/lib/db/feedback-storage.ts` 中的类型定义：
```typescript
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise' | 'other';
```

### 修改优先级

编辑 `src/lib/db/feedback-storage.ts` 中的优先级定义：
```typescript
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';
```

### 修改状态

编辑 `src/lib/db/feedback-storage.ts` 中的状态定义：
```typescript
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
```

## 🐛 故障排除

### better-sqlite3 编译错误

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

### TypeScript 路径别名问题

确保 `tsconfig.json` 包含：
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 数据库锁定

如果遇到数据库锁定错误：
```bash
# 删除 WAL 文件
rm data/feedback.db-shm data/feedback.db-wal
```

## 📚 更多文档

- [完整系统报告](./FEEDBACK_SYSTEM_REPORT.md)
- [实现总结](./FEEDBACK_IMPLEMENTATION_SUMMARY.md)
- [数据库设计](../src/lib/db/feedback-storage.ts)

## ✅ 检查清单

部署前检查：
- [ ] better-sqlite3 已安装
- [ ] data/ 目录有写权限
- [ ] JWT_SECRET 已配置
- [ ] 管理员账号已创建
- [ ] Next.js 构建成功

---

**需要帮助？** 查看详细文档或检查代码注释。
