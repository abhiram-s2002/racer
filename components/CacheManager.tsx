import { useEffect } from 'react';
import { cacheMaintenance } from '@/utils/cacheMaintenance';
import { ImageCache } from '@/utils/imageCache';
import { apiCache } from '@/utils/apiCache';

interface CacheManagerProps {
  children?: React.ReactNode;
}

export function CacheManager({ children }: CacheManagerProps) {
  useEffect(() => {
    // Start automatic cache maintenance
    cacheMaintenance.startAutoMaintenance();

    // Enable API caching
    apiCache.setEnabled(true);

    // Run initial maintenance
    const initializeCache = async () => {
      try {
        // Run maintenance
        await cacheMaintenance.runMaintenance();

        // Get cache statistics
        const stats = await cacheMaintenance.getMaintenanceStats();

        // Get image cache statistics (with error handling)
        try {
          const imageStats = await ImageCache.getCacheStats();
        } catch (imageError) {
          console.warn('Image cache stats error (non-critical):', imageError);
        }

        // Get API cache statistics (with error handling)
        try {
          const apiStats = await apiCache.getCacheStats();
        } catch (apiError) {
          console.warn('API cache stats error (non-critical):', apiError);
        }
      } catch (error) {
        console.error('Cache initialization error:', error);
      }
    };

    initializeCache();

    // Cleanup on unmount
    return () => {
      cacheMaintenance.stopAutoMaintenance();
      apiCache.setEnabled(false);
    };
  }, []);

  return children || null;
}

// Usage:
// Wrap your app with the CacheManager component
// <CacheManager>
//   <App />
// </CacheManager> 