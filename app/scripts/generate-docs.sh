#!/bin/bash

# 文档生成脚本
# 用于本地生成所有文档

set -e

echo "📚 开始生成文档..."
echo ""

# 清理旧文档
echo "🧹 清理旧文档..."
npm run docs:clean

# 生成 TypeDoc API 文档
echo ""
echo "📖 生成 API 文档..."
npm run docs:api

# 构建 Storybook
echo ""
echo "🎨 构建 Storybook..."
npm run build-storybook -- -o docs/storybook

# 创建文档索引
echo ""
echo "📄 创建文档索引..."
cat > docs/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Team Dashboard - 文档</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
            background: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
            body {
                background: #1a1a1a;
                color: #ffffff;
            }
            .links a {
                background: #2d2d2d;
                color: #ffffff;
            }
            .links a:hover {
                background: #3d3d3d;
            }
            .description {
                color: #9ca3af;
            }
        }
        h1 {
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
        }
        .links {
            list-style: none;
            padding: 0;
        }
        .links li {
            margin: 15px 0;
        }
        .links a {
            display: block;
            padding: 15px 20px;
            background: #f3f4f6;
            border-radius: 8px;
            text-decoration: none;
            color: #1f2937;
            font-weight: 500;
            transition: all 0.2s;
            border-left: 4px solid #2563eb;
        }
        .links a:hover {
            background: #e5e7eb;
            transform: translateX(5px);
        }
        .description {
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
            font-weight: normal;
        }
        .emoji {
            font-size: 24px;
            margin-right: 10px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>📚 AI Team Dashboard 文档</h1>
    <p>欢迎查阅 AI 团队看板项目的文档资源。点击下方链接查看详细文档。</p>
    
    <ul class="links">
        <li>
            <a href="./api/">
                <span class="emoji">📖</span>API 文档 (TypeDoc)
                <div class="description">TypeScript API 参考文档，包含所有类型、接口和函数的详细说明</div>
            </a>
        </li>
        <li>
            <a href="./storybook/">
                <span class="emoji">🎨</span>组件库 (Storybook)
                <div class="description">交互式组件展示和文档，可在线预览和测试所有 UI 组件</div>
            </a>
        </li>
    </ul>
    
    <div class="footer">
        <p>AI Team Dashboard v1.0.0 | 生成时间: <span id="timestamp"></span></p>
    </div>
    
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString('zh-CN');
    </script>
</body>
</html>
EOF

echo ""
echo "✅ 文档生成完成！"
echo ""
echo "📁 文档位置: docs/"
echo "   - API 文档: docs/api/"
echo "   - Storybook: docs/storybook/"
echo "   - 索引页面: docs/index.html"
echo ""
echo "🌐 本地预览: open docs/index.html"
