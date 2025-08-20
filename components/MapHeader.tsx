import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Filter, List } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MapHeaderProps {
  onLocationFilter: () => void;
  onListView: () => void;
}

export default function MapHeader({ onLocationFilter, onListView }: MapHeaderProps) {
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
