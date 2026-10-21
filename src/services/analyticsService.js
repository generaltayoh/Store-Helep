const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Resolve a range filter into absolute [from, to] timestamps.
export function resolveRange(range, from, to) {
  const now = Date.now();
  switch (range) {
    case "today":
      return { from: startOfDay(now).getTime(), to: now };
    case "7d":
    case "this_week":
      return { from: now - 7 * DAY, to: now };
    case "30d":
    case "this_month":
      return { from: now - 30 * DAY, to: now };
    case "custom":
      return {
        from: from ? new Date(from).getTime() : now - 30 * DAY,
        to: to ? new Date(to).getTime() : now,
      };
    default:
      return { from: now - 30 * DAY, to: now };
  }
}
