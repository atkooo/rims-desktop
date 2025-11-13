import { ref, reactive } from "vue";

// Global notification state
const notification = reactive({
  visible: false,
  type: "info",
  title: "",
  message: "",
  duration: 3000,
  closable: true,
  showProgress: true,
});

/**
 * Show a notification
 * @param {Object} options - Notification options
 * @param {string} options.type - Notification type: 'success', 'error', 'warning', 'info'
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {number} options.duration - Duration in milliseconds (default: 3000)
 * @param {boolean} options.closable - Whether notification can be closed (default: true)
 * @param {boolean} options.showProgress - Whether to show progress bar (default: true)
 */
export function showNotification(options) {
  notification.type = options.type || "info";
  notification.title = options.title || "";
  notification.message = options.message || "";
  notification.duration = options.duration ?? 3000;
  notification.closable = options.closable ?? true;
  notification.showProgress = options.showProgress ?? true;
  notification.visible = true;
}

/**
 * Show success notification
 * @param {string} message - Success message
 * @param {string} title - Optional title (default: "Berhasil")
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showSuccess(message, title = "Berhasil", duration = 3000) {
  showNotification({
    type: "success",
    title,
    message,
    duration,
  });
}

/**
 * Show error notification
 * @param {string} message - Error message
 * @param {string} title - Optional title (default: "Gagal")
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showError(message, title = "Gagal", duration = 4000) {
  showNotification({
    type: "error",
    title,
    message,
    duration,
  });
}

/**
 * Show warning notification
 * @param {string} message - Warning message
 * @param {string} title - Optional title (default: "Peringatan")
 * @param {number} duration - Duration in milliseconds (default: 3500)
 */
export function showWarning(message, title = "Peringatan", duration = 3500) {
  showNotification({
    type: "warning",
    title,
    message,
    duration,
  });
}

/**
 * Show info notification
 * @param {string} message - Info message
 * @param {string} title - Optional title (default: "Informasi")
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showInfo(message, title = "Informasi", duration = 3000) {
  showNotification({
    type: "info",
    title,
    message,
    duration,
  });
}

/**
 * Hide notification
 */
export function hideNotification() {
  notification.visible = false;
}

/**
 * Composable for using notifications in components
 */
export function useNotification() {
  return {
    notification,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
  };
}


