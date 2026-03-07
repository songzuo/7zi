/**
 * 邮件模板系统
 * 支持多种邮件类型的模板渲染
 */

export interface TemplateData {
  [key: string]: any;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: (data: TemplateData) => string;
  text: (data: TemplateData) => string;
  html: (data: TemplateData) => string;
}

/**
 * 基础邮件布局模板
 */
export function getBaseLayout(content: string, options: {
  title?: string;
  previewText?: string;
  year?: number;
} = {}): string {
  const year = options.year || new Date().getFullYear();
  const title = options.title || 'AI Team Dashboard';
  const previewText = options.previewText || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* 重置样式 */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      table[class="body"] img { height: auto !important; width: auto !important; max-width: 100% !important; }
      table[class="body"] center { min-width: 0 !important; }
      table[class="body"] .container { width: 95% !important; }
      table[class="body"] .row { width: 100% !important; display: block !important; }
      table[class="body"] .wrapper { display: block !important; padding-right: 0 !important; }
    }
  </style>
</head>
<body style="background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- 预览文本 -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- 邮件主体 -->
  <table role="presentation" class="body" style="width: 100%; background-color: #f4f4f5;" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 40px 0;" align="center">
        <table role="presentation" class="container" style="width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" border="0" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;" align="center">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🤖 ${title}
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;" align="center">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                © ${year} AI Team Dashboard. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                这是一封自动发送的邮件，请勿直接回复。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 渲染按钮
 */
export function renderButton(text: string, url: string, style: 'primary' | 'secondary' = 'primary'): string {
  const bgColor = style === 'primary' ? '#667eea' : '#6b7280';
  const hoverColor = style === 'primary' ? '#5a67d8' : '#4b5563';

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td style="border-radius: 6px; background-color: ${bgColor};">
        <a href="${url}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * 渲染分隔线
 */
export function renderDivider(): string {
  return `<div style="height: 1px; background-color: #e5e7eb; margin: 24px 0;"></div>`;
}

/**
 * 渲染任务卡片
 */
export function renderTaskCard(task: {
  title: string;
  status: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
}): string {
  const statusColors: Record<string, string> = {
    todo: '#6b7280',
    in_progress: '#3b82f6',
    done: '#10b981',
    blocked: '#ef4444',
  };

  const priorityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  };

  return `
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${priorityColors[task.priority] || '#6b7280'};">
    <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px; font-weight: 600;">${task.title}</h3>
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; background-color: ${statusColors[task.status] || '#6b7280'}; color: white;">
        ${task.status}
      </span>
      <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; background-color: ${priorityColors[task.priority] || '#6b7280'}; color: white;">
        ${task.priority}
      </span>
      ${task.assignee ? `<span style="color: #6b7280; font-size: 13px;">👤 ${task.assignee}</span>` : ''}
      ${task.dueDate ? `<span style="color: #6b7280; font-size: 13px;">📅 ${task.dueDate}</span>` : ''}
    </div>
  </div>`;
}

// ========================================
// 内置模板
// ========================================

/**
 * 任务分配通知模板
 */
export const TaskAssignedTemplate: EmailTemplate = {
  id: 'task-assigned',
  name: '任务分配通知',
  description: '当任务分配给用户时发送',
  subject: (data) => `📋 新任务分配: ${data.taskTitle}`,
  text: (data) => `
你好 ${data.userName},

你被分配了一个新任务：

任务: ${data.taskTitle}
优先级: ${data.priority}
截止日期: ${data.dueDate || '未设置'}

描述:
${data.description || '无描述'}

请点击以下链接查看详情:
${data.taskUrl}

---
AI Team Dashboard
  `.trim(),
  html: (data) => getBaseLayout(`
    <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">
      你好 <strong>${data.userName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
      你被分配了一个新任务：
    </p>
    ${renderTaskCard({
      title: data.taskTitle,
      status: 'todo',
      priority: data.priority,
      dueDate: data.dueDate,
    })}
    ${data.description ? `
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 500;">任务描述</p>
      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${data.description}</p>
    </div>
    ` : ''}
    ${renderButton('查看任务详情', data.taskUrl)}
    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
      如有任何问题，请联系任务创建者 ${data.creatorName || '管理员'}。
    </p>
  `, {
    title: '新任务分配',
    previewText: `你被分配了一个新任务: ${data.taskTitle}`,
  }),
};

/**
 * 任务状态更新模板
 */
export const TaskStatusUpdatedTemplate: EmailTemplate = {
  id: 'task-status-updated',
  name: '任务状态更新',
  description: '当任务状态变更时发送',
  subject: (data) => `🔄 任务状态更新: ${data.taskTitle}`,
  text: (data) => `
你好 ${data.userName},

任务状态已更新：

任务: ${data.taskTitle}
原状态: ${data.oldStatus}
新状态: ${data.newStatus}
更新人: ${data.updatedBy}

请点击以下链接查看详情:
${data.taskUrl}

---
AI Team Dashboard
  `.trim(),
  html: (data) => getBaseLayout(`
    <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">
      你好 <strong>${data.userName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
      任务状态已更新：
    </p>
    ${renderTaskCard({
      title: data.taskTitle,
      status: data.newStatus,
      priority: data.priority || 'medium',
    })}
    <div style="display: flex; align-items: center; gap: 12px; margin: 16px 0;">
      <span style="padding: 8px 16px; background-color: #f3f4f6; border-radius: 6px; color: #6b7280; font-size: 14px;">
        ${data.oldStatus}
      </span>
      <span style="color: #6b7280;">→</span>
      <span style="padding: 8px 16px; background-color: #dbeafe; border-radius: 6px; color: #2563eb; font-size: 14px; font-weight: 500;">
        ${data.newStatus}
      </span>
    </div>
    <p style="margin: 16px 0; color: #6b7280; font-size: 14px;">
      更新人: <strong>${data.updatedBy}</strong>
    </p>
    ${renderButton('查看任务', data.taskUrl)}
  `, {
    title: '任务状态更新',
    previewText: `任务 "${data.taskTitle}" 状态已从 ${data.oldStatus} 更新为 ${data.newStatus}`,
  }),
};

/**
 * 任务即将到期提醒模板
 */
export const TaskDueReminderTemplate: EmailTemplate = {
  id: 'task-due-reminder',
  name: '任务到期提醒',
  description: '任务即将到期时发送提醒',
  subject: (data) => `⏰ 任务即将到期: ${data.taskTitle}`,
  text: (data) => `
你好 ${data.userName},

提醒：你有一个任务即将到期！

任务: ${data.taskTitle}
截止日期: ${data.dueDate}
剩余时间: ${data.remainingTime}

请尽快完成任务或更新截止日期。

任务链接: ${data.taskUrl}

---
AI Team Dashboard
  `.trim(),
  html: (data) => getBaseLayout(`
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 500;">
        ⚠️ 任务即将到期，请尽快处理！
      </p>
    </div>
    <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">
      你好 <strong>${data.userName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
      以下任务即将到期：
    </p>
    ${renderTaskCard({
      title: data.taskTitle,
      status: data.status || 'in_progress',
      priority: 'high',
      dueDate: data.dueDate,
    })}
    <div style="background-color: #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; color: #dc2626; font-size: 14px;">剩余时间</p>
      <p style="margin: 8px 0 0 0; color: #991b1b; font-size: 24px; font-weight: 600;">${data.remainingTime}</p>
    </div>
    ${renderButton('查看任务', data.taskUrl)}
    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
      如果需要延期，请在任务详情页面更新截止日期。
    </p>
  `, {
    title: '任务到期提醒',
    previewText: `任务 "${data.taskTitle}" 将在 ${data.remainingTime} 后到期`,
  }),
};

/**
 * 周报摘要模板
 */
export const WeeklyDigestTemplate: EmailTemplate = {
  id: 'weekly-digest',
  name: '周报摘要',
  description: '每周发送的工作摘要',
  subject: (data) => `📊 周报摘要 - 第 ${data.weekNumber} 周`,
  text: (data) => `
你好 ${data.userName},

这是你第 ${data.weekNumber} 周的工作摘要：

📈 本周统计:
- 完成任务: ${data.completedTasks} 个
- 新建任务: ${data.createdTasks} 个
- 进行中任务: ${data.inProgressTasks} 个
- 总工作时间: ${data.totalHours || 'N/A'}

🏆 本周亮点:
${data.highlights || '暂无亮点'}

📋 待办事项:
${data.todos || '暂无待办'}

---
AI Team Dashboard
  `.trim(),
  html: (data) => getBaseLayout(`
    <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">
      你好 <strong>${data.userName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
      这是你第 <strong>${data.weekNumber}</strong> 周的工作摘要：
    </p>

    <!-- 统计卡片 -->
    <div style="display: flex; gap: 12px; margin-bottom: 24px;">
      <div style="flex: 1; background-color: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 12px;">完成任务</p>
        <p style="margin: 4px 0 0 0; color: #15803d; font-size: 28px; font-weight: 600;">${data.completedTasks}</p>
      </div>
      <div style="flex: 1; background-color: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #1e40af; font-size: 12px;">新建任务</p>
        <p style="margin: 4px 0 0 0; color: #1d4ed8; font-size: 28px; font-weight: 600;">${data.createdTasks}</p>
      </div>
      <div style="flex: 1; background-color: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #854d0e; font-size: 12px;">进行中</p>
        <p style="margin: 4px 0 0 0; color: #a16207; font-size: 28px; font-weight: 600;">${data.inProgressTasks}</p>
      </div>
    </div>

    ${renderDivider()}

    <!-- 亮点 -->
    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">🏆 本周亮点</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${data.highlights || '暂无亮点'}</p>
      </div>
    </div>

    <!-- 待办 -->
    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">📋 下周待办</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${data.todos || '暂无待办'}</p>
      </div>
    </div>

    ${renderButton('查看仪表板', data.dashboardUrl || '#')}
  `, {
    title: '周报摘要',
    previewText: `第 ${data.weekNumber} 周工作摘要：完成 ${data.completedTasks} 个任务`,
  }),
};

/**
 * 系统通知模板
 */
export const SystemNotificationTemplate: EmailTemplate = {
  id: 'system-notification',
  name: '系统通知',
  description: '通用系统通知模板',
  subject: (data) => `📢 ${data.title}`,
  text: (data) => `
${data.title}

${data.message}

${data.actionUrl ? `点击查看: ${data.actionUrl}` : ''}

---
AI Team Dashboard
  `.trim(),
  html: (data) => getBaseLayout(`
    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
      ${data.title}
    </h2>
    <div style="color: #374151; font-size: 15px; line-height: 1.6;">
      ${data.message}
    </div>
    ${data.actionText && data.actionUrl ? renderButton(data.actionText, data.actionUrl) : ''}
  `, {
    title: data.title,
    previewText: data.message?.substring(0, 100) || '',
  }),
};

/**
 * 欢迎邮件模板
 */
export const WelcomeTemplate: EmailTemplate = {
  id: 'welcome',
  name: '欢迎邮件',
  description: '新用户注册时发送',
  subject: (data) => `🎉 欢迎加入 AI Team Dashboard, ${data.userName}!`,
  text: (data) => `
欢迎 ${data.userName}!

感谢你加入 AI Team Dashboard。我们很高兴有你！

开始使用:
1. 完善你的个人资料
2. 创建你的第一个任务
3. 邀请团队成员加入

登录链接: ${data.loginUrl}

如有任何问题，请随时联系我们。

---
AI Team Dashboard 团队
  `.trim(),
  html: (data) => getBaseLayout(`
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
      <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">
        欢迎加入, ${data.userName}!
      </h2>
    </div>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">
      感谢你加入 AI Team Dashboard。我们很高兴有你！
    </p>
    ${renderDivider()}
    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px;">开始使用:</h3>
    <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f9fafb; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
      <span style="width: 24px; height: 24px; background-color: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">1</span>
      <span style="color: #374151; font-size: 14px;">完善你的个人资料</span>
    </div>
    <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f9fafb; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
      <span style="width: 24px; height: 24px; background-color: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">2</span>
      <span style="color: #374151; font-size: 14px;">创建你的第一个任务</span>
    </div>
    <div style="margin-bottom: 24px; padding: 12px 16px; background-color: #f9fafb; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
      <span style="width: 24px; height: 24px; background-color: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">3</span>
      <span style="color: #374151; font-size: 14px;">邀请团队成员加入</span>
    </div>
    ${renderButton('立即开始', data.loginUrl)}
  `, {
    title: '欢迎加入',
    previewText: `欢迎 ${data.userName} 加入 AI Team Dashboard!`,
  }),
};

/**
 * 所有内置模板
 */
export const builtInTemplates: Record<string, EmailTemplate> = {
  [TaskAssignedTemplate.id]: TaskAssignedTemplate,
  [TaskStatusUpdatedTemplate.id]: TaskStatusUpdatedTemplate,
  [TaskDueReminderTemplate.id]: TaskDueReminderTemplate,
  [WeeklyDigestTemplate.id]: WeeklyDigestTemplate,
  [SystemNotificationTemplate.id]: SystemNotificationTemplate,
  [WelcomeTemplate.id]: WelcomeTemplate,
};

/**
 * 获取模板
 */
export function getTemplate(templateId: string): EmailTemplate | undefined {
  return builtInTemplates[templateId];
}

/**
 * 渲染模板
 */
export function renderTemplate(
  templateId: string,
  data: TemplateData
): { subject: string; text: string; html: string } | null {
  const template = getTemplate(templateId);
  if (!template) return null;

  return {
    subject: template.subject(data),
    text: template.text(data),
    html: template.html(data),
  };
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): EmailTemplate[] {
  return Object.values(builtInTemplates);
}

// 默认导出
export default {
  getTemplate,
  renderTemplate,
  getAllTemplates,
  getBaseLayout,
  renderButton,
  renderDivider,
  renderTaskCard,
  builtInTemplates,
};