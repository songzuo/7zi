# Email 技能 - Gmail 集成

## 功能

### 发送邮件
```bash
gog gmail send \
  --account lengningtu@gmail.com \
  --to <recipient@example.com> \
  --subject "<主题>" \
  --body "<内容>"
```

### 读取收件箱
```bash
gog gmail list \
  --account lengningtu@gmail.com \
  --label INBOX \
  --max 10
```

### 读取单封邮件
```bash
gog gmail get \
  --account lengningtu@gmail.com \
  --id <message-id>
```

### 回复邮件
```bash
gog gmail reply \
  --account lengningtu@gmail.com \
  --id <message-id> \
  --body "<回复内容>"
```

### 搜索邮件
```bash
gog gmail search \
  --account lengningtu@gmail.com \
  --query "from:example@gmail.com"
```

## 使用场景

### 客服
- 自动回复用户咨询
- 邮件分类和优先级标记

### 营销
- 发送产品更新
- 媒体合作联络

### 通知
- 重要事件邮件通知
- 日报/周报发送

## 配置状态

- [ ] GCP 项目配置
- [ ] Gmail API 启用
- [ ] Pub/Sub 主题创建
- [ ] 公网回调配置
- [ ] OpenClaw hooks 配置

## 安全注意

- 使用应用专用密码（非主密码）
- 限制 API 权限范围
- 定期轮换凭证
- 敏感信息加密存储
