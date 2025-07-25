import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { ImageCache } from '@/utils/imageCache';

interface OptimizedImageProps {
  source: { uri: string };
  style: any;
  placeholder?: React.ReactNode;
  fallbackColor?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  source, 
  style, 
  placeholder,
  fallbackColor = '#F3F4F6',
  resizeMode = 'cover',
  onLoad,
  onError
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!source?.uri) {
      setImageUri(null);
      setLoading(false);
      setError(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Check cache first
        let cachedUri = await ImageCache.getCachedImage(source.uri);
        
        if (!cachedUri) {
          // Download and cache
          cachedUri = await ImageCache.cacheImage(source.uri);
        }

        if (cachedUri) {
          setImageUri(cachedUri);
          onLoad?.();
        } else {
          setError(true);
          onError?.(new Error('Failed to load image'));
        }
      } catch (err) {
        console.error('Optimized image load error:', err);
        setError(true);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [source?.uri, onLoad, onError]);

  if (loading) {
    return (
      <View style={[style, styles.loadingContainer, { backgroundColor: fallbackColor }]}>
        <ActivityIndicator size="small" color="#22C55E" />
      </View>
    );
  }

  if (error || !imageUri) {
    if (placeholder) {
      return <>{placeholder}</>;
    }
    
    return (
      <View style={[style, styles.errorContainer, { backgroundColor: fallbackColor }]}>
        <Text style={styles.errorText}>Image</Text>
      </View>
    );
  }

  return (
    <Image 
      source={{ uri: imageUri }} 
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={(e) => {
        setError(true);
        onError?.(e.nativeEvent);
      }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});

// Export a simpler version for basic use cases
export const FastImage: React.FC<{
  uri: string;
  style: any;
  placeholder?: React.ReactNode;
}> = ({ uri, style, placeholder }) => (
  <OptimizedImage 
    source={{ uri }} 
    style={style} 
    placeholder={placeholder}
  />
); 