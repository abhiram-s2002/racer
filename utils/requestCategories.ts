import { 
  UtensilsCrossed, 
  ShoppingCart, 
  GraduationCap, 
  Wrench, 
  Camera, 
  Car, 
  Tv, 
  HardHat, 
  Heart, 
  Gift 
} from 'lucide-react-native';

export interface RequestCategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
}

export const requestCategories: RequestCategoryInfo[] = [
  {
    id: 'food_beverages',
    name: 'Food & Beverages',
    description: 'Meals, snacks, drinks, catering',
    icon: UtensilsCrossed,
    color: '#F97316'
  },
  {
    id: 'groceries_essentials',
    name: 'Groceries & Essentials',
    description: 'Vegetables, fruits, milk, daily items',
    icon: ShoppingCart,
    color: '#22C55E'
  },
  {
    id: 'teachers_learning',
    name: 'Teachers & Learning',
    description: 'Tutors, language teachers, skill trainers',
    icon: GraduationCap,
    color: '#3B82F6'
  },
  {
    id: 'home_services',
    name: 'Home Services & Workers',
    description: 'Plumber, electrician, carpenter, cleaner, maid',
    icon: Wrench,
    color: '#8B5CF6'
  },
  {
    id: 'events_media',
    name: 'Events & Media',
    description: 'Cameraman, DJ, decorator, event helper',
    icon: Camera,
    color: '#EC4899'
  },
  {
    id: 'vehicles_travel',
    name: 'Vehicles & Travel',
    description: 'Car hire, bike rental, driver, taxi pickup',
    icon: Car,
    color: '#06B6D4'
  },
  {
    id: 'electronics_appliances',
    name: 'Electronics & Appliances',
    description: 'TV, fridge, repair, laptop, gadgets',
    icon: Tv,
    color: '#6366F1'
  },
  {
    id: 'jobs_work',
    name: 'Jobs & Work Help',
    description: 'Daily wage, part-time help, handyman',
    icon: HardHat,
    color: '#F59E0B'
  },
  {
    id: 'health_wellness',
    name: 'Health & Wellness',
    description: 'Doctor, nurse, fitness trainer, therapist',
    icon: Heart,
    color: '#EF4444'
  },
  {
    id: 'others',
    name: 'Others / Miscellaneous',
    description: 'Anything not covered above',
    icon: Gift,
    color: '#6B7280'
  }
];

export const getCategoryById = (id: string): RequestCategoryInfo | undefined => {
  return requestCategories.find(cat => cat.id === id);
};

export const getCategoryIcon = (id: string) => {
  const category = getCategoryById(id);
  return category?.icon || Gift;
};

export const getCategoryColor = (id: string) => {
  const category = getCategoryById(id);
  return category?.color || '#6B7280';
};

export const getCategoryName = (id: string) => {
  const category = getCategoryById(id);
  return category?.name || 'Others';
};

export const getCategoryDescription = (id: string) => {
  const category = getCategoryById(id);
  return category?.description || 'Miscellaneous services';
};
