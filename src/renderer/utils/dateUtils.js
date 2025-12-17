const LOCALE = "id-ID";
const DEFAULT_TIMEZONE = "Asia/Jakarta";

// Dynamic timezone that can be changed
let currentTimezone = DEFAULT_TIMEZONE;

const createDate = (value) => {
  if (!value) return null;
  
  // Handle SQLite datetime strings (format: 'YYYY-MM-DD HH:MM:SS' without timezone)
  // SQLite CURRENT_TIMESTAMP stores UTC time, so we parse it as UTC by appending 'Z'
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    // SQLite datetime format - treat as UTC by appending 'Z'
    // This ensures correct timezone conversion when formatting
    const date = new Date(value.replace(" ", "T") + "Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }
  
  // Handle DATE format (YYYY-MM-DD) - parse as local time at midnight
  // DATE fields don't have time, so we use local midnight
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
  }
  
  // For ISO strings with timezone info, or other formats, use standard Date parsing
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const withTimezone = (options = {}) => ({
  timeZone: currentTimezone,
  ...options,
});

// Create formatter function that uses current timezone
const getEnCADateFormatter = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: currentTimezone,
});

export function toDateInput(value) {
  const date = createDate(value);
  if (!date) return "";
  return getEnCADateFormatter().format(date);
}

export function formatDate(value, options = {}) {
  const date = createDate(value);
  if (!date) return "-";
  const defaultOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return date.toLocaleDateString(LOCALE, withTimezone({ ...defaultOptions, ...options }));
}

export function formatDateShort(value) {
  const date = createDate(value);
  if (!date) return "-";
  return date.toLocaleDateString(LOCALE, withTimezone());
}

export function formatDateTime(value, options = {}) {
  const date = createDate(value);
  if (!date) return "-";
  const defaultOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleString(LOCALE, withTimezone({ ...defaultOptions, ...options }));
}

export function formatTime(value, options = {}) {
  const date = createDate(value);
  if (!date) return "-";
  const defaultOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleTimeString(LOCALE, withTimezone({ ...defaultOptions, ...options }));
}

export function formatDateRelative(dateString) {
  if (!dateString) return "-";
  const date = createDate(dateString);
  if (!date) return "-";

  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Hari ini";
  } else if (diffDays === 1) {
    return "Kemarin";
  } else if (diffDays < 7) {
    return `${diffDays} hari lalu`;
  } else {
    return formatDate(dateString, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

/**
 * Set the timezone for date formatting
 * @param {string} timezone - IANA timezone identifier (e.g., "Asia/Jakarta")
 */
export function setTimezone(timezone) {
  if (timezone && typeof timezone === "string") {
    currentTimezone = timezone;
  } else {
    currentTimezone = DEFAULT_TIMEZONE;
  }
}

/**
 * Load timezone from settings and apply it
 */
export async function loadTimezoneFromSettings() {
  try {
    // Check if we're in a browser environment with IPC access
    if (typeof window !== "undefined" && window.api?.invoke) {
      const settings = await window.api.invoke("settings:get");
      if (settings && settings.timezone) {
        setTimezone(settings.timezone);
      } else {
        // Use system timezone as fallback
        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(systemTimezone);
      }
    } else {
      // Fallback to default timezone if IPC is not available
      setTimezone(DEFAULT_TIMEZONE);
    }
  } catch (error) {
    console.error("Error loading timezone from settings:", error);
    // Fallback to default timezone on error
    setTimezone(DEFAULT_TIMEZONE);
  }
}
