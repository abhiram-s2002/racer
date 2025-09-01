import { useEffect } from 'react';
import { cacheMaintenance } from '@/utils/cacheMaintenance';
import { imageCache } from '@/utils/imageCache';
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
          if (imageCache && imageCache.isReady()) {
            const imageStats = imageCache.getStats();
          }
        } catch (imageError) {
          // Not an error - just cache not ready yet during first app open
        }

        // Get API cache statistics (with error handling)
        try {
          const apiStats = await apiCache.getCacheStats();
        } catch (apiError) {
          // API cache stats error (non-critical)
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