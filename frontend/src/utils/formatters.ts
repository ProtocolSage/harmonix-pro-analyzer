export const formatNumber = (value?: number, digits = 0, fallback = '--') => {
  if (value === undefined || Number.isNaN(value)) return fallback;
  if (digits === 0) return Math.round(value).toLocaleString('en-US');
  return Number(value.toFixed(digits)).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatPercent = (value?: number, fallback = 0) => {
  const safe = value ?? fallback;
  return Math.round(safe * 100);
};

export const formatDuration = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return '0:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};
