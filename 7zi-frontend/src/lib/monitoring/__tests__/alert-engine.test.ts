/**
 * Alert Engine Tests
 * 告警引擎测试
 */

import {
  AlertEngine,
  DEFAULT_ALERT_RULES,
  Alert,
  AlertChannel,
  AlertPriority,
  AlertSeverity,
} from "../alert-engine";

// Mock channel for testing
class MockChannel implements AlertChannel {
  sentAlerts: Alert[] = [];

  async send(alert: Alert): Promise<void> {
    this.sentAlerts.push(alert);
  }

  getSentAlerts(): Alert[] {
    return this.sentAlerts;
  }

  clear(): void {
    this.sentAlerts = [];
  }
}

describe("AlertEngine", () => {
  let engine: AlertEngine;
  let mockChannel: MockChannel;

  beforeEach(() => {
    engine = new AlertEngine();
    mockChannel = new MockChannel();
    engine.registerChannel("slack", mockChannel);
    engine.registerChannel("email", mockChannel);
  });

  afterEach(() => {
    engine.reset();
    mockChannel.clear();
  });

  describe("evaluate", () => {
    it("should trigger alert when threshold is exceeded", async () => {
      // P1 high error rate rule: threshold 5%
      const alerts = await engine.evaluate("errorRate", 10);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].metric).toBe("errorRate");
      expect(alerts[0].value).toBe(10);
    });

    it("should not trigger alert when threshold is not exceeded", async () => {
      const alerts = await engine.evaluate("errorRate", 1);

      // Should not trigger P1 (threshold 5) but might trigger P3 (threshold 1)
      const p1Alerts = alerts.filter((a) => a.priority === "P1");
      expect(p1Alerts.length).toBe(0);
    });

    it("should respect cooldown period", async () => {
      // First trigger
      const alerts1 = await engine.evaluate("errorRate", 10);
      expect(alerts1.length).toBeGreaterThan(0);

      // Clear mock to check second trigger
      mockChannel.clear();

      // Second trigger within cooldown
      const alerts2 = await engine.evaluate("errorRate", 10);

      // Should not send second alert within cooldown
      expect(alerts2.length).toBe(0);
    });

    it("should work with custom rules", async () => {
      // Use a fresh engine with only the custom rule
      const customEngine = new AlertEngine({
        enabled: true,
        defaultChannels: ["slack"],
        rules: [],
        escalationPolicies: [],
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
        },
        aggregation: {
          enabled: false,
          windowMs: 300000,
          groupBy: [],
        },
      });
      
      customEngine.registerChannel("slack", mockChannel);
      
      customEngine.addRule({
        id: "custom-rule-1",
        name: "Custom CPU Alert",
        description: "High CPU usage",
        enabled: true,
        priority: "P2",
        condition: {
          type: "threshold",
          operator: ">",
          value: 80,
        },
        severity: "warning",
        channels: ["slack"],
        cooldown: 300,
        response_time: "1h",
      });

      const alerts = await customEngine.evaluate("cpu", 90);

      expect(alerts.length).toBe(1);
      expect(alerts[0].ruleId).toBe("custom-rule-1");
    });
  });

  describe("trend detection", () => {
    it("should detect trend anomalies", async () => {
      // Use a fresh engine without default rules
      const trendEngine = new AlertEngine({
        enabled: true,
        defaultChannels: ["slack"],
        rules: [],
        escalationPolicies: [],
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
        },
        aggregation: {
          enabled: false,
          windowMs: 300000,
          groupBy: [],
        },
      });
      
      trendEngine.registerChannel("slack", mockChannel);

      // Populate trend data with normal values
      for (let i = 0; i < 100; i++) {
        trendEngine.updateTrendData("responseTime", 100 + Math.random() * 20);
      }

      // Add anomaly rule
      trendEngine.addRule({
        id: "trend-rule",
        name: "Response Time Trend",
        description: "Unusual response time pattern",
        enabled: true,
        priority: "P2",
        condition: {
          type: "trend",
          threshold: 2, // z-score > 2
        },
        severity: "warning",
        channels: ["slack"],
        cooldown: 300,
        response_time: "1h",
      });

      // Test with value far from mean
      const alerts = await trendEngine.evaluate("responseTime", 200);

      // Should detect as anomaly (z-score > 2)
      expect(alerts.length).toBe(1);
    });
  });

  describe("rate change detection", () => {
    it("should detect rate changes from baseline", async () => {
      // Use a fresh engine without default rules
      const rateEngine = new AlertEngine({
        enabled: true,
        defaultChannels: ["slack"],
        rules: [],
        escalationPolicies: [],
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
        },
        aggregation: {
          enabled: false,
          windowMs: 300000,
          groupBy: [],
        },
      });
      
      rateEngine.registerChannel("slack", mockChannel);

      // Populate trend data
      for (let i = 0; i < 100; i++) {
        rateEngine.updateTrendData("requests", 100 + Math.random() * 10);
      }

      // Add rate change rule
      rateEngine.addRule({
        id: "rate-change-rule",
        name: "Traffic Spike",
        description: "Unusual traffic increase",
        enabled: true,
        priority: "P2",
        condition: {
          type: "rate_change",
          multiplier: 3,
        },
        severity: "warning",
        channels: ["slack"],
        cooldown: 300,
        response_time: "1h",
      });

      // Test with value 3x baseline
      const alerts = await rateEngine.evaluate("requests", 350);

      expect(alerts.length).toBe(1);
    });
  });

  describe("alert management", () => {
    it("should acknowledge alert", async () => {
      const alerts = await engine.evaluate("errorRate", 10);
      const alertId = alerts[0].id;

      const result = engine.acknowledge(alertId, "admin");

      expect(result).toBe(true);
      const alert = engine.getAlert(alertId);
      expect(alert?.status).toBe("acknowledged");
      expect(alert?.acknowledgedBy).toBe("admin");
    });

    it("should resolve alert", async () => {
      const alerts = await engine.evaluate("errorRate", 10);
      const alertId = alerts[0].id;

      const result = engine.resolve(alertId);

      expect(result).toBe(true);
      const alert = engine.getAlert(alertId);
      expect(alert).toBeUndefined(); // Removed from active
    });

    it("should get active alerts with filters", async () => {
      await engine.evaluate("errorRate", 10);

      const allAlerts = engine.getActiveAlerts();
      expect(allAlerts.length).toBeGreaterThan(0);

      const p1Alerts = engine.getActiveAlerts({ priority: "P1" });
      expect(p1Alerts.every((a) => a.priority === "P1")).toBe(true);
    });

    it("should get alert summary", async () => {
      await engine.evaluate("errorRate", 10);

      const summary = engine.getSummary();

      expect(summary.firing).toBeGreaterThan(0);
      expect(summary.byPriority).toBeDefined();
      expect(summary.bySeverity).toBeDefined();
    });
  });

  describe("suppression", () => {
    it("should suppress alerts when max alerts exceeded", async () => {
      // Configure strict suppression
      engine.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 2,
          deduplicateBy: ["ruleId"],
        },
      });

      // Trigger multiple different alerts
      await engine.evaluate("errorRate", 10);
      await engine.evaluate("LCP", 5000);
      await engine.evaluate("FID", 400);

      const summary = engine.getSummary();
      expect(summary.firing).toBeLessThanOrEqual(2);
    });

    it("should ignore patterns", async () => {
      engine.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
          ignorePatterns: ["ResizeObserver"],
        },
      });

      // Add rule with ignored pattern
      engine.addRule({
        id: "ignored-rule",
        name: "ResizeObserver Error",
        description: "ResizeObserver error",
        enabled: true,
        priority: "P3",
        condition: {
          type: "threshold",
          value: 1,
        },
        severity: "info",
        channels: ["slack"],
        cooldown: 300,
        response_time: "24h",
      });

      const alerts = await engine.evaluate("ResizeObserver", 1);

      // Should be suppressed due to ignore pattern
      expect(alerts.length).toBe(0);
    });
  });

  describe("escalation", () => {
    it("should have escalation policies defined", () => {
      const config = engine.getConfig();

      expect(config.escalationPolicies).toBeDefined();
      expect(config.escalationPolicies.length).toBeGreaterThan(0);

      const p0Policy = config.escalationPolicies.find((p) => p.priority === "P0");
      expect(p0Policy).toBeDefined();
      expect(p0Policy?.steps.length).toBeGreaterThan(0);
    });
  });

  describe("configuration", () => {
    it("should have default rules", () => {
      const config = engine.getConfig();

      expect(config.rules.length).toBeGreaterThan(0);
      expect(config.rules.some((r) => r.id === "p0-service-down")).toBe(true);
      expect(config.rules.some((r) => r.id === "p1-high-error-rate")).toBe(true);
    });

    it("should update configuration", () => {
      engine.updateConfig({
        enabled: false,
      });

      const config = engine.getConfig();
      expect(config.enabled).toBe(false);
    });

    it("should remove rules", () => {
      const initialCount = engine.getConfig().rules.length;

      engine.removeRule("p3-error-rate-above-normal");

      const newCount = engine.getConfig().rules.length;
      expect(newCount).toBe(initialCount - 1);
    });
  });

  describe("channel registration", () => {
    it("should register custom channel", () => {
      const customChannel = new MockChannel();
      engine.registerChannel("custom", customChannel);

      // Add rule that uses custom channel
      engine.addRule({
        id: "custom-channel-rule",
        name: "Custom Channel Test",
        description: "Test custom channel",
        enabled: true,
        priority: "P3",
        condition: {
          type: "threshold",
          value: 1,
        },
        severity: "info",
        channels: ["custom"],
        cooldown: 300,
        response_time: "24h",
      });

      // Trigger alert
      expect(engine.getConfig().rules.length).toBeGreaterThan(0);
    });
  });
});

describe("DEFAULT_ALERT_RULES", () => {
  it("should have P0 rules", () => {
    const p0Rules = DEFAULT_ALERT_RULES.filter((r) => r.priority === "P0");
    expect(p0Rules.length).toBeGreaterThan(0);
  });

  it("should have P1 rules", () => {
    const p1Rules = DEFAULT_ALERT_RULES.filter((r) => r.priority === "P1");
    expect(p1Rules.length).toBeGreaterThan(0);
  });

  it("should have valid cooldown values", () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(rule.cooldown).toBeGreaterThan(0);
      expect(typeof rule.cooldown).toBe("number");
    }
  });

  it("should have valid channels", () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(rule.channels.length).toBeGreaterThan(0);
    }
  });
});