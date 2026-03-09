import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendSlackAlert,
  sendEmailAlert,
  sendAlert,
  alerts,
  type AlertConfig,
  type AlertSeverity,
} from './alerts';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Alerts Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
    vi.stubEnv('RESEND_API_KEY', 'test-api-key');
    vi.stubEnv('ALERT_EMAIL_RECIPIENTS', 'admin@test.com,user@test.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('sendSlackAlert', () => {
    it('should send alert to Slack successfully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const config: AlertConfig = {
        severity: 'p1',
        title: 'Test Alert',
        message: 'This is a test alert',
      };

      const result = await sendSlackAlert(config);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return false when Slack webhook is not configured', async () => {
      vi.stubEnv('SLACK_WEBHOOK_URL', '');

      const config: AlertConfig = {
        severity: 'p1',
        title: 'Test Alert',
        message: 'This is a test alert',
      };

      const result = await sendSlackAlert(config);

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should include details in Slack attachment', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const config: AlertConfig = {
        severity: 'p0',
        title: 'Critical Alert',
        message: 'Critical system failure',
        details: {
          Server: 'prod-01',
          Region: 'us-east-1',
        },
        url: 'https://example.com/alerts/123',
      };

      await sendSlackAlert(config);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.attachments[0].color).toBe('#FF0000'); // p0 color
      expect(body.attachments[0].title).toContain('CRITICAL');
      expect(body.attachments[0].fields).toHaveLength(2);
      expect(body.attachments[0].actions).toBeDefined();
      expect(body.attachments[0].actions[0].url).toBe('https://example.com/alerts/123');
    });

    it('should handle Slack API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config: AlertConfig = {
        severity: 'p2',
        title: 'Test Alert',
        message: 'Test message',
      };

      const result = await sendSlackAlert(config);

      expect(result).toBe(false);
    });

    it('should return false when Slack returns non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const config: AlertConfig = {
        severity: 'p3',
        title: 'Test Alert',
        message: 'Test message',
      };

      const result = await sendSlackAlert(config);

      expect(result).toBe(false);
    });
  });

  describe('sendEmailAlert', () => {
    it('should send email alert successfully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const config: AlertConfig = {
        severity: 'p0',
        title: 'Critical Email Alert',
        message: 'This is a critical alert',
        details: {
          Service: 'API Gateway',
          Error: 'Connection timeout',
        },
      };

      const result = await sendEmailAlert(config);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should return false when Resend API key is not configured', async () => {
      vi.stubEnv('RESEND_API_KEY', '');

      const config: AlertConfig = {
        severity: 'p1',
        title: 'Test Alert',
        message: 'Test message',
      };

      const result = await sendEmailAlert(config);

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle email API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Email service unavailable'));

      const config: AlertConfig = {
        severity: 'p0',
        title: 'Test Alert',
        message: 'Test message',
      };

      const result = await sendEmailAlert(config);

      expect(result).toBe(false);
    });
  });

  describe('sendAlert', () => {
    it('should send to Slack and email for P0 alerts', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const config: AlertConfig = {
        severity: 'p0',
        title: 'P0 Alert',
        message: 'Critical system failure',
      };

      const result = await sendAlert(config);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Slack + Email
    });

    it('should send to Slack and email for P1 alerts', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const config: AlertConfig = {
        severity: 'p1',
        title: 'P1 Alert',
        message: 'High priority issue',
      };

      const result = await sendAlert(config);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(true);
    });

    it('should only send to Slack for P2 alerts', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const config: AlertConfig = {
        severity: 'p2',
        title: 'P2 Alert',
        message: 'Warning',
      };

      const result = await sendAlert(config);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(false);
    });

    it('should only send to Slack for P3 alerts', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const config: AlertConfig = {
        severity: 'p3',
        title: 'P3 Alert',
        message: 'Info message',
      };

      const result = await sendAlert(config);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Slack succeeds
        .mockRejectedValueOnce(new Error('Email failed')); // Email fails

      const config: AlertConfig = {
        severity: 'p0',
        title: 'Test Alert',
        message: 'Test message',
      };

      const result = await sendAlert(config);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(false);
    });
  });

  describe('Alert helper functions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({ ok: true });
    });

    it('should send service down alert', async () => {
      const result = await alerts.serviceDown('API Server', 'Connection refused');

      expect(result.slack).toBe(true);
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].title).toContain('Service Down');
      expect(body.attachments[0].title).toContain('API Server');
    });

    it('should send error rate spike alert', async () => {
      const result = await alerts.errorRateSpike(15.5, 2.0);

      expect(result.slack).toBe(true);
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].title).toContain('Error Rate Spike');
    });

    it('should send performance degradation alert', async () => {
      const result = await alerts.performanceDegradation('API Response Time', 1500, 500);

      expect(result.slack).toBe(true);
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].title).toContain('Performance Degradation');
    });

    it('should send SSL expiring alert with correct severity', async () => {
      // Test with 5 days left (P1)
      const result1 = await alerts.sslExpiring('example.com', 5);
      expect(result1.slack).toBe(true);

      // Test with 20 days left (P2)
      const result2 = await alerts.sslExpiring('example.com', 20);
      expect(result2.slack).toBe(true);
    });

    it('should send new error alert', async () => {
      const result = await alerts.newError('Uncaught TypeError: undefined is not a function', 'TypeError');

      expect(result.slack).toBe(true);
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].title).toContain('New Error Type');
    });
  });

  describe('Severity colors and labels', () => {
    it('should use correct colors for each severity level', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const severities: AlertSeverity[] = ['p0', 'p1', 'p2', 'p3'];
      const expectedColors = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00'];

      for (let i = 0; i < severities.length; i++) {
        mockFetch.mockClear();
        await sendSlackAlert({ severity: severities[i], title: 'Test', message: 'Test' });
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.attachments[0].color).toBe(expectedColors[i]);
      }
    });

    it('should include correct severity labels', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const tests: { severity: AlertSeverity; label: string }[] = [
        { severity: 'p0', label: 'CRITICAL' },
        { severity: 'p1', label: 'HIGH' },
        { severity: 'p2', label: 'WARNING' },
        { severity: 'p3', label: 'INFO' },
      ];

      for (const test of tests) {
        mockFetch.mockClear();
        await sendSlackAlert({ severity: test.severity, title: 'Test', message: 'Test' });
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.attachments[0].title).toContain(test.label);
      }
    });
  });
});