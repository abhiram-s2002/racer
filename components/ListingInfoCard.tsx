import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Package, Calendar } from 'lucide-react-native';


const { width } = Dimensions.get('window');

interface ListingInfoCardProps {
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  category: string;
  createdAt: string;
}

const ListingInfoCard: React.FC<ListingInfoCardProps> = React.memo(({
  title,
  description,
  price,
  priceUnit,
  category,
  createdAt,
}) => {




  const formattedDate = useMemo(() => {
    if (!createdAt) return 'Recently';
    
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return 'Recently';
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  }, [createdAt]);

  const categoryDisplay = useMemo(() => {
    if (!category || typeof category !== 'string') return 'General';
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }, [category]);



  return (
    <View style={styles.container}>
      {/* Header Section with Enhanced Visual Hierarchy */}
      <View style={styles.headerSection}>
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>
            {title || 'Untitled Listing'}
          </Text>
        </View>
        
        {/* New Pricing Component */}
        <View style={styles.pricingSection}>
          <View style={styles.priceRow}>
            <View style={styles.priceValueContainer}>
              <Text style={styles.priceValue}>₹{price || 0}</Text>
              <View style={styles.priceUnitContainer}>
                              <Text style={styles.priceUnitText}>
                {priceUnit === 'per_item' ? 'per item' : 
                 priceUnit === 'per_hour' ? 'per hour' :
                 priceUnit === 'per_day' ? 'per day' :
                 priceUnit === 'per_week' ? 'per week' :
                 priceUnit === 'per_month' ? 'per month' :
                 priceUnit === 'per_year' ? 'per year' :
                 (priceUnit && typeof priceUnit === 'string' ? priceUnit.replace('per_', 'per ').toLowerCase() : 'per item')}
              </Text>
              </View>
            </View>
          </View>
          <View style={styles.pricingInfo}>
            <Text style={styles.pricingSubtext}>Best offer welcome</Text>
          </View>
        </View>
      </View>

      {/* Meta Information Grid - Only Real Data */}
      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <View style={styles.metaIconContainer}>
            <Package size={18} color="#3B82F6" />
          </View>
          <View style={styles.metaContent}>
            <Text style={styles.metaLabel}>Category</Text>
            <Text style={styles.metaValue}>{categoryDisplay}</Text>
          </View>
        </View>

        <View style={styles.metaItem}>
          <View style={styles.metaIconContainer}>
            <Calendar size={18} color="#10B981" />
          </View>
          <View style={styles.metaContent}>
            <Text style={styles.metaLabel}>Listed</Text>
            <Text style={styles.metaValue}>{formattedDate}</Text>
          </View>
        </View>
      </View>

      {/* Description Section - Always Fully Visible */}
      {description && description.trim() !== '' && (
        <View style={styles.descriptionSection}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionLabel}>About This Item</Text>
          </View>
          
          <View style={styles.descriptionContent}>
            <Text style={styles.descriptionText}>
              {description}
            </Text>
          </View>
        </View>
      )}

      {/* Divider with enhanced styling */}
      <View style={styles.divider} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  // Header Section
  headerSection: {
    marginBottom: 24,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    lineHeight: 34,
    marginRight: 16,
  },



  // New Pricing Component Styles
  pricingSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  priceUnitContainer: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  priceUnitText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
    textTransform: 'uppercase',
  },
  pricingInfo: {
    alignItems: 'flex-end',
  },
  pricingSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    fontStyle: 'italic',
  },

  // Meta Information Grid
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: (width - 80) / 2,
  },
  metaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metaContent: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },

  // Enhanced Description Section
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  descriptionContent: {
    position: 'relative',
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 24,
  },

  // Enhanced Divider
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
    borderRadius: 0.5,
  },
});

ListingInfoCard.displayName = 'ListingInfoCard';

export default ListingInfoCard;
