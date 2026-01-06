/**
 * React Error Boundary Component
 * Catches errors in the component tree and displays fallback UI
 * Integrates with ErrorHandler for logging and analytics
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to ErrorHandler
    ErrorHandler.handleError({
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.HIGH,
      message: `React Error Boundary caught error: ${error.message}`,
      originalError: error,
      context: ErrorHandler['createContext']('componentDidCatch', 'ErrorBoundary', {
        componentStack: errorInfo.componentStack
      }),
      recoverable: true,
      suggestions: [
        'Refresh the page to restart the application',
        'Clear browser cache and reload',
        'Try a different browser if the issue persists'
      ]
    });

    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    console.error('React Error Boundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
          <div className="glassmorphic-card max-w-2xl w-full p-8">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-shrink-0">
                <AlertCircle className="w-16 h-16 text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Something went wrong
                </h1>
                <p className="text-white/70">
                  An unexpected error occurred in the application
                </p>
              </div>
            </div>

            {/* Error Message */}
            {this.state.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <h3 className="text-red-300 font-semibold mb-2">Error Details:</h3>
                <p className="text-white/90 font-mono text-sm break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={this.handleReset}
                className="glassmorphic-button flex-1 py-3 px-4 flex items-center justify-center space-x-2
                         bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/50 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Try Again</span>
              </button>

              <button
                onClick={this.handleReload}
                className="glassmorphic-button flex-1 py-3 px-4 flex items-center justify-center space-x-2
                         bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/50 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Reload Page</span>
              </button>
            </div>

            {/* Technical Details (Collapsible) */}
            {this.state.errorInfo && (
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={this.toggleDetails}
                  className="w-full flex items-center justify-between text-white/60 hover:text-white/90
                           transition-colors mb-2"
                >
                  <span className="text-sm font-medium">Technical Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="bg-black/20 rounded-lg p-4 overflow-auto max-h-96">
                    <div className="mb-4">
                      <h4 className="text-white/60 text-xs font-medium mb-2">Stack Trace:</h4>
                      <pre className="text-white/70 text-xs font-mono whitespace-pre-wrap break-words">
                        {this.state.error?.stack}
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white/60 text-xs font-medium mb-2">Component Stack:</h4>
                      <pre className="text-white/70 text-xs font-mono whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 text-center text-white/50 text-sm">
              <p>If the problem persists, please:</p>
              <ul className="mt-2 space-y-1">
                <li>• Clear your browser cache</li>
                <li>• Try a different browser</li>
                <li>• Check the browser console for more details</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
}
