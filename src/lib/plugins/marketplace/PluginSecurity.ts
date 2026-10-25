/**
 * Plugin Security
 * Plugin security scanning and verification
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PluginSecurityScan } from '../types';

export interface SecurityScanResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  score: number;
}

export interface SignatureVerification {
  valid: boolean;
  error?: string;
}

export class PluginSecurity {
  private knownVulnerabilities: Map<string, string[]> = new Map();

  constructor() {
    this.initializeVulnerabilities();
  }

  /**
   * Initialize known vulnerabilities database
   */
  private initializeVulnerabilities(): void {
    // Common vulnerable packages
    this.knownVulnerabilities.set('event-stream', ['3.3.6']);
    this.knownVulnerabilities.set('flatmap-stream', ['0.1.1']);
    this.knownVulnerabilities.set('lodash', ['<4.17.21']);
    this.knownVulnerabilities.set('handlebars', ['<4.7.7']);
    this.knownVulnerabilities.set('yargs-parser', ['<13.1.2', '<15.0.1', '<18.1.2']);
  }

  /**
   * Scan plugin for security issues
   */
  async scan(pluginPath: string): Promise<SecurityScanResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Scan package.json for vulnerable dependencies
    const packagePath = path.join(pluginPath, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const depIssues = this.scanDependencies(packageJson);
      issues.push(...depIssues.issues);
      warnings.push(...depIssues.warnings);
      score -= depIssues.issues.length * 20;
      score -= depIssues.warnings.length * 5;
    }

    // Scan code for security issues
    const codeIssues = await this.scanCode(pluginPath);
    issues.push(...codeIssues.issues);
    warnings.push(...codeIssues.warnings);
    score -= codeIssues.issues.length * 15;
    score -= codeIssues.warnings.length * 3;

    // Scan for sensitive data exposure
    const sensitiveIssues = await this.scanSensitiveData(pluginPath);
    issues.push(...sensitiveIssues.issues);
    warnings.push(...sensitiveIssues.warnings);
    score -= sensitiveIssues.issues.length * 25;
    score -= sensitiveIssues.warnings.length * 5;

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      passed: issues.length === 0 && score >= 60,
      issues,
      warnings,
      score,
    };
  }

  /**
   * Scan dependencies for known vulnerabilities
   */
  private scanDependencies(packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      const vulnVersions = this.knownVulnerabilities.get(name);
      if (vulnVersions) {
        for (const vulnVersion of vulnVersions) {
          if (this.isVulnerableVersion(version as string, vulnVersion)) {
            issues.push(`Vulnerable dependency: ${name}@${version} (${vulnVersion})`);
          }
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Check if version is vulnerable
   */
  private isVulnerableVersion(version: string, vulnRange: string): boolean {
    // Simple version comparison
    // In production, use semver library
    if (vulnRange.startsWith('<')) {
      return true; // Simplified check
    }

    if (vulnRange.startsWith('>')) {
      return false; // Simplified check
    }

    return version === vulnRange;
  }

  /**
   * Scan code for security issues
   */
  private async scanCode(pluginPath: string): Promise<{ issues: string[]; warnings: string[] }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Find all JS/TS files
    const files = this.findCodeFiles(pluginPath);

    for (const file of files) {
      const code = fs.readFileSync(file, 'utf-8');

      // Check for dangerous patterns
      const patterns = [
        { pattern: /eval\s*\(/, issue: 'Use of eval() is a security risk' },
        { pattern: /Function\s*\(/, issue: 'Dynamic Function creation is a security risk' },
        { pattern: /new\s+Function\s*\(/, issue: 'Dynamic Function creation is a security risk' },
        { pattern: /vm\.runInNewContext/, issue: 'VM context execution requires review' },
        { pattern: /child_process/, issue: 'Child process usage requires review' },
        { pattern: /exec\s*\(/, issue: 'Command execution requires review' },
        { pattern: /spawn\s*\(/, issue: 'Process spawning requires review' },
        { pattern: /__proto__/, issue: 'Prototype manipulation is a security risk' },
        { pattern: /process\.env/, warning: 'Environment variable access detected' },
        { pattern: /fs\.(read|write|delete)/, warning: 'File system access detected' },
      ];

      for (const { pattern, issue, warning } of patterns) {
        if (pattern.test(code)) {
          if (issue) {
            issues.push(`${file}: ${issue}`);
          } else if (warning) {
            warnings.push(`${file}: ${warning}`);
          }
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Scan for sensitive data exposure
   */
  private async scanSensitiveData(pluginPath: string): Promise<{ issues: string[]; warnings: string[] }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    const files = this.findCodeFiles(pluginPath);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for hardcoded secrets
      const secretPatterns = [
        { pattern: /password\s*[=:]\s*['"][^'"]+['"]/i, issue: 'Hardcoded password detected' },
        { pattern: /api[_-]?key\s*[=:]\s*['"][^'"]+['"]/i, issue: 'Hardcoded API key detected' },
        { pattern: /secret[_-]?key\s*[=:]\s*['"][^'"]+['"]/i, issue: 'Hardcoded secret key detected' },
        { pattern: /private[_-]?key\s*[=:]\s*['"][^'"]+['"]/i, issue: 'Hardcoded private key detected' },
        { pattern: /token\s*[=:]\s*['"][^'"]+['"]/i, warning: 'Potential hardcoded token detected' },
        { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, issue: 'Private key detected' },
      ];

      for (const { pattern, issue, warning } of secretPatterns) {
        if (pattern.test(content)) {
          if (issue) {
            issues.push(`${file}: ${issue}`);
          } else if (warning) {
            warnings.push(`${file}: ${warning}`);
          }
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Find all code files in plugin directory
   */
  private findCodeFiles(dir: string): string[] {
    const files: string[] = [];

    const scanDir = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Include JS and TS files
          if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDir(dir);
    return files;
  }

  /**
   * Verify plugin signature
   */
  verifySignature(
    pluginPath: string,
    signature: string,
    publicKey: string
  ): SignatureVerification {
    try {
      // Read plugin archive
      const archivePath = path.join(pluginPath, 'plugin.tar.gz');
      if (!fs.existsSync(archivePath)) {
        return { valid: false, error: 'Plugin archive not found' };
      }

      const archiveData = fs.readFileSync(archivePath);

      // Verify signature
      const verify = crypto.createVerify('SHA256');
      verify.update(archiveData);
      verify.end();

      const valid = verify.verify(publicKey, signature, 'hex');

      return { valid };
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Sign plugin
   */
  signPlugin(pluginPath: string, privateKey: string): string {
    const archivePath = path.join(pluginPath, 'plugin.tar.gz');
    const archiveData = fs.readFileSync(archivePath);

    const sign = crypto.createSign('SHA256');
    sign.update(archiveData);
    sign.end();

    return sign.sign(privateKey, 'hex');
  }

  /**
   * Generate key pair for signing
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(pluginPath: string): Promise<PluginSecurityScan> {
    const result = await this.scan(pluginPath);

    const status = result.passed
      ? 'passed'
      : result.score >= 40
        ? 'warning'
        : 'failed';

    const issues = [
      ...result.issues.map((msg) => ({ severity: 'high' as const, message: msg })),
      ...result.warnings.map((msg) => ({ severity: 'medium' as const, message: msg })),
    ];

    return {
      status,
      issues,
      scannedAt: new Date(),
    };
  }

  /**
   * Check plugin permissions
   */
  checkPermissions(
    pluginPath: string,
    requiredPermissions: string[]
  ): { allowed: boolean; missing: string[] } {
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      return { allowed: false, missing: requiredPermissions };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const pluginPermissions = manifest.permissions || [];

    const missing = requiredPermissions.filter(
      (p) => !pluginPermissions.includes(p)
    );

    return {
      allowed: missing.length === 0,
      missing,
    };
  }
}