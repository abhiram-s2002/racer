// Utilities to format WhatsApp messages and build deep links

export type ActivityForWhatsApp = {
  type?: 'listing' | 'request' | 'ping';
  title?: string;
  description?: string | null;
  category?: string | null;
  price?: number | string | undefined;
  location?: string | null;
  userName?: string | null;
  userUsername?: string | null;
  distance?: number | null | undefined; // in km
  message?: string | null;
};

const formatDistanceKm = (km?: number | null) => {
  if (km === null || km === undefined) return undefined;
  try {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${Number(km).toFixed(1)} km`;
  } catch {
    return undefined;
  }
};

/**
 * Creates a human-friendly WhatsApp message body describing an activity.
 */
export function formatActivityForWhatsApp(activity: ActivityForWhatsApp): string {
  const lines: string[] = [];

  const header = activity.type === 'request'
    ? '🙋 Request'
    : activity.type === 'listing'
      ? '🛍️ Listing'
      : '📩 Activity';
  lines.push(`${header}: ${activity.title || 'Untitled'}`);

  if (activity.description) {
    lines.push(`📝 ${activity.description}`);
  }

  if (activity.category) {
    lines.push(`🏷️ Category: ${activity.category}`);
  }

  if (activity.price !== undefined && activity.price !== null && activity.price !== '') {
    lines.push(`💰 Price/Budget: ₹${activity.price}`);
  }

  const distanceText = formatDistanceKm(activity.distance ?? undefined);
  if (activity.location || distanceText) {
    const parts = [] as string[];
    if (activity.location) parts.push(activity.location);
    if (distanceText) parts.push(distanceText);
    lines.push(`📍 ${parts.join(' • ')}`);
  }

  if (activity.userName || activity.userUsername) {
    const name = activity.userName || '';
    const username = activity.userUsername ? `@${activity.userUsername}` : '';
    const sep = name && username ? ' ' : '';
    lines.push(`👤 ${name}${sep}${username}`);
  }

  if (activity.message) {
    lines.push('');
    lines.push('💬 Message:');
    lines.push(activity.message);
  }

  lines.push('');
  lines.push('Sent from GeoMart');

  return lines.join('\n');
}

/**
 * whatsapp:// deep link (mobile apps)
 */
export function createWhatsAppURL(phoneNumber: string, message: string): string {
  const encoded = encodeURIComponent(message);
  // Ensure we strip spaces and dashes that sometimes sneak into numbers
  const normalizedPhone = (phoneNumber || '').replace(/[^\d+]/g, '');
  return `whatsapp://send?phone=${normalizedPhone}&text=${encoded}`;
}

/**
 * Web fallback for browsers / when app is unavailable
 */
export function createWhatsAppWebURL(phoneNumber: string, message: string): string {
  const encoded = encodeURIComponent(message);
  const normalizedPhone = (phoneNumber || '').replace(/[^\d+]/g, '');
  return `https://wa.me/${normalizedPhone}?text=${encoded}`;
}



