const LOCALE = "id-ID";
const DEFAULT_TIMEZONE = "Asia/Jakarta";

// Timezone dinamis yang bisa diubah
let currentTimezone = DEFAULT_TIMEZONE;

const createDate = (value) => {
  if (!value) return null;
  
  // Handle string datetime SQLite (format: 'YYYY-MM-DD HH:MM:SS' tanpa timezone)
  // SQLite CURRENT_TIMESTAMP nyimpen waktu UTC, jadi kita parse sebagai UTC dengan nambahin 'Z'
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    // Format datetime SQLite - treat sebagai UTC dengan nambahin 'Z'
    // Ini memastikan konversi timezone yang benar pas format
    const date = new Date(value.replace(" ", "T") + "Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }
  
  // Handle format DATE (YYYY-MM-DD) - parse sebagai local time di tengah malam
  // Field DATE gak punya waktu, jadi kita pakai local midnight
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
  }
  
  // Untuk ISO string dengan info timezone, atau format lain, pakai standard Date parsing
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const withTimezone = (options = {}) => ({
  timeZone: currentTimezone,
  ...options,
});

// Buat fungsi formatter yang pakai timezone sekarang
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
    // Cek apakah kita di environment browser dengan akses IPC
    if (typeof window !== "undefined" && window.api?.invoke) {
      const settings = await window.api.invoke("settings:get");
      if (settings && settings.timezone) {
        setTimezone(settings.timezone);
      } else {
        // Pakai system timezone sebagai fallback
        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(systemTimezone);
      }
    } else {
      // Fallback ke default timezone kalau IPC gak tersedia
      setTimezone(DEFAULT_TIMEZONE);
    }
  } catch (error) {
    console.error("Error loading timezone from settings:", error);
    // Fallback ke default timezone kalau error
    setTimezone(DEFAULT_TIMEZONE);
  }
}
