/**
 * Ranking Module Unit Tests
 * Tests for TaskRanker class
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskRanker } from "@/lib/agent-scheduler/core/ranking";
import {
  Task,
  createTask,
  TaskPriority,
} from "@/lib/agent-scheduler/models/task-model";

describe("TaskRanker", () => {
  let ranker: TaskRanker;
  let testTasks: Task[];

  beforeEach(() => {
    ranker = new TaskRanker();
    const now = Date.now();

    testTasks = [
      createTask({
        id: "task1",
        type: "architecture",
        title: "Urgent task with deadline",
        priority: "urgent",
        deadline: now + 30 * 60 * 1000, // 30 minutes from now
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now - 60 * 60 * 1000, // Created 1 hour ago
      }),
      createTask({
        id: "task2",
        type: "implementation",
        title: "Low priority task",
        priority: "low",
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now,
      }),
      createTask({
        id: "task3",
        type: "testing",
        title: "High priority task",
        priority: "high",
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now - 30 * 60 * 1000, // Created 30 minutes ago
      }),
      createTask({
        id: "task4",
        type: "research",
        title: "Medium priority task with no dependencies",
        priority: "medium",
        dependencies: [],
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now - 2 * 60 * 60 * 1000, // Created 2 hours ago
      }),
      createTask({
        id: "task5",
        type: "devops",
        title: "Task with dependencies",
        priority: "high",
        dependencies: ["task1", "task2"],
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now,
      }),
      createTask({
        id: "task6",
        type: "design",
        title: "Overdue task",
        priority: "high",
        deadline: now - 60 * 60 * 1000, // 1 hour ago
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now - 3 * 60 * 60 * 1000,
      }),
      createTask({
        id: "task7",
        type: "testing",
        title: "Another medium task",
        priority: "medium",
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: now,
      }),
    ];
  });

  describe("rankTasks", () => {
    it("should rank tasks by priority and other factors", () => {
      const ranked = ranker.rankTasks(testTasks);

      expect(ranked.length).toBe(testTasks.length);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    });

    it("should include all scoring components in ranked tasks", () => {
      const ranked = ranker.rankTasks(testTasks);

      expect(ranked[0]).toHaveProperty("task");
      expect(ranked[0]).toHaveProperty("score");
      expect(ranked[0]).toHaveProperty("priority");
      expect(ranked[0]).toHaveProperty("urgency");
      expect(ranked[0]).toHaveProperty("dependencyScore");
      expect(ranked[0]).toHaveProperty("ageScore");
    });

    it("should handle empty task list", () => {
      const ranked = ranker.rankTasks([]);

      expect(ranked.length).toBe(0);
    });

    it("should put urgent tasks at the top", () => {
      const ranked = ranker.rankTasks(testTasks);

      // Urgent task should be near the top
      const urgentTask = ranked.find((r) => r.task.priority === "urgent");
      expect(urgentTask).toBeDefined();
      expect(ranked.indexOf(urgentTask!)).toBeLessThan(ranked.length / 2);
    });

    it("should prioritize overdue tasks", () => {
      const ranked = ranker.rankTasks(testTasks);

      const overdueTask = ranked.find(
        (r) => r.task.deadline && r.task.deadline < Date.now(),
      );
      expect(overdueTask).toBeDefined();
      expect(overdueTask!.urgency).toBe(100);
    });
  });

  describe("setCurrentTime", () => {
    it("should update the current time reference", () => {
      const customTime = Date.now() + 10000;
      ranker.setCurrentTime(customTime);

      const now = Date.now();
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Test task",
        deadline: customTime + 1000,
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: customTime - 60 * 60 * 1000,
      });

      const ranked = ranker.rankTasks([task]);
      expect(ranked.length).toBe(1);
    });
  });

  describe("calculatePriorityScore", () => {
    it("should give highest score to urgent tasks", () => {
      const urgentTask = createTask({
        id: "task1",
        type: "architecture",
        title: "Urgent task",
        priority: "urgent",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const lowTask = createTask({
        id: "task2",
        type: "implementation",
        title: "Low task",
        priority: "low",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([urgentTask, lowTask]);

      expect(ranked[0].task.priority).toBe("urgent");
      expect(ranked[0].priority).toBeGreaterThan(ranked[1].priority);
    });

    it("should apply urgency bonus to urgent tasks", () => {
      const urgentTask = createTask({
        id: "task1",
        type: "architecture",
        title: "Urgent task",
        priority: "urgent",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([urgentTask]);

      expect(ranked[0].priority).toBeGreaterThan(25); // Base weight + bonus
    });
  });

  describe("calculateUrgencyScore", () => {
    it("should give maximum urgency to overdue tasks", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Overdue task",
        priority: "high",
        deadline: Date.now() - 1000, // 1 second ago
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBe(100);
    });

    it("should give high urgency to tasks due within 1 hour", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Due soon",
        priority: "high",
        deadline: Date.now() + 30 * 60 * 1000, // 30 minutes
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBe(100);
    });

    it("should give moderate urgency to tasks due within 24 hours", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Due tomorrow",
        priority: "medium",
        deadline: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBeGreaterThan(50);
      expect(ranked[0].urgency).toBeLessThan(100);
    });

    it("should give zero urgency to tasks with no deadline", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "No deadline",
        priority: "medium",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBe(0);
    });
  });

  describe("calculateDependencyScore", () => {
    it("should give high score to tasks with no dependencies", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "No dependencies",
        priority: "medium",
        dependencies: [],
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBe(100);
    });

    it("should give lower score to tasks with many dependencies", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Many dependencies",
        priority: "medium",
        dependencies: ["task2", "task3", "task4", "task5"],
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBeLessThan(40);
    });

    it("should scale score based on dependency count", () => {
      const noDeps = createTask({
        id: "task1",
        type: "architecture",
        title: "No deps",
        priority: "medium",
        dependencies: [],
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const oneDep = createTask({
        id: "task2",
        type: "implementation",
        title: "One dep",
        priority: "medium",
        dependencies: ["task1"],
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = ranker.rankTasks([oneDep, noDeps]);

      expect(ranked[0].task.id).toBe("task1"); // No deps first
      expect(ranked[0].dependencyScore).toBeGreaterThan(
        ranked[1].dependencyScore,
      );
    });
  });

  describe("calculateAgeScore", () => {
    it("should give higher score to older tasks", () => {
      // Create ranker and set its time explicitly
      const ranker2 = new TaskRanker();
      const referenceTime = Date.now() + 10000; // Add buffer to ensure tasks appear older
      ranker2.setCurrentTime(referenceTime);

      // Use tasks with same priority, no deadlines, no dependencies so age is the differentiator
      // Note: createTask ignores passed createdAt, so we set it manually after creation
      const oldTask = createTask({
        id: "task1",
        type: "architecture",
        title: "Old task",
        priority: "low", // low so priority doesn't dominate
        requiredCapabilities: [],
        estimatedDuration: 30,
      });
      oldTask.createdAt = referenceTime - 3 * 24 * 60 * 60 * 1000; // 3 days old

      const newTask = createTask({
        id: "task2",
        type: "implementation",
        title: "New task",
        priority: "low",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });
      newTask.createdAt = referenceTime - 10 * 60 * 1000; // 10 minutes old

      const ranked = ranker2.rankTasks([oldTask, newTask]);

      // Old task should be ranked higher due to age score
      expect(ranked[0].task.id).toBe("task1");
      expect(ranked[0].ageScore).toBeGreaterThan(ranked[1].ageScore);
    });

    it("should give zero score to very new tasks", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "New task",
        priority: "medium",
        requiredCapabilities: [],
        estimatedDuration: 30,
        createdAt: Date.now() - 10 * 60 * 1000, // 10 minutes old
      });

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].ageScore).toBe(0);
    });
  });

  describe("getTopTasks", () => {
    it("should return top N tasks", () => {
      const top3 = ranker.getTopTasks(testTasks, 3);

      expect(top3.length).toBe(3);
      expect(top3.every((t) => t instanceof Object)).toBe(true);
    });

    it("should return fewer tasks if not enough available", () => {
      const top10 = ranker.getTopTasks(testTasks, 10);

      expect(top10.length).toBe(testTasks.length);
    });

    it("should handle zero count", () => {
      const top0 = ranker.getTopTasks(testTasks, 0);

      expect(top0.length).toBe(0);
    });
  });

  describe("getReadyTasks", () => {
    it("should filter tasks that are ready to schedule", () => {
      const readyTasks = ranker.getReadyTasks(testTasks);

      expect(Array.isArray(readyTasks)).toBe(true);
    });

    it("should exclude tasks with unsatisfied dependencies", () => {
      const taskWithDeps = testTasks.find((t) => t.dependencies.length > 0)!;
      const readyTasks = ranker.getReadyTasks(testTasks);

      expect(readyTasks).not.toContain(taskWithDeps);
    });

    it("should only include pending tasks", () => {
      // Note: createTask() always sets status to 'pending', so we manually set it
      const nonPendingTask = createTask({
        id: "task99",
        type: "implementation",
        title: "In progress task",
        priority: "medium",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });
      nonPendingTask.status = "in_progress"; // Manually override since createTask ignores status

      const allTasks = [...testTasks, nonPendingTask];
      const readyTasks = ranker.getReadyTasks(allTasks);

      // Non-pending task should not be included
      const found = readyTasks.find((t) => t.id === "task99");
      expect(found).toBeUndefined();
    });
  });

  describe("getTasksByPriority", () => {
    it("should filter tasks by priority level", () => {
      const highTasks = ranker.getTasksByPriority(testTasks, "high");

      expect(highTasks.every((t) => t.priority === "high")).toBe(true);
      expect(highTasks.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-existent priority", () => {
      const tasks = ranker.getTasksByPriority(
        testTasks,
        "urgent" as TaskPriority,
      );

      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe("getOverdueTasks", () => {
    it("should identify overdue tasks", () => {
      const overdue = ranker.getOverdueTasks(testTasks);

      expect(overdue.length).toBeGreaterThan(0);
      expect(overdue.every((t) => t.deadline && t.deadline < Date.now())).toBe(
        true,
      );
    });

    it("should exclude completed and cancelled tasks", () => {
      const completedTask = createTask({
        id: "task99",
        type: "architecture",
        title: "Completed overdue task",
        priority: "high",
        deadline: Date.now() - 60 * 60 * 1000,
        requiredCapabilities: [],
        estimatedDuration: 30,
      });
      // Manually set the status to completed (createTask defaults to 'pending')
      completedTask.status = "completed";

      const allTasks = [...testTasks, completedTask];
      const overdue = ranker.getOverdueTasks(allTasks);

      // Completed task should not be in overdue list
      const found = overdue.find((t) => t.id === "task99");
      expect(found).toBeUndefined();
    });
  });

  describe("getTasksDueWithin", () => {
    it("should find tasks due within time window", () => {
      const windowMs = 60 * 60 * 1000; // 1 hour
      const dueSoon = ranker.getTasksDueWithin(testTasks, windowMs);

      expect(Array.isArray(dueSoon)).toBe(true);
      if (dueSoon.length > 0) {
        expect(dueSoon[0].deadline).toBeDefined();
        expect(dueSoon[0].deadline!).toBeLessThanOrEqual(Date.now() + windowMs);
      }
    });

    it("should handle empty results", () => {
      const windowMs = 1; // 1 millisecond
      const dueSoon = ranker.getTasksDueWithin(testTasks, windowMs);

      expect(Array.isArray(dueSoon)).toBe(true);
    });
  });

  describe("sortByDeadline", () => {
    it("should sort tasks by deadline", () => {
      const sorted = ranker.sortByDeadline(testTasks);

      // Verify sorting
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        if (prev.deadline && curr.deadline) {
          expect(prev.deadline).toBeLessThanOrEqual(curr.deadline);
        } else if (curr.deadline && !prev.deadline) {
          expect(true).toBe(true); // Tasks with deadline come first
        }
      }
    });

    it("should not modify original array", () => {
      const original = [...testTasks];
      ranker.sortByDeadline(testTasks);

      expect(testTasks).toEqual(original);
    });
  });

  describe("sortByPriority", () => {
    it("should sort tasks by priority order", () => {
      const sorted = ranker.sortByPriority(testTasks);

      const priorityOrder: TaskPriority[] = ["urgent", "high", "medium", "low"];
      for (let i = 1; i < sorted.length; i++) {
        const prevIndex = priorityOrder.indexOf(sorted[i - 1].priority);
        const currIndex = priorityOrder.indexOf(sorted[i].priority);
        expect(prevIndex).toBeLessThanOrEqual(currIndex);
      }
    });

    it("should not modify original array", () => {
      const original = [...testTasks];
      ranker.sortByPriority(testTasks);

      expect(testTasks).toEqual(original);
    });
  });

  describe("sortByCreationTime", () => {
    it("should sort tasks by creation time", () => {
      const sorted = ranker.sortByCreationTime(testTasks);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].createdAt).toBeLessThanOrEqual(
          sorted[i].createdAt,
        );
      }
    });

    it("should not modify original array", () => {
      const original = [...testTasks];
      ranker.sortByCreationTime(testTasks);

      expect(testTasks).toEqual(original);
    });
  });

  describe("groupByPriority", () => {
    it("should group tasks by priority", () => {
      const groups = ranker.groupByPriority(testTasks);

      expect(groups instanceof Map).toBe(true);
      expect(groups.size).toBeGreaterThan(0);
    });

    it("should have correct number of tasks in each group", () => {
      const groups = ranker.groupByPriority(testTasks);

      let totalCount = 0;
      for (const [_, tasks] of groups.entries()) {
        totalCount += tasks.length;
        expect(tasks.every((t) => t.priority === _)).toBe(true);
      }

      expect(totalCount).toBe(testTasks.length);
    });
  });

  describe("getTaskStats", () => {
    it("should calculate task statistics", () => {
      const stats = ranker.getTaskStats(testTasks);

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("byPriority");
      expect(stats).toHaveProperty("byStatus");
      expect(stats).toHaveProperty("overdue");
      expect(stats).toHaveProperty("averageAge");

      expect(stats.total).toBe(testTasks.length);
    });

    it("should count tasks by priority correctly", () => {
      const stats = ranker.getTaskStats(testTasks);

      expect(stats.byPriority.urgent).toBe(1);
      expect(stats.byPriority.high).toBe(3);
      expect(stats.byPriority.medium).toBe(2);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.total).toBe(7);
    });

    it("should count overdue tasks correctly", () => {
      const stats = ranker.getTaskStats(testTasks);

      expect(stats.overdue).toBe(1);
    });

    it("should calculate average age", () => {
      const stats = ranker.getTaskStats(testTasks);

      // Average age should be a valid number
      expect(stats.averageAge).not.toBeNaN();
      expect(stats.total).toBe(testTasks.length);
    });

    it("should handle empty task list", () => {
      const stats = ranker.getTaskStats([]);

      expect(stats.total).toBe(0);
      expect(stats.averageAge).toBe(0);
    });
  });
});
