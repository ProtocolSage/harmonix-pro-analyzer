import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export function NotificationProvider({ children, maxNotifications = 5 }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'error' ? 8000 : 5000)
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove non-persistent notifications
    if (!notification.persistent && newNotification.duration && newNotification.duration > 0) {
      const timeoutId = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, newNotification.duration);
    }

    return id;
  }, [maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const { removeNotification } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300);
  }, [notification.id, removeNotification]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          text: 'text-green-400',
          title: 'text-green-300'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          text: 'text-red-400',
          title: 'text-red-300'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          text: 'text-yellow-400',
          title: 'text-yellow-300'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          text: 'text-blue-400',
          title: 'text-blue-300'
        };
      default:
        return {
          bg: 'bg-gray-500/10 border-gray-500/30',
          text: 'text-gray-400',
          title: 'text-gray-300'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`
        glassmorphic-card border-2 p-4 shadow-lg transition-all duration-300 ease-out
        ${colors.bg}
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isRemoving ? 'scale-95' : 'scale-100'}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${colors.text}`}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm ${colors.title}`}>
            {notification.title}
          </h4>
          {notification.message && (
            <p className="text-white/70 text-sm mt-1 leading-relaxed">
              {notification.message}
            </p>
          )}
          
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className={`
                mt-2 text-xs font-medium px-3 py-1 rounded-md transition-colors
                ${colors.text} hover:bg-white/10
              `}
            >
              {notification.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-white/60 hover:text-white/80 transition-colors p-1 rounded-md hover:bg-white/10"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar for timed notifications */}
      {notification.duration && notification.duration > 0 && !notification.persistent && (
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.text.replace('text-', 'bg-')} transition-all ease-linear`}
            style={{
              animation: `notification-progress ${notification.duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
}

// Notification helper hooks for common use cases
export function useNotificationHelpers() {
  const { addNotification } = useNotifications();

  return {
    success: useCallback((title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({ ...options, type: 'success', title, message });
    }, [addNotification]),

    error: useCallback((title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({ ...options, type: 'error', title, message, duration: 8000 });
    }, [addNotification]),

    warning: useCallback((title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({ ...options, type: 'warning', title, message });
    }, [addNotification]),

    info: useCallback((title: string, message?: string, options?: Partial<Notification>) => {
      return addNotification({ ...options, type: 'info', title, message });
    }, [addNotification]),

    analysisComplete: useCallback((filename: string) => {
      return addNotification({
        type: 'success',
        title: 'Analysis Complete',
        message: `Successfully analyzed ${filename}`,
        duration: 5000
      });
    }, [addNotification]),

    analysisError: useCallback((filename: string, error: string) => {
      return addNotification({
        type: 'error',
        title: 'Analysis Failed',
        message: `Failed to analyze ${filename}: ${error}`,
        duration: 10000,
        action: {
          label: 'Try Again',
          onClick: () => window.location.reload()
        }
      });
    }, [addNotification]),

    fileUploaded: useCallback((filename: string) => {
      return addNotification({
        type: 'info',
        title: 'File Uploaded',
        message: `${filename} is ready for analysis`,
        duration: 3000
      });
    }, [addNotification]),

    engineReady: useCallback(() => {
      return addNotification({
        type: 'success',
        title: 'Engine Ready',
        message: 'Audio analysis engine is now ready for use',
        duration: 4000
      });
    }, [addNotification]),

    engineError: useCallback((error: string) => {
      return addNotification({
        type: 'error',
        title: 'Engine Error',
        message: `Analysis engine error: ${error}`,
        persistent: true,
        action: {
          label: 'Reload',
          onClick: () => window.location.reload()
        }
      });
    }, [addNotification])
  };
}