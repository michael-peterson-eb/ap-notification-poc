export function formatDate(ms?: number) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatDuration(ms: number | null) {
  if (!Number.isFinite(ms ?? NaN) || (ms ?? 0) < 0) return null;
  const sec = Math.floor((ms as number) / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  if (hr >= 1) return `${hr} hour${hr === 1 ? '' : 's'}`;
  if (min >= 1) return `${min} min`;
  return `${sec} sec`;
}

export function safeDateTime(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} at ${time}`;
}
