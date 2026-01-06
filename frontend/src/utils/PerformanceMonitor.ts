export interface PerformanceMetric {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  tags?: string[];
  category: PerformanceCategory;
}

export enum PerformanceCategory {
  INITIALIZATION = 'initialization',
  AUDIO_PROCESSING = 'audio_processing',
  ANALYSIS = 'analysis',
  VISUALIZATION = 'visualization',
  FILE_OPERATIONS = 'file_operations',
  USER_INTERACTION = 'user_interaction',
  NETWORK = 'network',
  MEMORY = 'memory',
  RENDERING = 'rendering'
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  metric: string;
  threshold: number;
  actualValue: number;
  severity: 'warning' | 'critical';
  suggestion: string;
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
    alerts: PerformanceAlert[];
  };
  byCategory: Record<PerformanceCategory, {
    count: number;
    averageDuration: number;
    totalDuration: number;
    metrics: PerformanceMetric[];
  }>;
  memoryUsage: {
    current: number;
    peak: number;
    samples: Array<{ timestamp: number; usage: number }>;
  };
  timeToInteractive?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

class PerformanceMonitorClass {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private memorysamples: Array<{ timestamp: number; usage: number }> = [];
  private thresholds: Record<string, number> = {
    'file.upload': 2000,
    'audio.decode': 5000,
    'analysis.total': 30000,
    'analysis.spectral': 3000,
    'analysis.tempo': 5000,
    'analysis.key': 4000,
    'analysis.mfcc': 2000,
    'visualization.render': 500,
    'export.generate': 3000,
    'ui.response': 100
  };
  private maxMetrics = 1000;
  private memoryMonitorInterval: number | null = null;

  constructor() {
    this.startMemoryMonitoring();
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver(): void {
    try {
      // Observe paint timing
      if ('PerformanceObserver' in window) {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordSystemMetric(entry.name, entry.startTime, {
              entryType: entry.entryType,
              duration: entry.duration
            });
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // Observe largest contentful paint
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordSystemMetric('largest-contentful-paint', entry.startTime, {
              size: (entry as any).size,
              element: (entry as any).element?.tagName
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Observe layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordSystemMetric('cumulative-layout-shift', performance.now(), {
              value: (entry as any).value,
              hadRecentInput: (entry as any).hadRecentInput
            });
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      }
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = window.setInterval(() => {
      const memoryUsage = this.getCurrentMemoryUsage();
      if (memoryUsage > 0) {
        this.memorysamples.push({
          timestamp: Date.now(),
          usage: memoryUsage
        });

        // Keep only last 100 samples (about 100 seconds)
        if (this.memorysamples.length > 100) {
          this.memorysamples = this.memorysamples.slice(-100);
        }

        // Check for memory alerts
        this.checkMemoryAlerts(memoryUsage);
      }
    }, 1000);
  }

  private getCurrentMemoryUsage(): number {
    // @ts-expect-error - performance.memory might not be available
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private checkMemoryAlerts(currentUsage: number): void {
    const memoryLimit = 50 * 1024 * 1024; // 50MB threshold
    const criticalLimit = 100 * 1024 * 1024; // 100MB critical threshold

    if (currentUsage > criticalLimit) {
      this.createAlert('memory-usage', criticalLimit, currentUsage, 'critical', 
        'Critical memory usage detected. Consider refreshing the page or using smaller files.');
    } else if (currentUsage > memoryLimit) {
      this.createAlert('memory-usage', memoryLimit, currentUsage, 'warning',
        'High memory usage detected. Close other tabs or use smaller files for better performance.');
    }
  }

  private createAlert(
    metric: string, 
    threshold: number, 
    actualValue: number, 
    severity: 'warning' | 'critical',
    suggestion: string
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      metric,
      threshold,
      actualValue,
      severity,
      suggestion
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  private recordSystemMetric(name: string, startTime: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      startTime,
      endTime: performance.now(),
      duration: performance.now() - startTime,
      metadata,
      tags: ['system'],
      category: PerformanceCategory.RENDERING
    };

    this.metrics.push(metric);
    this.trimMetrics();
  }

  public startTiming(
    name: string, 
    category: PerformanceCategory, 
    metadata?: Record<string, any>,
    tags?: string[]
  ): string {
    const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      id,
      name,
      startTime: performance.now(),
      metadata,
      tags: tags || [],
      category
    };

    this.metrics.push(metric);
    this.trimMetrics();

    return id;
  }

  public endTiming(id: string, additionalMetadata?: Record<string, any>): PerformanceMetric | null {
    const metric = this.metrics.find(m => m.id === id);
    if (!metric) {
      console.warn(`Performance metric with id ${id} not found`);
      return null;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(metric);

    return metric;
  }

  private checkPerformanceAlerts(metric: PerformanceMetric): void {
    if (!metric.duration) return;

    const threshold = this.thresholds[metric.name];
    if (threshold && metric.duration > threshold) {
      const severity = metric.duration > threshold * 2 ? 'critical' : 'warning';
      const suggestion = this.getPerformanceSuggestion(metric.name, metric.duration);
      
      this.createAlert(metric.name, threshold, metric.duration, severity, suggestion);
    }
  }

  private getPerformanceSuggestion(metricName: string, duration: number): string {
    const suggestions: Record<string, string> = {
      'file.upload': 'Try using smaller audio files or check your internet connection.',
      'audio.decode': 'The audio file may be large or in a complex format. Try using WAV or MP3.',
      'analysis.total': 'Consider using shorter audio clips or try on a device with more processing power.',
      'analysis.spectral': 'Spectral analysis is taking longer than expected. Try reducing analysis complexity.',
      'analysis.tempo': 'Tempo detection is slow. This may be due to complex rhythm patterns.',
      'analysis.key': 'Key detection is taking longer than expected. Try with harmonic audio content.',
      'analysis.mfcc': 'MFCC extraction is slow. This may be due to high sample rate audio.',
      'visualization.render': 'Visualization rendering is slow. Try reducing the visualization complexity.',
      'export.generate': 'Export is taking longer than expected. Try exporting smaller datasets.',
      'ui.response': 'UI responsiveness is degraded. Close other applications and browser tabs.'
    };

    return suggestions[metricName] || 'Performance is slower than expected. Try refreshing the page or using a more powerful device.';
  }

  public recordInstantMetric(
    name: string,
    value: number,
    category: PerformanceCategory,
    metadata?: Record<string, any>,
    tags?: string[]
  ): void {
    const metric: PerformanceMetric = {
      id: `instant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: value,
      metadata,
      tags: tags || [],
      category
    };

    this.metrics.push(metric);
    this.trimMetrics();
  }

  public timeFunction<T>(
    fn: () => T | Promise<T>,
    name: string,
    category: PerformanceCategory,
    metadata?: Record<string, any>
  ): T | Promise<T> {
    const id = this.startTiming(name, category, metadata);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.endTiming(id);
        });
      } else {
        this.endTiming(id);
        return result;
      }
    } catch (error) {
      this.endTiming(id, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricsByCategory(category: PerformanceCategory): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  public getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  public getAverageByName(name: string): number {
    const metrics = this.getMetricsByName(name).filter(m => m.duration !== undefined);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0);
    return total / metrics.length;
  }

  public getReport(): PerformanceReport {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    const summary = {
      totalMetrics: completedMetrics.length,
      averageDuration: completedMetrics.length > 0 
        ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length 
        : 0,
      slowestOperation: completedMetrics.reduce((slowest, metric) => 
        !slowest || (metric.duration || 0) > (slowest.duration || 0) ? metric : slowest, null as PerformanceMetric | null),
      fastestOperation: completedMetrics.reduce((fastest, metric) => 
        !fastest || (metric.duration || 0) < (fastest.duration || 0) ? metric : fastest, null as PerformanceMetric | null),
      alerts: [...this.alerts]
    };

    const byCategory = Object.values(PerformanceCategory).reduce((acc, category) => {
      const categoryMetrics = this.getMetricsByCategory(category).filter(m => m.duration !== undefined);
      const totalDuration = categoryMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
      
      acc[category] = {
        count: categoryMetrics.length,
        averageDuration: categoryMetrics.length > 0 ? totalDuration / categoryMetrics.length : 0,
        totalDuration,
        metrics: categoryMetrics
      };
      
      return acc;
    }, {} as Record<PerformanceCategory, any>);

    const memoryUsage = {
      current: this.getCurrentMemoryUsage(),
      peak: Math.max(...this.memorysamples.map(s => s.usage), 0),
      samples: [...this.memorysamples]
    };

    // Get Web Vitals if available
    const paintMetrics = this.getMetricsByName('first-contentful-paint');
    const lcpMetrics = this.getMetricsByName('largest-contentful-paint');

    return {
      summary,
      byCategory,
      memoryUsage,
      firstContentfulPaint: paintMetrics.length > 0 ? paintMetrics[0].startTime : undefined,
      largestContentfulPaint: lcpMetrics.length > 0 ? lcpMetrics[0].startTime : undefined
    };
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  public clearMetrics(): void {
    this.metrics = [];
    this.memorysamples = [];
  }

  public setThreshold(metricName: string, threshold: number): void {
    this.thresholds[metricName] = threshold;
  }

  public getThreshold(metricName: string): number | undefined {
    return this.thresholds[metricName];
  }

  public exportData(): string {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      memorysamples: this.memorysamples,
      thresholds: this.thresholds,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    return JSON.stringify(data, null, 2);
  }

  public destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    this.clearMetrics();
    this.clearAlerts();
  }
}

// Singleton instance
export const PerformanceMonitor = new PerformanceMonitorClass();

// Convenience functions
export const startTiming = (name: string, category: PerformanceCategory, metadata?: Record<string, any>) =>
  PerformanceMonitor.startTiming(name, category, metadata);

export const endTiming = (id: string, metadata?: Record<string, any>) =>
  PerformanceMonitor.endTiming(id, metadata);

export const timeFunction = <T>(fn: () => T | Promise<T>, name: string, category: PerformanceCategory, metadata?: Record<string, any>) =>
  PerformanceMonitor.timeFunction(fn, name, category, metadata);

export const recordInstantMetric = (name: string, value: number, category: PerformanceCategory, metadata?: Record<string, any>) =>
  PerformanceMonitor.recordInstantMetric(name, value, category, metadata);