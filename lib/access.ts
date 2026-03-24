export function canReadSharedCase(user: {
  role: string;
  sharedAccessUntil: Date | string | null;
  sharedAccessPermanent?: boolean | null;
}) {
  if (user.role === "ADMIN" || user.role === "PAID_STUDENT") return true;
  if (user.sharedAccessPermanent) return true;
  if (!user.sharedAccessUntil) return false;
  return new Date(user.sharedAccessUntil).getTime() > Date.now();
}

export function addAccessDays(base: Date | string | null | undefined, days: number) {
  const now = new Date();
  const baseDate = base ? new Date(base) : null;
  const start = baseDate && baseDate.getTime() > now.getTime() ? baseDate : now;
  const next = new Date(start);
  next.setDate(next.getDate() + days);
  return next;
}
