import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Filter, List } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MapHeaderProps {
  onLocationFilter: () => void;
  onListView: () => void;
  onLocationPress: () => void;
  isLocationActive: boolean;
}

export default function MapHeader({ onLocationFilter, onListView, onLocationPress, isLocationActive }: MapHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color="#1E293B" />
      </TouchableOpacity>
      
                        <Text style={styles.title}>Map View</Text>

                  {/* Location Status and Button */}
                  <View style={styles.locationSection}>
                    <TouchableOpacity 
                      style={styles.locationButton}
                      onPress={onLocationPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.locationStatus}>
                        <View style={[styles.locationDot, isLocationActive && styles.locationDotActive]} />
                        <Text style={[styles.locationText, isLocationActive && styles.locationTextActive]}>
                          {isLocationActive ? 'Location Active' : 'Tap to Center'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Filter and List View Buttons */}
                  <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={onLocationFilter}
        >
          <Filter size={20} color="#64748B" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.listViewButton} 
          onPress={onListView}
        >
          <List size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  locationSection: {
    marginLeft: 16,
  },
  locationButton: {
    padding: 8,
    minHeight: 32,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
    marginRight: 6,
  },
  locationDotActive: {
    backgroundColor: '#22C55E',
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  locationTextActive: {
    color: '#22C55E',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listViewButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
