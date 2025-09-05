import { Request } from './types';

export interface WhatsAppMessageData {
  type: 'request' | 'ping' | 'activity';
  title: string;
  description?: string;
  category?: string;
  budget?: string;
  location?: string;
  urgency?: string;
  requesterName?: string;
  requesterUsername?: string;
  distance?: number;
  expiresAt?: string;
  additionalInfo?: string;
}

/**
 * Formats request details into a WhatsApp message
 */
export function formatRequestForWhatsApp(request: Request, requesterName?: string): string {
  const lines: string[] = [];
  
  // Personal greeting
  lines.push(`Hi! I saw your request for "${request.title}" and I'm interested in helping you out.`);
  lines.push('');
  
  // Description
  if (request.description) {
    lines.push(`Here's what I understand you need:`);
    lines.push(request.description);
    lines.push('');
  }
  
  // Budget (if specified)
  if (request.budget_min && request.budget_max) {
    if (request.budget_min === request.budget_max) {
      lines.push(`I see your budget is around ₹${request.budget_min}.`);
    } else {
      lines.push(`I see your budget is between ₹${request.budget_min} - ₹${request.budget_max}.`);
    }
  } else if (request.budget_min) {
    lines.push(`I see your budget starts from ₹${request.budget_min}.`);
  } else if (request.budget_max) {
    lines.push(`I see your budget is up to ₹${request.budget_max}.`);
  }
  
  // Urgency (if urgent)
  if (request.urgency === 'urgent') {
    lines.push(`I understand this is urgent, so I'll prioritize this.`);
  }
  
  lines.push('');
  lines.push(`Would love to discuss the details with you! When would be a good time to chat?`);
  
  return lines.join('\n');
}

/**
 * Formats ping/listing details into a WhatsApp message
 */
export function formatPingForWhatsApp(pingData: {
  title: string;
  description?: string;
  category?: string;
  price?: number;
  location?: string;
  sellerName?: string;
  sellerUsername?: string;
  distance?: number;
  message?: string;
}): string {
  const lines: string[] = [];
  
  // Personal greeting
  lines.push(`Hi! I'm interested in your "${pingData.title}" listing.`);
  lines.push('');
  
  // Custom message (if provided)
  if (pingData.message) {
    lines.push(pingData.message);
    lines.push('');
  }
  
  // Description
  if (pingData.description) {
    lines.push(`I can see it's about: ${pingData.description}`);
    lines.push('');
  }
  
  // Price
  if (pingData.price) {
    lines.push(`I see the price is ₹${pingData.price}.`);
  }
  
  lines.push('');
  lines.push(`Would love to know more details! Is it still available?`);
  
  return lines.join('\n');
}

/**
 * Formats activity details into a WhatsApp message
 */
export function formatActivityForWhatsApp(activityData: {
  type: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  location?: string;
  userName?: string;
  userUsername?: string;
  distance?: number;
  message?: string;
}): string {
  const lines: string[] = [];
  
  // Personal greeting based on activity type
  if (activityData.type === 'listing') {
    lines.push(`Hi! I'm interested in your "${activityData.title}" listing.`);
  } else {
    lines.push(`Hi! I saw your activity about "${activityData.title}" and I'm interested.`);
  }
  lines.push('');
  
  // Custom message (if provided)
  if (activityData.message) {
    lines.push(activityData.message);
    lines.push('');
  }
  
  // Description
  if (activityData.description) {
    lines.push(`I can see it's about: ${activityData.description}`);
    lines.push('');
  }
  
  // Price
  if (activityData.price) {
    lines.push(`I see the price is ₹${activityData.price}.`);
  }
  
  lines.push('');
  lines.push(`Would love to know more details! Let's chat about it.`);
  
  return lines.join('\n');
}

/**
 * Creates a WhatsApp URL with pre-filled message
 */
export function createWhatsAppURL(phoneNumber: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
}

/**
 * Creates a WhatsApp Web URL with pre-filled message
 */
export function createWhatsAppWebURL(phoneNumber: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}
