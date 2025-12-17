/**
 * Utility functions for formatting
 */
const { loadSettings } = require("./settingsUtils");
const fs = require("fs");

const DEFAULT_TIMEZONE = "Asia/Jakarta";
const DEFAULT_LOCALE = "id-ID";

// Cache for timezone to avoid loading settings repeatedly
let cachedTimezone = DEFAULT_TIMEZONE;
let timezoneCacheInitialized = false;
let timezoneLoadPromise = null;

/**
 * Get timezone from settings with caching (sync version - uses cached value)
 */
function getTimezoneSync() {
  if (!timezoneCacheInitialized) {
    // Try to load synchronously if possible (for first call)
    try {
      const { getSettingsFile } = require("./pathUtils");
      const settingsFile = getSettingsFile();
      if (fs.existsSync(settingsFile)) {
        const data = fs.readFileSync(settingsFile, "utf8");
        const settings = JSON.parse(data);
        if (settings && settings.timezone) {
          cachedTimezone = settings.timezone;
          timezoneCacheInitialized = true;
          return cachedTimezone;
        }
      }
    } catch (error) {
      // If sync load fails, use default
    }
    // Use system timezone as fallback
    cachedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    timezoneCacheInitialized = true;
  }
  return cachedTimezone;
}

/**
 * Get timezone from settings with caching (async version)
 */
async function getTimezone() {
  if (!timezoneCacheInitialized) {
    if (!timezoneLoadPromise) {
      timezoneLoadPromise = (async () => {
        try {
          const settings = await loadSettings();
          if (settings && settings.timezone) {
            cachedTimezone = settings.timezone;
          } else {
            // Use system timezone as fallback
            cachedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
          timezoneCacheInitialized = true;
        } catch (error) {
          // If error, use default
          cachedTimezone = DEFAULT_TIMEZONE;
          timezoneCacheInitialized = true;
        }
        timezoneLoadPromise = null;
      })();
    }
    await timezoneLoadPromise;
  }
  return cachedTimezone;
}

/**
 * Refresh timezone cache (called when settings are updated)
 */
function refreshTimezoneCache() {
  timezoneCacheInitialized = false;
  cachedTimezone = DEFAULT_TIMEZONE;
  timezoneLoadPromise = null;
}

/**
 * Parse SQLite datetime string to Date object
 * SQLite CURRENT_TIMESTAMP stores time in UTC format 'YYYY-MM-DD HH:MM:SS'
 * We need to parse it as UTC and then convert to desired timezone
 */
function parseSQLiteDateTime(value) {
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
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

/**
 * Format date string (sync version - uses cached timezone)
 */
function formatDate(dateString, options = {}) {
  if (!dateString) return "-";
  const date = parseSQLiteDateTime(dateString);
  if (!date) return "-";
  
  const timezone = getTimezoneSync();
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  };
  return date.toLocaleDateString(DEFAULT_LOCALE, { ...defaultOptions, ...options });
}

/**
 * Format date time string with timezone from settings (sync version)
 */
function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = parseSQLiteDateTime(dateString);
  if (!date) return "-";
  
  const timezone = getTimezoneSync();
  return date.toLocaleString(DEFAULT_LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

/**
 * Format date string (short format, no time) - for DATE fields (sync version)
 */
function formatDateShort(dateString) {
  if (!dateString) return "-";
  const date = parseSQLiteDateTime(dateString);
  if (!date) return "-";
  
  const timezone = getTimezoneSync();
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}

/**
 * Format current date time with timezone from settings (sync version)
 */
function formatCurrentDateTime() {
  const now = new Date();
  const timezone = getTimezoneSync();
  return now.toLocaleString(DEFAULT_LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDateShort,
  formatCurrentDateTime,
  refreshTimezoneCache,
  parseSQLiteDateTime,
};






