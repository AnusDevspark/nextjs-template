import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Display formatters shared by table cells, detail fields and exports.
 *
 * Every one of these returns the `empty` placeholder for null/undefined/invalid
 * input rather than throwing or rendering "Invalid Date". A table with 50 rows
 * must not break because one record has a null `updatedAt`.
 */

export const EMPTY_PLACEHOLDER = "—";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;

  const date =
    value instanceof Date ? value : typeof value === "number" ? new Date(value) : parseISO(value);

  return isValid(date) ? date : null;
}

/** `2 Aug 2026` */
export function formatDate(
  value: Date | string | number | null | undefined,
  { pattern = "d MMM yyyy", empty = EMPTY_PLACEHOLDER } = {},
): string {
  const date = toDate(value);
  return date ? format(date, pattern) : empty;
}

/** `2 Aug 2026, 14:30` */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  { pattern = "d MMM yyyy, HH:mm", empty = EMPTY_PLACEHOLDER } = {},
): string {
  const date = toDate(value);
  return date ? format(date, pattern) : empty;
}

/** `3 days ago` */
export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  { empty = EMPTY_PLACEHOLDER } = {},
): string {
  const date = toDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : empty;
}

/** ISO date suitable for an `<input type="date">` value. */
export function toDateInputValue(value: Date | string | number | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function formatCurrency(
  value: number | string | null | undefined,
  {
    currency = "USD",
    locale = "en-US",
    empty = EMPTY_PLACEHOLDER,
  }: { currency?: string; locale?: string; empty?: string } = {},
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount === null || amount === undefined || Number.isNaN(amount)) return empty;

  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatNumber(
  value: number | string | null | undefined,
  {
    locale = "en-US",
    empty = EMPTY_PLACEHOLDER,
    ...options
  }: Intl.NumberFormatOptions & { locale?: string; empty?: string } = {},
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount === null || amount === undefined || Number.isNaN(amount)) return empty;

  return new Intl.NumberFormat(locale, options).format(amount);
}

export function formatPercent(
  value: number | null | undefined,
  { locale = "en-US", empty = EMPTY_PLACEHOLDER, fractionDigits = 0 } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return empty;

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatBoolean(
  value: boolean | null | undefined,
  { yes = "Yes", no = "No", empty = EMPTY_PLACEHOLDER } = {},
): string {
  if (value === null || value === undefined) return empty;
  return value ? yes : no;
}

/** `["Cardiology", "Neurology"]` → `Cardiology, Neurology` */
export function formatList(
  value: readonly string[] | null | undefined,
  {
    separator = ", ",
    empty = EMPTY_PLACEHOLDER,
    max,
  }: { separator?: string; empty?: string; max?: number } = {},
): string {
  if (!value || value.length === 0) return empty;
  if (max === undefined || value.length <= max) return value.join(separator);

  return `${value.slice(0, max).join(separator)} +${value.length - max} more`;
}

/** Any value that is null, undefined or blank becomes the placeholder. */
export function formatText(
  value: string | number | null | undefined,
  { empty = EMPTY_PLACEHOLDER } = {},
): string {
  if (value === null || value === undefined) return empty;

  const text = String(value).trim();
  return text.length > 0 ? text : empty;
}

/** `+1 (555) 123-4567` for 10/11-digit NANP numbers; returned unchanged otherwise. */
export function formatPhone(
  value: string | null | undefined,
  { empty = EMPTY_PLACEHOLDER } = {},
): string {
  if (!value) return empty;

  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return value;
}

/** `1.2 MB` */
export function formatFileSize(
  bytes: number | null | undefined,
  { empty = EMPTY_PLACEHOLDER } = {},
): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return empty;
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;

  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Shortens long text for a table cell without breaking mid-word where avoidable. */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const slice = value.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(" ");

  return `${lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice}…`;
}
