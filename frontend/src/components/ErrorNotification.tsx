/**
 * Error Notification System
 * Displays toast-style notifications for errors
 * Integrates with ErrorHandler to show user-friendly error messages
 */

import { useEffect, useState, useCallback } from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { ErrorHandler, ErrorSeverity, type AppError } from '../utils/ErrorHandler';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  suggestions?: string[];
  dismissible?: boolean;
  autoHideDuration?: number;
  timestamp: Date;
}

export function ErrorNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Subscribe to ErrorHandler
  useEffect(() => {
    const unsubscribe = ErrorHandler.onError((error: AppError) => {
      // Convert AppError to Notification
      const notification: Notification = {
        id: error.id,
        type: severityToType(error.severity),
        title: error.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        message: error.message,
        suggestions: error.suggestions,
        dismissible: true,
        autoHideDuration: error.severity === ErrorSeverity.LOW ? 5000 : 10000,
        timestamp: error.context.timestamp
      };

      addNotification(notification);
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [...prev, notification]);

    // Auto-hide if configured
    if (notification.autoHideDuration) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.autoHideDuration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const Icon = getIcon(notification.type);
  const colors = getColors(notification.type);

  return (
    <div
      className={`glassmorphic-card p-4 shadow-lg animate-slide-in-right ${colors.bg} border ${colors.border}`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${colors.title} mb-1`}>
            {notification.title}
          </h4>
          <p className="text-sm text-white/80 mb-2">
            {notification.message}
          </p>

          {/* Suggestions */}
          {notification.suggestions && notification.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-white/60 font-medium">Suggestions:</p>
              <ul className="text-xs text-white/70 space-y-0.5">
                {notification.suggestions.map((suggestion, idx) => (
                  <li key={idx}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {notification.dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Helper functions
function severityToType(severity: ErrorSeverity): NotificationType {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'info';
  }
}

function getIcon(type: NotificationType) {
  switch (type) {
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle;
    case 'info':
    default:
      return Info;
  }
}

function getColors(type: NotificationType) {
  switch (type) {
    case 'error':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-400/30',
        icon: 'text-red-400',
        title: 'text-red-300'
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-400/30',
        icon: 'text-yellow-400',
        title: 'text-yellow-300'
      };
    case 'success':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-400/30',
        icon: 'text-green-400',
        title: 'text-green-300'
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-400/30',
        icon: 'text-blue-400',
        title: 'text-blue-300'
      };
  }
}
