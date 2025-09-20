import { 
  ShoppingCart, 
  Apple, 
  UtensilsCrossed, 
  Wrench, 
  Palette, 
  Home, 
  Car, 
  MoreHorizontal,
  Shirt,
  Chrome as HomeIcon,
  Zap
} from 'lucide-react-native';

export const categoryIcons = {
  groceries: ShoppingCart,
  fruits: Apple,
  food: UtensilsCrossed,
  services: Wrench,
  art: Palette,
  rental: Home,
  vehicles: Car,
  others: MoreHorizontal,
  fashion: Shirt,
  home: HomeIcon,
  electronics: Zap,
} as const;

export type CategoryId = keyof typeof categoryIcons;

export const getCategoryIcon = (categoryId: string) => {
  return categoryIcons[categoryId as CategoryId] || ShoppingCart;
};
