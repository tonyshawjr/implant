/**
 * Notifications Store
 * Manages toast notifications and alerts across the application
 */

import { writable, derived, type Readable } from 'svelte/store';

/**
 * Notification types for styling
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification position on screen
 */
export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

/**
 * Single notification structure
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 for persistent
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: Date;
}

/**
 * Notification store state
 */
interface NotificationState {
  notifications: Notification[];
  position: NotificationPosition;
  maxVisible: number;
}

/**
 * Default notification duration in milliseconds
 */
const DEFAULT_DURATION = 5000;

/**
 * Maximum number of visible notifications
 */
const MAX_VISIBLE = 5;

/**
 * Generate a unique notification ID
 */
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initial state
 */
const initialState: NotificationState = {
  notifications: [],
  position: 'top-right',
  maxVisible: MAX_VISIBLE
};

/**
 * Create the notifications store
 */
function createNotificationsStore() {
  const { subscribe, set, update } = writable<NotificationState>(initialState);

  /**
   * Internal function to add a notification
   */
  function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): string {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      dismissible: notification.dismissible ?? true,
      duration: notification.duration ?? DEFAULT_DURATION
    };

    update((state) => ({
      ...state,
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-dismiss after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }

  /**
   * Remove a notification by ID
   */
  function removeNotification(id: string): void {
    update((state) => ({
      ...state,
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  }

  return {
    subscribe,

    /**
     * Show a success notification
     */
    success: (title: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'title' | 'createdAt'>>): string => {
      return addNotification({ type: 'success', title, ...options });
    },

    /**
     * Show an error notification
     */
    error: (title: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'title' | 'createdAt'>>): string => {
      return addNotification({
        type: 'error',
        title,
        duration: 0, // Errors persist by default
        ...options
      });
    },

    /**
     * Show a warning notification
     */
    warning: (title: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'title' | 'createdAt'>>): string => {
      return addNotification({ type: 'warning', title, ...options });
    },

    /**
     * Show an info notification
     */
    info: (title: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'title' | 'createdAt'>>): string => {
      return addNotification({ type: 'info', title, ...options });
    },

    /**
     * Add a custom notification
     */
    add: addNotification,

    /**
     * Remove a notification by ID
     */
    remove: removeNotification,

    /**
     * Dismiss a notification (alias for remove)
     */
    dismiss: removeNotification,

    /**
     * Clear all notifications
     */
    clear: (): void => {
      update((state) => ({
        ...state,
        notifications: []
      }));
    },

    /**
     * Clear all notifications of a specific type
     */
    clearType: (type: NotificationType): void => {
      update((state) => ({
        ...state,
        notifications: state.notifications.filter((n) => n.type !== type)
      }));
    },

    /**
     * Set notification position
     */
    setPosition: (position: NotificationPosition): void => {
      update((state) => ({
        ...state,
        position
      }));
    },

    /**
     * Set maximum visible notifications
     */
    setMaxVisible: (max: number): void => {
      update((state) => ({
        ...state,
        maxVisible: max
      }));
    },

    /**
     * Reset to initial state
     */
    reset: (): void => {
      set(initialState);
    }
  };
}

/**
 * The notifications store instance
 */
export const notifications = createNotificationsStore();

/**
 * Derived store for all notifications
 */
export const allNotifications: Readable<Notification[]> = derived(
  notifications,
  ($store) => $store.notifications
);

/**
 * Derived store for visible notifications (limited by maxVisible)
 */
export const visibleNotifications: Readable<Notification[]> = derived(
  notifications,
  ($store) => $store.notifications.slice(-$store.maxVisible)
);

/**
 * Derived store for notification count
 */
export const notificationCount: Readable<number> = derived(
  notifications,
  ($store) => $store.notifications.length
);

/**
 * Derived store for position
 */
export const notificationPosition: Readable<NotificationPosition> = derived(
  notifications,
  ($store) => $store.position
);

/**
 * Check if there are any notifications
 */
export const hasNotifications: Readable<boolean> = derived(
  notifications,
  ($store) => $store.notifications.length > 0
);

/**
 * Check if there are any error notifications
 */
export const hasErrors: Readable<boolean> = derived(
  notifications,
  ($store) => $store.notifications.some((n) => n.type === 'error')
);

/**
 * Get CSS classes for notification type (Tailwind + Flowbite compatible)
 */
export function getNotificationClasses(type: NotificationType): {
  container: string;
  icon: string;
  text: string;
  button: string;
} {
  const classes: Record<NotificationType, { container: string; icon: string; text: string; button: string }> = {
    success: {
      container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      icon: 'text-green-500 dark:text-green-400',
      text: 'text-green-800 dark:text-green-300',
      button: 'text-green-500 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-800/30'
    },
    error: {
      container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: 'text-red-500 dark:text-red-400',
      text: 'text-red-800 dark:text-red-300',
      button: 'text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800/30'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      icon: 'text-yellow-500 dark:text-yellow-400',
      text: 'text-yellow-800 dark:text-yellow-300',
      button: 'text-yellow-500 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-800/30'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      icon: 'text-blue-500 dark:text-blue-400',
      text: 'text-blue-800 dark:text-blue-300',
      button: 'text-blue-500 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800/30'
    }
  };

  return classes[type];
}

/**
 * Get position CSS classes for the notification container
 */
export function getPositionClasses(position: NotificationPosition): string {
  const positionClasses: Record<NotificationPosition, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  return positionClasses[position];
}

/**
 * Helper function to show a toast (convenience wrapper)
 */
export function toast(
  title: string,
  type: NotificationType = 'info',
  options?: Partial<Omit<Notification, 'id' | 'type' | 'title' | 'createdAt'>>
): string {
  switch (type) {
    case 'success':
      return notifications.success(title, options);
    case 'error':
      return notifications.error(title, options);
    case 'warning':
      return notifications.warning(title, options);
    case 'info':
    default:
      return notifications.info(title, options);
  }
}

/**
 * Show a promise-based notification (shows loading, then success/error)
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> {
  const loadingId = notifications.info(messages.loading, {
    duration: 0,
    dismissible: false
  });

  try {
    const result = await promise;
    notifications.remove(loadingId);
    const successMessage = typeof messages.success === 'function'
      ? messages.success(result)
      : messages.success;
    notifications.success(successMessage);
    return result;
  } catch (error) {
    notifications.remove(loadingId);
    const errorMessage = typeof messages.error === 'function'
      ? messages.error(error as Error)
      : messages.error;
    notifications.error(errorMessage);
    throw error;
  }
}
