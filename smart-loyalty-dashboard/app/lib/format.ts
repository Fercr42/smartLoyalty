// Fecha "AAAA-MM-DD" como "12 de octubre" (o "October 12"), igual en cualquier zona horaria.
export function formatDay(ymd: string, dateLocale = "es") {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
