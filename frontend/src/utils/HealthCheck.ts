import { ErrorHandler } from './ErrorHandler';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-100
  checks: HealthCheckResult[];
  recommendations: string[];
}

class HealthCheckService {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private lastCheck: SystemHealth | null = null;
  private autoCheckInterval: number | null = null;

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    // Browser compatibility checks
    this.checks.set('browser-support', async () => {
      const issues: string[] = [];
      const details: Record<string, any> = {};

      // Check essential APIs
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        issues.push('Web Audio API not supported');
      }

      if (!window.Worker) {
        issues.push('Web Workers not supported');
      }

      if (!window.OffscreenCanvas) {
        details.offscreenCanvas = false;
      }

      if (!('createImageBitmap' in window)) {
        details.imageBitmap = false;
      }

      // Check WASM support
      if (!window.WebAssembly) {
        issues.push('WebAssembly not supported');
      }

      return {
        component: 'browser-support',
        status: issues.length === 0 ? 'healthy' : 'error',
        message: issues.length === 0 
          ? 'Browser fully compatible'
          : `Compatibility issues: ${issues.join(', ')}`,
        details,
        timestamp: new Date()
      };
    });

    // Memory check
    this.checks.set('memory', async () => {
      // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
      const memory = performance.memory;
      const details: Record<string, any> = {};

      if (memory) {
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        const usage = usedMB / limitMB;

        details.usedMB = Math.round(usedMB);
        details.limitMB = Math.round(limitMB);
        details.usagePercent = Math.round(usage * 100);

        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        let message = `Memory usage: ${details.usedMB}MB (${details.usagePercent}%)`;

        if (usage > 0.8) {
          status = 'error';
          message = `High memory usage: ${details.usagePercent}%`;
        } else if (usage > 0.6) {
          status = 'warning';
          message = `Moderate memory usage: ${details.usagePercent}%`;
        }

        return {
          component: 'memory',
          status,
          message,
          details,
          timestamp: new Date()
        };
      }

      return {
        component: 'memory',
        status: 'warning',
        message: 'Memory information not available',
        details,
        timestamp: new Date()
      };
    });

    // Performance check
    this.checks.set('performance', async () => {
      const metrics = PerformanceMonitor.getReport();
      const details: Record<string, any> = {
        totalMetrics: metrics.summary.totalMetrics,
        averageDuration: Math.round(metrics.summary.averageDuration),
        memoryPeak: Math.round(metrics.memoryUsage.peak / (1024 * 1024))
      };

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Performance metrics normal';

      if (metrics.summary.alerts.length > 0) {
        const criticalAlerts = metrics.summary.alerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
          status = 'error';
          message = `${criticalAlerts.length} critical performance issues`;
        } else {
          status = 'warning';
          message = `${metrics.summary.alerts.length} performance warnings`;
        }
        details.alerts = metrics.summary.alerts.length;
      }

      return {
        component: 'performance',
        status,
        message,
        details,
        timestamp: new Date()
      };
    });

    // Error rate check
    this.checks.set('error-rate', async () => {
      const errorStats = ErrorHandler.getErrorStats();
      const details: Record<string, any> = {
        totalErrors: errorStats.total,
        recentErrors: errorStats.recent,
        criticalErrors: errorStats.bySeverity.critical
      };

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Error rate normal';

      if (errorStats.bySeverity.critical > 0) {
        status = 'error';
        message = `${errorStats.bySeverity.critical} critical errors detected`;
      } else if (errorStats.recent > 5) {
        status = 'warning';
        message = `${errorStats.recent} recent errors (last hour)`;
      } else if (errorStats.total === 0) {
        message = 'No errors detected';
      } else {
        message = `${errorStats.total} total errors (${errorStats.recent} recent)`;
      }

      return {
        component: 'error-rate',
        status,
        message,
        details,
        timestamp: new Date()
      };
    });

    // Network connectivity check
    this.checks.set('network', async () => {
      const isOnline = navigator.onLine;
      // @ts-expect-error - navigator.connection is experimental and not in TypeScript lib
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const details: Record<string, any> = {
        online: isOnline
      };

      if (connection) {
        details.effectiveType = connection.effectiveType;
        details.downlink = connection.downlink;
        details.rtt = connection.rtt;
        details.saveData = connection.saveData;
      }

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Network connection stable';

      if (!isOnline) {
        status = 'error';
        message = 'No network connection';
      } else if (connection && connection.effectiveType === 'slow-2g') {
        status = 'warning';
        message = 'Slow network connection detected';
      }

      return {
        component: 'network',
        status,
        message,
        details,
        timestamp: new Date()
      };
    });

    // Audio system check
    this.checks.set('audio-system', async () => {
      const details: Record<string, any> = {};

      try {
        // Test audio context creation
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        details.sampleRate = audioContext.sampleRate;
        details.state = audioContext.state;
        details.maxChannelCount = audioContext.destination.maxChannelCount;
        
        await audioContext.close();

        return {
          component: 'audio-system',
          status: 'healthy' as const,
          message: `Audio system ready (${details.sampleRate}Hz, ${details.maxChannelCount}ch)`,
          details,
          timestamp: new Date()
        };
      } catch (error) {
        return {
          component: 'audio-system',
          status: 'error' as const,
          message: `Audio system unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details,
          timestamp: new Date()
        };
      }
    });
  }

  public async runHealthCheck(): Promise<SystemHealth> {
    const results: HealthCheckResult[] = [];
    
    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        return await checkFn();
      } catch (error) {
        return {
          component: name,
          status: 'error' as const,
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        };
      }
    });

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    // Calculate overall health
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    const score = Math.round((healthyCount / results.length) * 100);
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (errorCount > 0) {
      overall = errorCount > results.length / 2 ? 'critical' : 'degraded';
    } else if (warningCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    this.lastCheck = {
      overall,
      score,
      checks: results,
      recommendations
    };

    return this.lastCheck;
  }

  private generateRecommendations(results: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      if (result.status === 'error' || result.status === 'warning') {
        switch (result.component) {
          case 'memory':
            if (result.details?.usagePercent > 60) {
              recommendations.push('Close unnecessary browser tabs and applications to free memory');
            }
            break;
          case 'performance':
            if (result.details?.alerts > 0) {
              recommendations.push('Check performance alerts for optimization opportunities');
            }
            break;
          case 'error-rate':
            if (result.details?.criticalErrors > 0) {
              recommendations.push('Review critical errors and consider refreshing the application');
            }
            break;
          case 'network':
            if (result.status === 'warning') {
              recommendations.push('Network performance may affect audio file loading times');
            }
            break;
          case 'browser-support':
            recommendations.push('Update your browser or try a different browser for better compatibility');
            break;
          case 'audio-system':
            recommendations.push('Check audio permissions and ensure no other applications are using audio');
            break;
        }
      }
    });

    // General recommendations based on overall health
    if (this.lastCheck?.overall === 'degraded') {
      recommendations.push('Consider refreshing the page if performance continues to degrade');
    } else if (this.lastCheck?.overall === 'critical') {
      recommendations.push('Multiple system issues detected - restart the browser or try a different device');
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  public getLastHealthCheck(): SystemHealth | null {
    return this.lastCheck;
  }

  public startAutoCheck(intervalMs = 30000): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
    }

    this.autoCheckInterval = window.setInterval(() => {
      this.runHealthCheck().catch(error => {
        console.error('Auto health check failed:', error);
      });
    }, intervalMs);
  }

  public stopAutoCheck(): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
      this.autoCheckInterval = null;
    }
  }

  public registerCustomCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFn);
  }

  public removeCheck(name: string): boolean {
    return this.checks.delete(name);
  }

  public getHealthStatus(): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    return this.lastCheck?.overall || 'unknown';
  }

  public getHealthScore(): number {
    return this.lastCheck?.score || 0;
  }
}

export const HealthCheck = new HealthCheckService();