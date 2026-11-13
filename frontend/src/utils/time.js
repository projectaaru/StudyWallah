/**
 * Formats an ISO timestamp in 12-hour clock format (e.g. "08:15 PM") for the configured timezone.
 */
export function formatTime12Hour(isoString, timeZone = 'Asia/Kolkata') {
  if (!isoString) return 'No updates yet';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Invalid time';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

/**
 * Formats an ISO timestamp with short date and 12-hour time (e.g. "12 Nov, 08:15 PM").
 */
export function formatDateTime12Hour(isoString, timeZone = 'Asia/Kolkata') {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

export function getGreeting(name) {
  const hour = new Date().getHours();
  let prefix = 'Good Evening';
  if (hour < 12) prefix = 'Good Morning';
  else if (hour < 17) prefix = 'Good Afternoon';
  return name ? `${prefix}, ${name}` : `${prefix}, Aspirant`;
}
