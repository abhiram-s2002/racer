import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X, MapPin, Shield } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

interface DistanceFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDistance: number | null;
  selectedVerifiedOnly?: boolean;
  onSelectDistance: (distance: number | null) => void;
  onSelectVerifiedOnly?: (verifiedOnly: boolean) => void;
}

export default function DistanceFilterModal({ 
  visible, 
  onClose, 
  selectedDistance, 
  selectedVerifiedOnly = false,
  onSelectDistance,
  onSelectVerifiedOnly
}: DistanceFilterModalProps) {
  
  // Local state for slider value
  const [sliderValue, setSliderValue] = useState(selectedDistance || 5);
  const [displayValue, setDisplayValue] = useState(selectedDistance || 5);
  const [localVerifiedOnly, setLocalVerifiedOnly] = useState(selectedVerifiedOnly);
  const lastUpdateRef = useRef<number>(0);
  
  // Update slider value when selectedDistance changes
  useEffect(() => {
    if (selectedDistance !== null) {
      setSliderValue(selectedDistance);
      setDisplayValue(selectedDistance);
    }
  }, [selectedDistance]);

  // Update verified only state when prop changes
  useEffect(() => {
    setLocalVerifiedOnly(selectedVerifiedOnly);
  }, [selectedVerifiedOnly]);

  const handleSelectDistance = useCallback((distance: number | null) => {
    onSelectDistance(distance);
    onClose();
  }, [onSelectDistance, onClose]);

  // Throttled slider change handler to prevent glitching
  const handleSliderChange = useCallback((value: number) => {
    const now = Date.now();
    // Throttle updates to every 50ms to prevent glitching
    if (now - lastUpdateRef.current > 50) {
      setDisplayValue(Math.round(value));
      lastUpdateRef.current = now;
    }
  }, []);

  // Handle slider completion (when user stops dragging)
  const handleSlidingComplete = useCallback((value: number) => {
    const roundedValue = Math.round(value);
    setSliderValue(roundedValue);
    setDisplayValue(roundedValue);
  }, []);

  const handleApplySlider = useCallback(() => {
    onSelectDistance(sliderValue);
    if (onSelectVerifiedOnly) {
      onSelectVerifiedOnly(localVerifiedOnly);
    }
    onClose();
  }, [sliderValue, localVerifiedOnly, onSelectDistance, onSelectVerifiedOnly, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MapPin size={20} color="#22C55E" />
            <Text style={styles.title}>Filter by Distance</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Show listings within:</Text>
          
          {/* Any Distance Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedDistance === null && styles.selectedOption
            ]}
            onPress={() => handleSelectDistance(null)}
          >
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionText,
                selectedDistance === null && styles.selectedOptionText
              ]}>
                Any distance
              </Text>
              {selectedDistance === null && (
                <View style={styles.checkmarkContainer}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Slider Section */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Custom distance</Text>
              <Text style={styles.sliderValue}>{displayValue} km</Text>
            </View>
            
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={sliderValue}
                onValueChange={handleSliderChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor="#22C55E"
                maximumTrackTintColor="#E2E8F0"
                thumbTintColor="#22C55E"
              />
            </View>
            
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>1 km</Text>
              <Text style={styles.rangeText}>50 km</Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.applyButton,
                selectedDistance === sliderValue && styles.selectedOption
              ]}
              onPress={handleApplySlider}
            >
              <Text style={[
                styles.applyButtonText,
                selectedDistance === sliderValue && styles.selectedOptionText
              ]}>
                Apply {sliderValue} km
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Distance Options */}
          <View style={styles.quickOptionsContainer}>
            <Text style={styles.quickOptionsTitle}>Quick select:</Text>
            <View style={styles.quickOptions}>
              {[1, 5, 10, 25].map((distance) => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.quickOption,
                    selectedDistance === distance && styles.selectedQuickOption
                  ]}
                  onPress={() => handleSelectDistance(distance)}
                >
                  <Text style={[
                    styles.quickOptionText,
                    selectedDistance === distance && styles.selectedQuickOptionText
                  ]}>
                    {distance} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Verified Sellers Filter Section */}
          {onSelectVerifiedOnly && (
            <View style={styles.verifiedSection}>
              <View style={styles.sectionHeader}>
                <Shield size={20} color="#22C55E" />
                <Text style={styles.sectionTitle}>Verified Sellers</Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.verifiedOption,
                  localVerifiedOnly && styles.selectedVerifiedOption
                ]}
                onPress={() => setLocalVerifiedOnly(!localVerifiedOnly)}
              >
                <View style={styles.verifiedOptionContent}>
                  <View style={styles.verifiedOptionLeft}>
                    <View style={[
                      styles.checkbox,
                      localVerifiedOnly && styles.checkedCheckbox
                    ]}>
                      {localVerifiedOnly && (
                        <Text style={styles.checkmarkText}>✓</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.verifiedOptionText,
                      localVerifiedOnly && styles.selectedVerifiedOptionText
                    ]}>
                      Show only verified sellers
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Info text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Distance is calculated from your current location. Make sure location access is enabled for accurate results.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  selectedOption: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sliderContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  sliderWrapper: {
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },

  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rangeText: {
    fontSize: 12,
    color: '#64748B',
  },
  applyButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  quickOptionsContainer: {
    marginBottom: 20,
  },
  quickOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedQuickOption: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  selectedQuickOptionText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  verifiedSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  verifiedOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedVerifiedOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  verifiedOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  verifiedOptionText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  selectedVerifiedOptionText: {
    color: '#16A34A',
    fontWeight: '600',
  },
}); 