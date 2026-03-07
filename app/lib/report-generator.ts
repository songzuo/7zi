/**
 * 报表生成器 - 支持多种报表类型和格式
 */

import type { Task, TaskStats } from './tasks/types';
import type { AIMember, GitHubIssue, GitHubCommit, ActivityItem } from '../app/dashboard/page';
import { exportCompleteReport, downloadJSON, downloadCSV, exportTasksPDF } from './export';

// ============================================================================
// 类型定义
// ============================================================================

export type ReportType = 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'sprint' 
  | 'team-performance' 
  | 'task-summary'
  | 'issue-analysis'
  | 'activity-log';

export interface ReportConfig {
  type: ReportType;
  title?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeSections?: string[];
  format?: 'pdf' | 'json' | 'csv';
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: Date;
  dateRange?: {
    start: Date;
    end: Date;
  };
  summary: ReportSummary;
  sections: ReportSection[];
  metadata: {
    generatedBy: string;
    version: string;
    totalDataPoints: number;
  };
}

export interface ReportSummary {
  keyMetrics: Record<string, number | string>;
  highlights: string[];
  recommendations: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'list' | 'text' | 'metrics';
  data: unknown;
  summary?: string;
}

// ============================================================================
// 报表生成器类
// ============================================================================

export class ReportGenerator {
  private members: AIMember[] = [];
  private issues: GitHubIssue[] = [];
  private commits: GitHubCommit[] = [];
  private activities: ActivityItem[] = [];
  private tasks: Task[] = [];

  constructor(data?: {
    members?: AIMember[];
    issues?: GitHubIssue[];
    commits?: GitHubCommit[];
    activities?: ActivityItem[];
    tasks?: Task[];
  }) {
    if (data) {
      this.members = data.members || [];
      this.issues = data.issues || [];
      this.commits = data.commits || [];
      this.activities = data.activities || [];
      this.tasks = data.tasks || [];
    }
  }

  // 数据设置方法
  setMembers(members: AIMember[]): void {
    this.members = members;
  }

  setIssues(issues: GitHubIssue[]): void {
    this.issues = issues;
  }

  setCommits(commits: GitHubCommit[]): void {
    this.commits = commits;
  }

  setActivities(activities: ActivityItem[]): void {
    this.activities = activities;
  }

  setTasks(tasks: Task[]): void {
    this.tasks = tasks;
  }

  /**
   * 生成报表
   */
  generate(config: ReportConfig): GeneratedReport {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let report: GeneratedReport;

    switch (config.type) {
      case 'daily':
        report = this.generateDailyReport(config, reportId);
        break;
      case 'weekly':
        report = this.generateWeeklyReport(config, reportId);
        break;
      case 'monthly':
        report = this.generateMonthlyReport(config, reportId);
        break;
      case 'sprint':
        report = this.generateSprintReport(config, reportId);
        break;
      case 'team-performance':
        report = this.generateTeamPerformanceReport(config, reportId);
        break;
      case 'task-summary':
        report = this.generateTaskSummaryReport(config, reportId);
        break;
      case 'issue-analysis':
        report = this.generateIssueAnalysisReport(config, reportId);
        break;
      case 'activity-log':
        report = this.generateActivityLogReport(config, reportId);
        break;
      default:
        throw new Error(`Unknown report type: ${config.type}`);
    }

    return report;
  }

  /**
   * 导出报表
   */
  export(report: GeneratedReport, format: 'pdf' | 'json' | 'csv'): void {
    switch (format) {
      case 'json':
        downloadJSON(report, `report-${report.type}-${this.formatDate(report.generatedAt)}`);
        break;
      case 'csv':
        this.exportReportAsCSV(report);
        break;
      case 'pdf':
        this.exportReportAsPDF(report);
        break;
    }
  }

  // ============================================================================
  // 各类型报表生成方法
  // ============================================================================

  private generateDailyReport(config: ReportConfig, reportId: string): GeneratedReport {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayActivities = this.filterByDateRange(this.activities, startOfDay, endOfDay);
    const todayCommits = this.filterCommitsByDateRange(this.commits, startOfDay, endOfDay);
    const todayIssues = this.issues.filter(i => {
      const created = new Date(i.created_at);
      return created >= startOfDay && created <= endOfDay;
    });

    const workingMembers = this.members.filter(m => m.status === 'working').length;

    return {
      id: reportId,
      type: 'daily',
      title: config.title || `Daily Report - ${this.formatDate(today)}`,
      generatedAt: new Date(),
      dateRange: { start: startOfDay, end: endOfDay },
      summary: {
        keyMetrics: {
          'Active Members': workingMembers,
          'Commits Today': todayCommits.length,
          'Issues Created': todayIssues.length,
          'Activities': todayActivities.length,
        },
        highlights: this.generateDailyHighlights(todayCommits, todayIssues),
        recommendations: this.generateDailyRecommendations(),
      },
      sections: [
        {
          id: 'team-status',
          title: 'Team Status',
          type: 'metrics',
          data: this.getTeamMetrics(),
        },
        {
          id: 'today-activities',
          title: "Today's Activities",
          type: 'list',
          data: todayActivities.slice(0, 20),
        },
        {
          id: 'commits',
          title: 'Commits',
          type: 'table',
          data: todayCommits.map(c => ({
            message: c.commit.message,
            author: c.commit.author.name,
            time: c.commit.author.date,
          })),
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: todayActivities.length + todayCommits.length + todayIssues.length,
      },
    };
  }

  private generateWeeklyReport(config: ReportConfig, reportId: string): GeneratedReport {
    const { start, end } = this.getWeekRange();
    
    const weekActivities = this.filterByDateRange(this.activities, start, end);
    const weekCommits = this.filterCommitsByDateRange(this.commits, start, end);
    const weekIssues = this.filterIssuesByDateRange(this.issues, start, end);

    const completedTasks = this.tasks.filter(t => {
      if (t.status !== 'done' || !t.completedAt) return false;
      const completed = new Date(t.completedAt);
      return completed >= start && completed <= end;
    });

    return {
      id: reportId,
      type: 'weekly',
      title: config.title || `Weekly Report - Week of ${this.formatDate(start)}`,
      generatedAt: new Date(),
      dateRange: { start, end },
      summary: {
        keyMetrics: {
          'Total Commits': weekCommits.length,
          'Issues Opened': weekIssues.filter(i => i.state === 'open').length,
          'Issues Closed': weekIssues.filter(i => i.state === 'closed').length,
          'Tasks Completed': completedTasks.length,
          'Team Size': this.members.length,
        },
        highlights: this.generateWeeklyHighlights(weekCommits, completedTasks),
        recommendations: this.generateWeeklyRecommendations(completedTasks.length),
      },
      sections: [
        {
          id: 'weekly-metrics',
          title: 'Weekly Metrics',
          type: 'metrics',
          data: this.getWeeklyMetrics(weekCommits, weekIssues, completedTasks),
        },
        {
          id: 'activity-breakdown',
          title: 'Activity Breakdown',
          type: 'chart',
          data: this.getActivityBreakdown(weekActivities),
        },
        {
          id: 'top-contributors',
          title: 'Top Contributors',
          type: 'list',
          data: this.getTopContributors(weekCommits),
        },
        {
          id: 'pending-issues',
          title: 'Pending Issues',
          type: 'table',
          data: this.issues.filter(i => i.state === 'open').slice(0, 10),
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: weekActivities.length + weekCommits.length + weekIssues.length,
      },
    };
  }

  private generateMonthlyReport(config: ReportConfig, reportId: string): GeneratedReport {
    const { start, end } = this.getMonthRange();
    
    const monthActivities = this.filterByDateRange(this.activities, start, end);
    const monthCommits = this.filterCommitsByDateRange(this.commits, start, end);
    const monthIssues = this.filterIssuesByDateRange(this.issues, start, end);

    return {
      id: reportId,
      type: 'monthly',
      title: config.title || `Monthly Report - ${start.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      generatedAt: new Date(),
      dateRange: { start, end },
      summary: {
        keyMetrics: {
          'Total Commits': monthCommits.length,
          'Issues Opened': monthIssues.filter(i => i.state === 'open').length,
          'Issues Closed': monthIssues.filter(i => i.state === 'closed').length,
          'Active Days': this.countActiveDays(monthActivities),
        },
        highlights: this.generateMonthlyHighlights(monthCommits, monthIssues),
        recommendations: this.generateMonthlyRecommendations(),
      },
      sections: [
        {
          id: 'monthly-overview',
          title: 'Monthly Overview',
          type: 'metrics',
          data: this.getMonthlyMetrics(monthCommits, monthIssues),
        },
        {
          id: 'trend-analysis',
          title: 'Trend Analysis',
          type: 'chart',
          data: this.getTrendAnalysis(monthActivities),
        },
        {
          id: 'team-performance',
          title: 'Team Performance',
          type: 'table',
          data: this.getTeamPerformanceData(),
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: monthActivities.length + monthCommits.length + monthIssues.length,
      },
    };
  }

  private generateSprintReport(config: ReportConfig, reportId: string): GeneratedReport {
    const sprintTasks = this.tasks;
    const sprintStats = this.calculateTaskStats(sprintTasks);

    return {
      id: reportId,
      type: 'sprint',
      title: config.title || 'Sprint Report',
      generatedAt: new Date(),
      summary: {
        keyMetrics: {
          'Total Tasks': sprintStats.total,
          'Completed': sprintStats.done,
          'In Progress': sprintStats.inProgress,
          'Completion Rate': `${sprintStats.completionRate}%`,
          'Velocity': sprintStats.done,
        },
        highlights: [
          `Completed ${sprintStats.done} tasks this sprint`,
          `Completion rate: ${sprintStats.completionRate}%`,
          `${sprintStats.overdue} tasks overdue`,
        ],
        recommendations: this.generateSprintRecommendations(sprintStats),
      },
      sections: [
        {
          id: 'sprint-metrics',
          title: 'Sprint Metrics',
          type: 'metrics',
          data: sprintStats,
        },
        {
          id: 'task-breakdown',
          title: 'Task Breakdown by Priority',
          type: 'chart',
          data: {
            high: sprintStats.byPriority.high,
            medium: sprintStats.byPriority.medium,
            low: sprintStats.byPriority.low,
          },
        },
        {
          id: 'completed-tasks',
          title: 'Completed Tasks',
          type: 'list',
          data: sprintTasks.filter(t => t.status === 'done'),
        },
        {
          id: 'blocked-tasks',
          title: 'Blocked/Overdue Tasks',
          type: 'list',
          data: sprintTasks.filter(t => t.status !== 'done'),
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: sprintTasks.length,
      },
    };
  }

  private generateTeamPerformanceReport(config: ReportConfig, reportId: string): GeneratedReport {
    const memberPerformance = this.members.map(member => ({
      ...member,
      taskCount: this.tasks.filter(t => t.assignee === member.id).length,
      completedTasks: this.tasks.filter(t => t.assignee === member.id && t.status === 'done').length,
    }));

    return {
      id: reportId,
      type: 'team-performance',
      title: config.title || 'Team Performance Report',
      generatedAt: new Date(),
      summary: {
        keyMetrics: {
          'Team Size': this.members.length,
          'Active Members': this.members.filter(m => m.status === 'working' || m.status === 'busy').length,
          'Total Completed Tasks': this.tasks.filter(t => t.status === 'done').length,
          'Average Tasks per Member': (this.tasks.length / this.members.length).toFixed(1),
        },
        highlights: this.generatePerformanceHighlights(memberPerformance),
        recommendations: this.generatePerformanceRecommendations(memberPerformance),
      },
      sections: [
        {
          id: 'member-stats',
          title: 'Member Statistics',
          type: 'table',
          data: memberPerformance.map(m => ({
            name: m.name,
            role: m.role,
            status: m.status,
            assignedTasks: m.taskCount,
            completedTasks: m.completedTasks,
            provider: m.provider,
          })),
        },
        {
          id: 'status-distribution',
          title: 'Status Distribution',
          type: 'chart',
          data: {
            working: this.members.filter(m => m.status === 'working').length,
            busy: this.members.filter(m => m.status === 'busy').length,
            idle: this.members.filter(m => m.status === 'idle').length,
            offline: this.members.filter(m => m.status === 'offline').length,
          },
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: this.members.length + this.tasks.length,
      },
    };
  }

  private generateTaskSummaryReport(config: ReportConfig, reportId: string): GeneratedReport {
    const stats = this.calculateTaskStats(this.tasks);

    return {
      id: reportId,
      type: 'task-summary',
      title: config.title || 'Task Summary Report',
      generatedAt: new Date(),
      summary: {
        keyMetrics: {
          'Total Tasks': stats.total,
          'Completed': stats.done,
          'In Progress': stats.inProgress,
          'To Do': stats.todo,
          'Completion Rate': `${stats.completionRate}%`,
          'Overdue': stats.overdue,
        },
        highlights: [
          `${stats.completionRate}% completion rate`,
          `${stats.inProgress} tasks in progress`,
          `${stats.overdue} overdue tasks need attention`,
        ],
        recommendations: this.generateTaskRecommendations(stats),
      },
      sections: [
        {
          id: 'task-stats',
          title: 'Task Statistics',
          type: 'metrics',
          data: stats,
        },
        {
          id: 'priority-distribution',
          title: 'Priority Distribution',
          type: 'chart',
          data: stats.byPriority,
        },
        {
          id: 'overdue-tasks',
          title: 'Overdue Tasks',
          type: 'list',
          data: this.tasks.filter(t => this.isTaskOverdue(t)),
        },
        {
          id: 'due-soon',
          title: 'Due Soon (24h)',
          type: 'list',
          data: this.tasks.filter(t => this.isTaskDueSoon(t)),
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: this.tasks.length,
      },
    };
  }

  private generateIssueAnalysisReport(config: ReportConfig, reportId: string): GeneratedReport {
    const openIssues = this.issues.filter(i => i.state === 'open');
    const closedIssues = this.issues.filter(i => i.state === 'closed');
    const unassignedIssues = this.issues.filter(i => !i.assignee);

    const labelCounts: Record<string, number> = {};
    this.issues.forEach(issue => {
      issue.labels.forEach(label => {
        labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
      });
    });

    return {
      id: reportId,
      type: 'issue-analysis',
      title: config.title || 'Issue Analysis Report',
      generatedAt: new Date(),
      summary: {
        keyMetrics: {
          'Total Issues': this.issues.length,
          'Open': openIssues.length,
          'Closed': closedIssues.length,
          'Unassigned': unassignedIssues.length,
          'Resolution Rate': `${Math.round((closedIssues.length / this.issues.length) * 100) || 0}%`,
        },
        highlights: [
          `${openIssues.length} open issues need attention`,
          `${unassignedIssues.length} issues unassigned`,
          `Most common label: ${Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`,
        ],
        recommendations: this.generateIssueRecommendations(openIssues, unassignedIssues),
      },
      sections: [
        {
          id: 'issue-stats',
          title: 'Issue Statistics',
          type: 'metrics',
          data: {
            total: this.issues.length,
            open: openIssues.length,
            closed: closedIssues.length,
            unassigned: unassignedIssues.length,
          },
        },
        {
          id: 'label-breakdown',
          title: 'Label Breakdown',
          type: 'chart',
          data: labelCounts,
        },
        {
          id: 'unassigned-issues',
          title: 'Unassigned Issues',
          type: 'table',
          data: unassignedIssues.slice(0, 20).map(i => ({
            number: i.number,
            title: i.title,
            labels: i.labels.map(l => l.name).join(', '),
            created: i.created_at,
          })),
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: this.issues.length,
      },
    };
  }

  private generateActivityLogReport(config: ReportConfig, reportId: string): GeneratedReport {
    const { start, end } = config.dateRange || this.getWeekRange();
    const filteredActivities = this.filterByDateRange(this.activities, start, end);

    const activityByType: Record<string, number> = {};
    filteredActivities.forEach(a => {
      activityByType[a.type] = (activityByType[a.type] || 0) + 1;
    });

    const activityByAuthor: Record<string, number> = {};
    filteredActivities.forEach(a => {
      activityByAuthor[a.author] = (activityByAuthor[a.author] || 0) + 1;
    });

    return {
      id: reportId,
      type: 'activity-log',
      title: config.title || 'Activity Log Report',
      generatedAt: new Date(),
      dateRange: { start, end },
      summary: {
        keyMetrics: {
          'Total Activities': filteredActivities.length,
          'Unique Authors': Object.keys(activityByAuthor).length,
          'Activity Types': Object.keys(activityByType).length,
        },
        highlights: [
          `${filteredActivities.length} activities recorded`,
          `Most active: ${Object.entries(activityByAuthor).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`,
        ],
        recommendations: [],
      },
      sections: [
        {
          id: 'activity-stats',
          title: 'Activity Statistics',
          type: 'metrics',
          data: {
            total: filteredActivities.length,
            byType: activityByType,
            byAuthor: activityByAuthor,
          },
        },
        {
          id: 'activity-timeline',
          title: 'Activity Timeline',
          type: 'list',
          data: filteredActivities.slice(0, 50),
        },
        {
          id: 'type-breakdown',
          title: 'Type Breakdown',
          type: 'chart',
          data: activityByType,
        },
      ],
      metadata: {
        generatedBy: 'AI Team Dashboard',
        version: '1.0.0',
        totalDataPoints: filteredActivities.length,
      },
    };
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private getWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private getMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private filterByDateRange<T extends { timestamp?: string; created_at?: string }>(
    items: T[],
    start: Date,
    end: Date,
    dateField?: keyof T
  ): T[] {
    return items.filter(item => {
      const dateStr = dateField ? String(item[dateField]) : (item.timestamp || item.created_at);
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= start && date <= end;
    });
  }

  private filterIssuesByDateRange(issues: GitHubIssue[], start: Date, end: Date): GitHubIssue[] {
    return issues.filter(issue => {
      const created = new Date(issue.created_at);
      return created >= start && created <= end;
    });
  }

  private filterCommitsByDateRange(commits: GitHubCommit[], start: Date, end: Date): GitHubCommit[] {
    return commits.filter(commit => {
      const date = new Date(commit.commit.author.date);
      return date >= start && date <= end;
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getTeamMetrics(): Record<string, number> {
    return {
      total: this.members.length,
      working: this.members.filter(m => m.status === 'working').length,
      busy: this.members.filter(m => m.status === 'busy').length,
      idle: this.members.filter(m => m.status === 'idle').length,
      offline: this.members.filter(m => m.status === 'offline').length,
    };
  }

  private getWeeklyMetrics(commits: GitHubCommit[], issues: GitHubIssue[], completedTasks: Task[]): Record<string, unknown> {
    return {
      commits: commits.length,
      issuesOpened: issues.filter(i => i.state === 'open').length,
      issuesClosed: issues.filter(i => i.state === 'closed').length,
      tasksCompleted: completedTasks.length,
      averageCommitsPerDay: (commits.length / 7).toFixed(1),
    };
  }

  private getMonthlyMetrics(commits: GitHubCommit[], issues: GitHubIssue[]): Record<string, unknown> {
    return {
      totalCommits: commits.length,
      totalIssues: issues.length,
      openIssues: issues.filter(i => i.state === 'open').length,
      closedIssues: issues.filter(i => i.state === 'closed').length,
    };
  }

  private getActivityBreakdown(activities: ActivityItem[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    activities.forEach(a => {
      breakdown[a.type] = (breakdown[a.type] || 0) + 1;
    });
    return breakdown;
  }

  private getTopContributors(commits: GitHubCommit[]): Array<{ author: string; count: number }> {
    const counts: Record<string, number> = {};
    commits.forEach(c => {
      counts[c.commit.author.name] = (counts[c.commit.author.name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getTrendAnalysis(activities: ActivityItem[]): Record<string, unknown> {
    // 按天分组活动
    const byDay: Record<string, number> = {};
    activities.forEach(a => {
      const day = new Date(a.timestamp).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return byDay;
  }

  private getTeamPerformanceData(): Array<Record<string, unknown>> {
    return this.members.map(m => ({
      name: m.name,
      role: m.role,
      status: m.status,
      completedTasks: m.completedTasks,
      provider: m.provider,
    }));
  }

  private countActiveDays(activities: ActivityItem[]): number {
    const days = new Set(activities.map(a => new Date(a.timestamp).toDateString()));
    return days.size;
  }

  private calculateTaskStats(tasks: Task[]): TaskStats {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const overdue = tasks.filter(t => this.isTaskOverdue(t)).length;
    const dueSoon = tasks.filter(t => this.isTaskDueSoon(t)).length;

    return {
      total,
      done,
      inProgress,
      todo,
      review,
      overdue,
      dueSoon,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      byPriority: {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
      },
    };
  }

  private isTaskOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  }

  private isTaskDueSoon(task: Task): boolean {
    if (!task.dueDate || task.status === 'done') return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
  }

  private generateDailyHighlights(commits: GitHubCommit[], issues: GitHubIssue[]): string[] {
    const highlights: string[] = [];
    if (commits.length > 0) {
      highlights.push(`${commits.length} commits made today`);
    }
    if (issues.length > 0) {
      highlights.push(`${issues.length} new issues created`);
    }
    return highlights;
  }

  private generateDailyRecommendations(): string[] {
    const recommendations: string[] = [];
    const workingCount = this.members.filter(m => m.status === 'working').length;
    if (workingCount < this.members.length / 2) {
      recommendations.push('Consider checking in with offline team members');
    }
    return recommendations;
  }

  private generateWeeklyHighlights(commits: GitHubCommit[], completedTasks: Task[]): string[] {
    return [
      `${commits.length} commits this week`,
      `${completedTasks.length} tasks completed`,
      `Team utilization: ${Math.round((this.members.filter(m => m.status !== 'offline').length / this.members.length) * 100)}%`,
    ];
  }

  private generateWeeklyRecommendations(completedTasks: number): string[] {
    const recommendations: string[] = [];
    if (completedTasks < 5) {
      recommendations.push('Consider increasing sprint velocity');
    }
    const overdueCount = this.tasks.filter(t => this.isTaskOverdue(t)).length;
    if (overdueCount > 0) {
      recommendations.push(`${overdueCount} tasks are overdue - prioritize accordingly`);
    }
    return recommendations;
  }

  private generateMonthlyHighlights(commits: GitHubCommit[], issues: GitHubIssue[]): string[] {
    return [
      `${commits.length} total commits`,
      `${issues.filter(i => i.state === 'closed').length} issues resolved`,
      `Active development throughout the month`,
    ];
  }

  private generateMonthlyRecommendations(): string[] {
    return [
      'Review team capacity for next month',
      'Analyze bottlenecks in the development process',
    ];
  }

  private generateSprintRecommendations(stats: TaskStats): string[] {
    const recommendations: string[] = [];
    if (stats.completionRate < 70) {
      recommendations.push('Sprint completion rate below target - review scope');
    }
    if (stats.overdue > 0) {
      recommendations.push('Address overdue tasks in next sprint planning');
    }
    return recommendations;
  }

  private generatePerformanceHighlights(members: Array<AIMember & { taskCount: number; completedTasks: number }>): string[] {
    const topPerformer = members.sort((a, b) => b.completedTasks - a.completedTasks)[0];
    return [
      `Top performer: ${topPerformer?.name || 'N/A'} with ${topPerformer?.completedTasks || 0} completed tasks`,
      `${members.filter(m => m.status === 'working').length} members actively working`,
    ];
  }

  private generatePerformanceRecommendations(members: Array<AIMember & { taskCount: number; completedTasks: number }>): string[] {
    const recommendations: string[] = [];
    const idleMembers = members.filter(m => m.status === 'idle');
    if (idleMembers.length > 0) {
      recommendations.push(`${idleMembers.length} idle members could take on more tasks`);
    }
    return recommendations;
  }

  private generateTaskRecommendations(stats: TaskStats): string[] {
    const recommendations: string[] = [];
    if (stats.overdue > 0) {
      recommendations.push('Prioritize overdue tasks');
    }
    if (stats.inProgress > stats.done) {
      recommendations.push('Consider focusing on completing existing tasks before starting new ones');
    }
    if (stats.byPriority.high > 3) {
      recommendations.push('Many high-priority tasks - consider resource allocation');
    }
    return recommendations;
  }

  private generateIssueRecommendations(openIssues: GitHubIssue[], unassignedIssues: GitHubIssue[]): string[] {
    const recommendations: string[] = [];
    if (unassignedIssues.length > 0) {
      recommendations.push(`Assign ${unassignedIssues.length} unassigned issues to team members`);
    }
    if (openIssues.length > 10) {
      recommendations.push('Consider prioritizing and triaging open issues');
    }
    return recommendations;
  }

  private exportReportAsCSV(report: GeneratedReport): void {
    // 导出摘要
    const summaryData = Object.entries(report.summary.keyMetrics).map(([key, value]) => ({
      Metric: key,
      Value: value,
    }));
    downloadCSV(summaryData, `${report.type}-summary-${this.formatDate(report.generatedAt)}`);

    // 导出高亮和建议
    const insights = [
      ...report.summary.highlights.map(h => ({ Type: 'Highlight', Content: h })),
      ...report.summary.recommendations.map(r => ({ Type: 'Recommendation', Content: r })),
    ];
    if (insights.length > 0) {
      downloadCSV(insights, `${report.type}-insights-${this.formatDate(report.generatedAt)}`);
    }
  }

  private exportReportAsPDF(report: GeneratedReport): void {
    // 使用现有的 PDF 导出功能
    if (report.type === 'task-summary' || report.type === 'sprint') {
      const stats = this.calculateTaskStats(this.tasks);
      exportTasksPDF(this.tasks, stats);
    } else {
      // 对于其他类型的报表，导出 JSON 格式
      console.log('PDF export for this report type is not yet implemented. Exporting as JSON instead.');
      downloadJSON(report, `${report.type}-report-${this.formatDate(report.generatedAt)}`);
    }
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速生成日报
 */
export function generateQuickDailyReport(data: {
  members: AIMember[];
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  tasks: Task[];
}): GeneratedReport {
  const generator = new ReportGenerator(data);
  return generator.generate({ type: 'daily' });
}

/**
 * 快速生成周报
 */
export function generateQuickWeeklyReport(data: {
  members: AIMember[];
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  tasks: Task[];
}): GeneratedReport {
  const generator = new ReportGenerator(data);
  return generator.generate({ type: 'weekly' });
}

/**
 * 快速生成任务摘要报表
 */
export function generateQuickTaskSummary(tasks: Task[]): GeneratedReport {
  const generator = new ReportGenerator({ tasks });
  return generator.generate({ type: 'task-summary' });
}

/**
 * 快速生成团队绩效报表
 */
export function generateQuickTeamPerformanceReport(data: {
  members: AIMember[];
  tasks: Task[];
}): GeneratedReport {
  const generator = new ReportGenerator(data);
  return generator.generate({ type: 'team-performance' });
}
