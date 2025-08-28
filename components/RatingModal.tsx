import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import StarRating from './StarRating';
import { RatingModalProps, RatingFormData, RatingCategory } from '@/utils/types';
import RatingService from '@/utils/ratingService';
import { useAuth } from '../hooks/useAuth';
import { withErrorBoundary } from '@/components/ErrorBoundary';

const RATING_CATEGORIES: { value: RatingCategory; label: string; description: string }[] = [
  {
    value: 'overall',
    label: 'Overall Experience',
    description: 'General satisfaction with the interaction'
  },
  {
    value: 'communication',
    label: 'Communication',
    description: 'How well they communicated throughout'
  },
  {
    value: 'responsiveness',
    label: 'Responsiveness',
    description: 'How quickly they responded to messages'
  },
  {
    value: 'helpfulness',
    label: 'Helpfulness',
    description: 'How helpful and accommodating they were'
  }
];

function RatingModalComponent({ 
  visible, 
  ratedUsername, 
  pingId, 
  onSubmit, 
  onClose 
}: RatingModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<RatingCategory>('overall');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setRating(0);
      setSelectedCategory('overall');
      setReviewText('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!rating) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!user?.username) {
      Alert.alert('Authentication Error', 'Please log in to submit a rating.');
      return;
    }

    setSubmitting(true);

    try {
      const ratingData: RatingFormData = {
        rating,
        category: selectedCategory,
        review_text: reviewText.trim() || undefined
      };

      const result = await RatingService.submitRating(
        user.username,
        ratedUsername,
        pingId,
        ratingData
      );

      if (result.success) {
        Alert.alert(
          'Rating Submitted', 
          'Thank you for your feedback!',
          [{ text: 'OK', onPress: onClose }]
        );
        onSubmit(ratingData);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit rating. Please try again.');
      }
    } catch (error) {
      // Error submitting rating
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return; // Prevent closing while submitting
    
    setRating(0);
    setSelectedCategory('overall');
    setReviewText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.ratingModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Rate {ratedUsername}</Text>
            <Text style={styles.modalSubtitle}>
              How was your experience with this user?
            </Text>
            
            {/* Star Rating Selection */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Your Rating</Text>
              <View style={styles.starContainer}>
                <StarRating 
                  rating={rating} 
                  size="large" 
                  readonly={false}
                  onRatingChange={setRating}
                />
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </Text>
              )}
            </View>

            {/* Category Selection */}
            <View style={styles.categorySection}>
              <Text style={styles.sectionTitle}>Rating Category</Text>
              <Text style={styles.sectionSubtitle}>
                What aspect are you rating?
              </Text>
              
              <View style={styles.categoriesContainer}>
                {RATING_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.value && styles.categoryButtonSelected
                    ]}
                    onPress={() => setSelectedCategory(category.value)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category.value && styles.categoryButtonTextSelected
                    ]}>
                      {category.label}
                    </Text>
                    <Text style={[
                      styles.categoryDescription,
                      selectedCategory === category.value && styles.categoryDescriptionSelected
                    ]}>
                      {category.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Review Text Input */}
            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>Review (Optional)</Text>
              <Text style={styles.sectionSubtitle}>
                Share your experience in detail
              </Text>
              
              <TextInput
                style={styles.reviewInput}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Tell us about your experience with this user..."
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={500}
                numberOfLines={4}
              />
              <Text style={styles.characterCount}>
                {reviewText.length}/500 characters
              </Text>
            </View>
          </ScrollView>
          
          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!rating || submitting) && { backgroundColor: '#94A3B8' }
              ]}
              onPress={handleSubmit}
              disabled={!rating || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default withErrorBoundary(RatingModalComponent, 'RatingModal');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ratingModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  starContainer: {
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#22C55E',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryButtonSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  categoryDescriptionSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

