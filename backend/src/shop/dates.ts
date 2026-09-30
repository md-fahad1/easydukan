// বাংলাদেশ সময় (UTC+6) অনুযায়ী দিনের হিসাব
const OFFSET = 6 * 3600 * 1000;

export function dhakaDay(d = new Date()) {
  return new Date(d.getTime() + OFFSET).toISOString().slice(0, 10);
}

export function range(period: string) {
  const now = new Date();
  const l = new Date(now.getTime() + OFFSET);
  const y = l.getUTCFullYear(), m = l.getUTCMonth(), d = l.getUTCDate();
  let start = Date.UTC(y, m, d);
  if (period === 'WEEK') start = Date.UTC(y, m, d - ((l.getUTCDay() + 1) % 7)); // সপ্তাহ শুরু শনিবার
  if (period === 'MONTH') start = Date.UTC(y, m, 1);
  return { from: new Date(start - OFFSET), to: new Date(now.getTime() + 60000) };
}
