import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { withErrorBoundary } from '@/components/ErrorBoundary';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

const QUICK_TAGS = ['Easy to use', 'Fast', 'Buggy', 'Needs improvements'];

function FeedbackModalComponent({ visible, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    if (!rating) return;

    let combined = '';
    if (selectedTags.length > 0) combined += `Tags: ${selectedTags.join(', ')}`;
    if (feedbackText.trim()) combined += (combined ? '\n\n' : '') + feedbackText.trim();
    if (!combined) combined = 'No additional feedback provided';

    onSubmit(rating, combined);

    setRating(null);
    setFeedbackText('');
    setSelectedTags([]);
  };

  const handleClose = () => {
    setRating(null);
    setFeedbackText('');
    setSelectedTags([]);
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
        <View style={styles.feedbackModal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.feedbackModalTitle}>Rate Our App</Text>
            <Text style={styles.feedbackModalText}>How would you rate your experience?</Text>

            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.starButton}
                  onPress={() => setRating(star)}
                >
                  <Text style={[
                    styles.starText,
                    rating && star <= rating ? { color: '#FFD700' } : { color: '#E2E8F0' }
                  ]}>
                    {rating && star <= rating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.optionsContainer}>
              {QUICK_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.optionButton, selectedTags.includes(tag) && styles.optionButtonSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.optionText, selectedTags.includes(tag) && styles.optionTextSelected]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.feedbackLabel}>Comments (Optional):</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Tell us anything else you'd like to share..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={300}
              numberOfLines={3}
            />
            <Text style={styles.characterCount}>{feedbackText.length}/300 characters</Text>
          </ScrollView>

          <View style={styles.feedbackActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, !rating && { backgroundColor: '#94A3B8' }]}
              onPress={handleSubmit}
              disabled={!rating}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default withErrorBoundary(FeedbackModalComponent, 'FeedbackModal');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  feedbackModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
  },
  feedbackModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1E293B',
  },
  feedbackModalText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  starButton: {
    padding: 8,
  },
  starText: {
    fontSize: 28,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionButtonSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  optionText: {
    fontSize: 12,
    color: '#64748B',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  feedbackLabel: {
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
    fontWeight: '600',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  feedbackActions: {
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