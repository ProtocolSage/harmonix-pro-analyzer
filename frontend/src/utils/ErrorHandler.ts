export enum ErrorType {
  INITIALIZATION = 'initialization',
  FILE_PROCESSING = 'file_processing',
  AUDIO_DECODING = 'audio_decoding',
  ANALYSIS = 'analysis',
  VISUALIZATION = 'visualization',
  EXPORT = 'export',
  NETWORK = 'network',
  PERMISSION = 'permission',
  COMPATIBILITY = 'compatibility',
  PERFORMANCE = 'performance',
  RUNTIME = 'runtime',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context: ErrorContext;
  stack?: string;
  recoverable: boolean;
  suggestions: string[];
  telemetryData?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  destructive?: boolean;
}

class ErrorHandlerClass {
  private errors: AppError[] = [];
  private errorCallbacks: ((error: AppError) => void)[] = [];
  private maxErrors = 100;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.message,
        originalError: event.error,
        context: this.createContext('window.error', 'global'),
        recoverable: false,
        suggestions: ['Refresh the page', 'Clear browser cache', 'Try a different browser']
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: `Unhandled promise rejection: ${event.reason}`,
        originalError: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: this.createContext('window.unhandledrejection', 'global'),
        recoverable: false,
        suggestions: ['Refresh the page', 'Check network connection', 'Try again later']
      });
    });

    // Catch resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        this.handleError({
          type: ErrorType.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          message: `Failed to load resource: ${(event.target as any).src || (event.target as any).href}`,
          context: this.createContext('resource.error', 'resource-loading'),
          recoverable: true,
          suggestions: ['Check network connection', 'Refresh the page', 'Try again later']
        });
      }
    }, true);
  }

  private createContext(action?: string, component?: string, metadata?: Record<string, any>): ErrorContext {
    return {
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      component,
      action,
      metadata: {
        ...metadata,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: this.getMemoryInfo(),
        connection: this.getConnectionInfo()
      }
    };
  }

  private getMemoryInfo(): Record<string, any> | null {
    // @ts-expect-error - performance.memory might not be available
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  private getConnectionInfo(): Record<string, any> | null {
    // @ts-expect-error - navigator.connection might not be available
    if (typeof navigator !== 'undefined' && navigator.connection) {
      // @ts-expect-error - navigator.connection is experimental and not in TypeScript lib
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }
    return null;
  }

  public handleError(errorData: Omit<AppError, 'id'>): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      ...errorData,
      stack: errorData.originalError?.stack,
      telemetryData: this.collectTelemetryData()
    };

    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Notify listeners
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    // Log to console in development
    if ((import.meta as any).env?.DEV) {
      console.error('App Error:', error);
    }

    // Send to analytics/monitoring service
    this.sendToAnalytics(error);

    return error;
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectTelemetryData(): Record<string, any> {
    return {
      timestamp: Date.now(),
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    };
  }

  private async sendToAnalytics(error: AppError): Promise<void> {
    // In a real implementation, send to your analytics service
    // For now, we'll just store it locally for debugging
    try {
      const analyticsData = {
        errorId: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        timestamp: error.context.timestamp.toISOString(),
        sessionId: error.context.sessionId,
        userAgent: error.context.userAgent,
        url: error.context.url,
        component: error.context.component,
        action: error.context.action,
        metadata: error.context.metadata,
        telemetry: error.telemetryData
      };

      // Store in localStorage for now (in production, send to your analytics service)
      const existingAnalytics = JSON.parse(localStorage.getItem('harmonix-analytics') || '[]');
      existingAnalytics.push(analyticsData);
      
      // Keep only last 50 entries
      if (existingAnalytics.length > 50) {
        existingAnalytics.splice(0, existingAnalytics.length - 50);
      }
      
      localStorage.setItem('harmonix-analytics', JSON.stringify(existingAnalytics));
    } catch (analyticsError) {
      console.error('Failed to send analytics:', analyticsError);
    }
  }

  public onError(callback: (error: AppError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  public getErrors(): AppError[] {
    return [...this.errors];
  }

  public getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter(error => error.type === type);
  }

  public getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const byType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = this.errors.filter(error => error.type === type).length;
      return acc;
    }, {} as Record<ErrorType, number>);

    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.errors.filter(error => error.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recent = this.errors.filter(error => 
      error.context.timestamp.getTime() > oneHourAgo
    ).length;

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      recent
    };
  }

  // Specific error handling methods
  public handleFileError(error: Error, filename: string, fileSize: number): AppError {
    return this.handleError({
      type: ErrorType.FILE_PROCESSING,
      severity: ErrorSeverity.MEDIUM,
      message: `Failed to process file: ${filename}`,
      originalError: error,
      context: this.createContext('file.process', 'FileUpload', { filename, fileSize }),
      recoverable: true,
      suggestions: [
        'Try a different audio file',
        'Check file format (MP3, WAV, FLAC supported)',
        'Ensure file is not corrupted',
        'Try a smaller file size'
      ]
    });
  }

  public handleAnalysisError(error: Error, stage: string, audioData?: any): AppError {
    return this.handleError({
      type: ErrorType.ANALYSIS,
      severity: ErrorSeverity.HIGH,
      message: `Analysis failed at stage: ${stage}`,
      originalError: error,
      context: this.createContext('analysis.failed', 'EssentiaEngine', { 
        stage, 
        audioLength: audioData?.length,
        audioSampleRate: audioData?.sampleRate 
      }),
      recoverable: true,
      suggestions: [
        'Try analyzing a different audio file',
        'Check if the audio file is valid',
        'Refresh the page and try again',
        'Use a shorter audio file for testing'
      ]
    });
  }

  public handleVisualizationError(error: Error, chartType: string): AppError {
    return this.handleError({
      type: ErrorType.VISUALIZATION,
      severity: ErrorSeverity.MEDIUM,
      message: `Failed to render ${chartType} visualization`,
      originalError: error,
      context: this.createContext('visualization.render', 'VisualizationEngine', { chartType }),
      recoverable: true,
      suggestions: [
        'Try switching to a different visualization',
        'Refresh the page',
        'Check browser compatibility',
        'Try a different browser'
      ]
    });
  }

  public handleExportError(error: Error, format: string, dataSize?: number): AppError {
    return this.handleError({
      type: ErrorType.EXPORT,
      severity: ErrorSeverity.MEDIUM,
      message: `Failed to export data as ${format}`,
      originalError: error,
      context: this.createContext('export.failed', 'ExportFunctionality', { format, dataSize }),
      recoverable: true,
      suggestions: [
        'Try a different export format',
        'Check available disk space',
        'Try exporting smaller data sets',
        'Refresh the page and try again'
      ]
    });
  }

  public handlePermissionError(permission: string, context: string): AppError {
    return this.handleError({
      type: ErrorType.PERMISSION,
      severity: ErrorSeverity.MEDIUM,
      message: `Permission denied: ${permission}`,
      context: this.createContext('permission.denied', context, { permission }),
      recoverable: true,
      suggestions: [
        'Allow the requested permission in browser settings',
        'Check if microphone/camera access is blocked',
        'Try using a different browser',
        'Check browser security settings'
      ]
    });
  }

  public handleCompatibilityError(feature: string, requirement: string): AppError {
    return this.handleError({
      type: ErrorType.COMPATIBILITY,
      severity: ErrorSeverity.HIGH,
      message: `Browser compatibility issue: ${feature} not supported`,
      context: this.createContext('compatibility.check', 'BrowserCheck', { feature, requirement }),
      recoverable: false,
      suggestions: [
        'Use a modern browser (Chrome, Firefox, Safari, Edge)',
        'Update your browser to the latest version',
        'Enable JavaScript in browser settings',
        'Try using a different device'
      ]
    });
  }

  public handlePerformanceError(operation: string, duration: number, threshold: number): AppError {
    return this.handleError({
      type: ErrorType.PERFORMANCE,
      severity: ErrorSeverity.MEDIUM,
      message: `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
      context: this.createContext('performance.slow', operation, { duration, threshold }),
      recoverable: true,
      suggestions: [
        'Try using a smaller audio file',
        'Close other browser tabs',
        'Refresh the page',
        'Try on a device with more memory'
      ]
    });
  }
}

// Singleton instance
export const ErrorHandler = new ErrorHandlerClass();

// Convenience functions
export const handleError = (errorData: Omit<AppError, 'id'>) => ErrorHandler.handleError(errorData);
export const handleFileError = (error: Error, filename: string, fileSize: number) => 
  ErrorHandler.handleFileError(error, filename, fileSize);
export const handleAnalysisError = (error: Error, stage: string, audioData?: any) => 
  ErrorHandler.handleAnalysisError(error, stage, audioData);
export const handleVisualizationError = (error: Error, chartType: string) => 
  ErrorHandler.handleVisualizationError(error, chartType);
export const handleExportError = (error: Error, format: string, dataSize?: number) => 
  ErrorHandler.handleExportError(error, format, dataSize);
export const handlePermissionError = (permission: string, context: string) => 
  ErrorHandler.handlePermissionError(permission, context);
export const handleCompatibilityError = (feature: string, requirement: string) => 
  ErrorHandler.handleCompatibilityError(feature, requirement);
export const handlePerformanceError = (operation: string, duration: number, threshold: number) => 
  ErrorHandler.handlePerformanceError(operation, duration, threshold);