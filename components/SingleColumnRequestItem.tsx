import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Package } from 'lucide-react-native';
import NewRobustImage from './NewRobustImage';

interface SellerRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min?: number;
  budget_max?: number;
  thumbnail_images?: string[];
  preview_images?: string[];
  created_at: string;
  expires_at?: string;
}

interface SingleColumnRequestItemProps {
  request: SellerRequest;
  onPress: (requestId: string) => void;
}

const SingleColumnRequestItem: React.FC<SingleColumnRequestItemProps> = React.memo(({ request, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(request.id)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <NewRobustImage
          thumbnailImages={request.thumbnail_images}
          previewImages={request.preview_images}
          style={styles.image}
          placeholderText="No Image"
          size="thumbnail"
          title={request.title}
          category={request.category}
          itemType="request"
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {request.title}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.categoryContainer}>
            <Package size={12} color="#6B7280" />
            <Text style={styles.category}>{request.category}</Text>
          </View>
        </View>

        <Text style={styles.budget}>
          {request.budget_max ? `₹${request.budget_min || 0} - ₹${request.budget_max}` : `₹${request.budget_min || 0}`} <Text style={styles.budgetLabel}>Budget</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageContainer: {
    width: 80,
    height: 80,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  budget: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  budgetLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  }
});

SingleColumnRequestItem.displayName = 'SingleColumnRequestItem';

export default SingleColumnRequestItem;


