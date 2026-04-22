import { getCronDateParts } from "@/lib/date-time";

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function parsePart(part: string, min: number, max: number): number[] {
  if (part === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  }

  const [base, stepRaw] = part.split("/");
  const step = stepRaw ? Number(stepRaw) : 1;

  if (!Number.isFinite(step) || step <= 0) {
    return [];
  }

  let rangeStart = min;
  let rangeEnd = max;

  if (base && base !== "*") {
    if (base.includes("-")) {
      const [startRaw, endRaw] = base.split("-");
      rangeStart = Number(startRaw);
      rangeEnd = Number(endRaw);
    } else {
      const singleValue = Number(base);
      rangeStart = singleValue;
      rangeEnd = singleValue;
    }
  }

  if (!isInRange(rangeStart, min, max) || !isInRange(rangeEnd, min, max) || rangeStart > rangeEnd) {
    return [];
  }

  const values: number[] = [];
  for (let value = rangeStart; value <= rangeEnd; value += step) {
    values.push(value);
  }

  return values;
}

function matchesField(expression: string, value: number, min: number, max: number, isDayOfWeek = false): boolean {
  const parts = expression.split(",");

  return parts.some((part) => {
    const parsed = parsePart(part.trim(), min, max);

    return parsed.some((candidate) => {
      if (!isDayOfWeek) {
        return candidate === value;
      }

      const normalizedCandidate = candidate === 7 ? 0 : candidate;
      return normalizedCandidate === value;
    });
  });
}

export function matchesCronExpression(cronExpr: string, now: Date, timeZone: string): boolean {
  const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = cronExpr.trim().split(/\s+/);

  if (!minuteExpr || !hourExpr || !domExpr || !monthExpr || !dowExpr) {
    return false;
  }

  const parts = getCronDateParts(now, timeZone);

  return (
    matchesField(minuteExpr, parts.minute, 0, 59) &&
    matchesField(hourExpr, parts.hour, 0, 23) &&
    matchesField(domExpr, parts.dayOfMonth, 1, 31) &&
    matchesField(monthExpr, parts.month, 1, 12) &&
    matchesField(dowExpr, parts.dayOfWeek, 0, 7, true)
  );
}
