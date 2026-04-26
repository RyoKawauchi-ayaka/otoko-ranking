export function tokyoDayStartIso(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) {
    // fallback: local midnight
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd.toISOString();
  }
  // Tokyo 00:00 to UTC ISO
  return new Date(`${y}-${m}-${day}T00:00:00+09:00`).toISOString();
}

