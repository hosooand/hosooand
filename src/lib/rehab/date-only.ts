export function toDateOnlyString(date: Date | string): string {
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Date(date).toISOString().split("T")[0];
  }
  return date.toISOString().split("T")[0];
}

export function normalizeDateOnlyInput(input: Date | string): string {
  return toDateOnlyString(input);
}

export function addDaysDateOnly(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function weekRangeFromDate(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDaysDateOnly(dateStr, mondayOffset);
  const sunday = addDaysDateOnly(monday, 6);
  return { start: monday, end: sunday };
}
