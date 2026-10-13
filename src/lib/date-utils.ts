/**
 * Indian Standard Time (IST - Asia/Kolkata, UTC+05:30) Date and Time Utilities
 * Sai Waters operations in Bareilly, UP are strictly anchored to IST.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Returns today's date formatted as YYYY-MM-DD in Indian Standard Time (IST).
 * Avoids UTC boundary bugs where early morning IST transactions appear as yesterday's date.
 */
export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Formats a Date or ISO timestamp string into a clean 12-hour IST time string.
 * e.g. "02:59 PM"
 */
export function formatTimeIST(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "--:--";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Formats a Date or ISO timestamp string into Indian Standard Date: DD/MM/YYYY
 * e.g. "13/10/2026"
 */
export function formatDateIST(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "--/--/----";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "--/--/----";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a Date or ISO timestamp into full Indian Date and Time
 * e.g. "13 Oct 2026, 02:59 PM"
 */
export function formatDateTimeIST(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "--";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "--";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  // Capitalize AM/PM if lowercase
  return formatted.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}
