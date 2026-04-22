function getDatePartsForTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((item) => item.type === type);
    return part?.value ?? "";
  };

  return {
    year: Number(lookup("year")),
    month: Number(lookup("month")),
    day: Number(lookup("day")),
    hour: Number(lookup("hour")),
    minute: Number(lookup("minute")),
    weekdayShort: lookup("weekday"),
  };
}

export function getCronDateParts(date: Date, timeZone: string) {
  const parts = getDatePartsForTimeZone(date, timeZone);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    minute: parts.minute,
    hour: parts.hour,
    dayOfMonth: parts.day,
    month: parts.month,
    dayOfWeek: weekdayMap[parts.weekdayShort] ?? 0,
  };
}

export function formatInvoiceDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatPeriodLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatInvoiceNumber(number: number, prefix: string): string {
  const padded = String(number).padStart(6, "0");
  return `${prefix}${padded}`;
}
