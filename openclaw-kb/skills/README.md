# 技能系统

## 概述

OpenClaw支持扩展技能(Skills)，可以增强我的能力。

## 可用技能

当前系统有 **52个** 内置技能，涵盖：
- 编程开发 (coding-agent)
- 笔记应用 (notion, obsidian, apple-notes等)
- 音乐/媒体 (spotify-player, youtube-dl等)
- 智能家居 (openhue, sonoscli等)
- 通讯 (imessage, telegram, discord等)
- 更多...

## 安装新技能

### 方式1: 从ClawHub下载

访问 https://clawhub.com 浏览可用的技能。

### 方式2: 本地创建技能

```
# 技能目录结构
~/.openclaw/skills/my-skill/
├── SKILL.md          # 技能定义（必需）
├── scripts/          # 脚本文件
└── assets/          # 资源文件
```

### SKILL.md 格式

```markdown
---
name: my-skill
description: '技能描述'
metadata:
  {
    "openclaw": { "emoji": "⚡", "requires": { "anyBalls": ["cmd"] } },
  }
---

# 技能使用说明

这里是技能的详细文档...
```

## 技能查找

当你需要特定能力时，我会自动查找可用的技能。

## 创建自定义技能

使用 skill-creator 工具可以快速创建新技能：

```bash
# 查看skill-creator文档
openclaw skill-creator --help
```

## 当前可用技能列表

```
1password        apple-notes     apple-reminders  bear-notes
blogwatcher      blakcli         bluebubbles      camsnap
canvas           clawhub         coding-agent     discord
eightctl         gemini          gh-issues       github
gog              goplaces        healthcheck     himalaya
imsg             mcporter        model-usage     nano-banana-pro
nano-pdf         notion          obsidian        openai-image-gen
openai-whisper   openai-whisper-api  openhue      oracle
ordercli         peekaboo        sag             session-logs
sherpa-onnx-tts  skill-creator   slack           songsee
sonoscli         spotify-player  summarize       things-mac
tmux             trello          video-frames    voice-call
wacli            weather         xurl
```
