export interface PingTemplate {
  id: string;
  title: string;
  message: string;
  category: 'general' | 'pricing' | 'availability' | 'delivery' | 'custom';
  isCustom?: boolean;
}

export const defaultPingTemplates: PingTemplate[] = [
  {
    id: 'general_interest',
    title: 'General Interest',
    message: 'Hi! I\'m interested in your listing. Is it still available?',
    category: 'general'
  },
  {
    id: 'price_negotiation',
    title: 'Price Discussion',
    message: 'Hi! I like your listing. Would you be open to negotiating the price?',
    category: 'pricing'
  },
  {
    id: 'best_price',
    title: 'Best Price',
    message: 'What\'s your best price for this item?',
    category: 'pricing'
  },
  {
    id: 'availability_check',
    title: 'Check Availability',
    message: 'Is this still available? When can I pick it up?',
    category: 'availability'
  },
  {
    id: 'delivery_inquiry',
    title: 'Delivery Options',
    message: 'Do you offer delivery? If so, what are the costs and areas covered?',
    category: 'delivery'
  },
  {
    id: 'meet_location',
    title: 'Meeting Location',
    message: 'Where would be a convenient place to meet? I\'m flexible with timing.',
    category: 'delivery'
  },
  {
    id: 'more_details',
    title: 'More Details',
    message: 'Could you provide more details about the condition and any additional information?',
    category: 'general'
  },
  {
    id: 'bulk_purchase',
    title: 'Bulk Purchase',
    message: 'I\'m interested in buying multiple items. Do you offer any discounts for bulk purchases?',
    category: 'pricing'
  }
];

// Get templates by category
export function getTemplatesByCategory(category: PingTemplate['category']): PingTemplate[] {
  return defaultPingTemplates.filter(template => template.category === category);
}

// Get all templates
export function getAllTemplates(): PingTemplate[] {
  return defaultPingTemplates;
}

// Get template by ID
export function getTemplateById(id: string): PingTemplate | undefined {
  return defaultPingTemplates.find(template => template.id === id);
}

// Get random template
export function getRandomTemplate(): PingTemplate {
  const randomIndex = Math.floor(Math.random() * defaultPingTemplates.length);
  return defaultPingTemplates[randomIndex];
}

// Get templates for specific listing category
export function getTemplatesForListingCategory(listingCategory: string): PingTemplate[] {
  const categorySpecificTemplates: Record<string, string[]> = {
    'groceries': ['availability_check', 'delivery_inquiry', 'bulk_purchase'],
    'fruits': ['availability_check', 'delivery_inquiry', 'best_price'],
    'food': ['availability_check', 'delivery_inquiry', 'meet_location'],
    'services': ['general_interest', 'more_details', 'price_negotiation'],
    'fashion': ['general_interest', 'more_details', 'price_negotiation'],
    'home': ['general_interest', 'more_details', 'delivery_inquiry'],
    'electronics': ['general_interest', 'more_details', 'price_negotiation']
  };

  const templateIds = categorySpecificTemplates[listingCategory] || ['general_interest', 'price_negotiation'];
  return defaultPingTemplates.filter(template => templateIds.includes(template.id));
} 