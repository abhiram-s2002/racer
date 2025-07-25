/**
 * Price formatting utilities
 * Centralized functions for consistent price display across the app
 */

/**
 * Formats price with unit for display
 * @param price - The price value as string
 * @param priceUnit - The pricing unit (e.g., 'per_kg', 'per_item')
 * @returns Formatted price string with unit
 */
export const formatPriceWithUnit = (price: string, priceUnit?: string) => {
  if (!priceUnit) {
    return `₹${price}`;
  }
  
  const unitLabels = {
    per_item: 'per item',
    per_kg: 'per kg',
    per_piece: 'per piece',
    per_pack: 'per pack',
    per_bundle: 'per bundle',
    per_dozen: 'per dozen',
    per_basket: 'per basket',
    per_plate: 'per plate',
    per_serving: 'per serving',
    per_hour: 'per hour',
    per_service: 'per service',
    per_session: 'per session',
    per_day: 'per day',
    per_commission: 'per commission',
    per_project: 'per project',
    per_week: 'per week',
    per_month: 'per month',
  };
  
  const unitLabel = unitLabels[priceUnit as keyof typeof unitLabels] || priceUnit;
  return `₹${price} ${unitLabel}`;
};

/**
 * Formats price without unit for simple display
 * @param price - The price value as string or number
 * @returns Formatted price string
 */
export const formatPrice = (price: string | number) => {
  return `₹${price}`;
};

/**
 * Formats price with currency symbol and optional decimals
 * @param price - The price value as string or number
 * @param showDecimals - Whether to show decimal places
 * @returns Formatted price string
 */
export const formatCurrency = (price: string | number, showDecimals: boolean = false) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (showDecimals) {
    return `₹${numPrice.toFixed(2)}`;
  }
  
  return `₹${Math.round(numPrice)}`;
}; 