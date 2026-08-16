export const dashboardRanges = ["7d", "30d", "3m", "6m", "1y"] as const;

export type DashboardRange = (typeof dashboardRanges)[number];

export function parseDashboardRange(value: string | undefined): DashboardRange {
  return dashboardRanges.includes(value as DashboardRange) ? (value as DashboardRange) : "30d";
}

export function addCalendarDays(dateKey: string, days: number) {
  const next = new Date(`${dateKey}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function addCalendarMonths(dateKey: string, months: number) {
  const next = new Date(`${dateKey}T12:00:00.000Z`);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
}

export function getRangeStartKey(range: DashboardRange, timeZone: string, now = new Date()) {
  const today = zonedDateKey(now, timeZone);

  switch (range) {
    case "7d":
      return addCalendarDays(today, -6);
    case "30d":
      return addCalendarDays(today, -29);
    case "3m":
      return addCalendarMonths(today, -3);
    case "6m":
      return addCalendarMonths(today, -6);
    case "1y":
      return addCalendarMonths(today, -12);
  }
}

export function eachDateKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  let current = startKey;

  while (current <= endKey) {
    keys.push(current);
    current = addCalendarDays(current, 1);
  }

  return keys;
}

export function eachMonthKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  let current = startKey.slice(0, 7);
  const last = endKey.slice(0, 7);

  while (current <= last) {
    keys.push(current);
    const [year, month] = current.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    current = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  }

  return keys;
}

export function rangeLabel(range: DashboardRange) {
  switch (range) {
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    case "3m":
      return "3 months";
    case "6m":
      return "6 months";
    case "1y":
      return "1 year";
  }
}

function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }

  return new Date(value);
}

export function formatDate(value: string | Date, timeZone = "UTC") {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateValue(value));
}

export function formatTime(value: string | Date, timeZone = "UTC") {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | Date, timeZone = "UTC") {
  return `${formatDate(value, timeZone)} · ${formatTime(value, timeZone)}`;
}

export function formatDayLabel(value: string | Date, timeZone = "UTC") {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(parseDateValue(value));
}

export function formatMonthLabel(value: string | Date, timeZone = "UTC") {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    year: "2-digit",
  }).format(parseDateValue(value));
}

export function zonedDateKey(value: string | Date, timeZone = "UTC") {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function startOfWeekKey(timeZone: string, now = new Date()) {
  const today = zonedDateKey(now, timeZone);
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addCalendarDays(today, -daysFromMonday);
}

export function isSameZonedDay(value: string | Date, timeZone: string, now = new Date()) {
  return zonedDateKey(value, timeZone) === zonedDateKey(now, timeZone);
}

export function toDateTimeLocalValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
