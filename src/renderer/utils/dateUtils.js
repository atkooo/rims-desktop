const LOCALE = "id-ID";
const WIB_TIMEZONE = "Asia/Jakarta";

const createDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const withTimezone = (options = {}) => ({
  timeZone: WIB_TIMEZONE,
  ...options,
});

const enCADateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WIB_TIMEZONE,
});

export function toDateInput(value) {
  const date = createDate(value);
  if (!date) return "";
  return enCADateFormatter.format(date);
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
