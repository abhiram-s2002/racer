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

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

const PREDEFINED_FEEDBACK_OPTIONS = [
  {
    category: 'App Experience',
    options: [
      'Easy to use and navigate',
      'Could be more intuitive',
      'Too many steps to complete tasks',
      'Great user interface',
      'Needs better organization'
    ]
  },
  {
    category: 'Features',
    options: [
      'Love the ping system',
      'Need more search filters',
      'Would like better messaging',
      'Great listing features',
      'Missing important features'
    ]
  },
  {
    category: 'Performance',
    options: [
      'App loads quickly',
      'Sometimes slow to respond',
      'Crashes occasionally',
      'Smooth performance',
      'Needs optimization'
    ]
  },
  {
    category: 'Content',
    options: [
      'Great variety of listings',
      'Need more local options',
      'Quality of listings is good',
      'Not enough relevant content',
      'Love the categories'
    ]
  }
];

// Contextual questions based on rating
const RATING_QUESTIONS = {
  1: {
    title: "We're sorry to hear that. What went wrong?",
    subtitle: "Help us understand what disappointed you so we can fix it.",
    questions: [
      "What was the main issue you encountered?",
      "Was there a specific feature that didn't work?",
      "Did you have trouble finding what you were looking for?",
      "Was the app too slow or buggy?",
      "Did something crash or not work as expected?"
    ]
  },
  2: {
    title: "We'd like to improve. What could be better?",
    subtitle: "Your feedback helps us make the app better for everyone.",
    questions: [
      "What was frustrating about your experience?",
      "Which features need improvement?",
      "Was the interface confusing in any way?",
      "Did you have trouble with the ping system?",
      "Were the listings not what you expected?"
    ]
  },
  3: {
    title: "Thanks for your feedback! What could make it better?",
    subtitle: "We're glad it was okay, but we want to make it great.",
    questions: [
      "What would make you rate it higher?",
      "Which features could be improved?",
      "Was anything confusing or unclear?",
      "Did you find everything you were looking for?",
      "What would make you use the app more?"
    ]
  },
  4: {
    title: "Great! What made it good for you?",
    subtitle: "We'd love to know what you enjoyed most.",
    questions: [
      "What features did you like the most?",
      "Was the ping system helpful?",
      "Did you find good listings easily?",
      "Was the interface easy to use?",
      "What would make it even better?"
    ]
  },
  5: {
    title: "Amazing! We're thrilled you love it!",
    subtitle: "Tell us what made it perfect for you.",
    questions: [
      "What features did you love the most?",
      "Was the ping system exactly what you needed?",
      "Did you find exactly what you were looking for?",
      "What made the experience so great?",
      "Would you recommend it to friends? Why?"
    ]
  }
};

export default function FeedbackModal({ visible, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const handleOptionSelect = (option: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(item => item !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleQuestionSelect = (question: string) => {
    setSelectedQuestions(prev => {
      if (prev.includes(question)) {
        return prev.filter(item => item !== question);
      } else {
        return [...prev, question];
      }
    });
  };

  const handleSubmit = () => {
    if (!rating) return;
    
    // Combine selected options, questions, and custom text
    let combinedFeedback = '';
    
    if (selectedQuestions.length > 0) {
      combinedFeedback += `Rating-specific feedback:\n${selectedQuestions.join('\n')}`;
    }
    
    if (selectedOptions.length > 0) {
      if (combinedFeedback) combinedFeedback += '\n\n';
      combinedFeedback += `General feedback:\n${selectedOptions.join('\n')}`;
    }
    
    if (feedbackText.trim()) {
      if (combinedFeedback) combinedFeedback += '\n\n';
      combinedFeedback += `Additional comments:\n${feedbackText.trim()}`;
    }
    
    if (!combinedFeedback.trim()) {
      combinedFeedback = 'No additional feedback provided';
    }
    
    onSubmit(rating, combinedFeedback);
    
    // Reset form
    setRating(null);
    setFeedbackText('');
    setSelectedOptions([]);
    setSelectedQuestions([]);
  };

  const handleClose = () => {
    setRating(null);
    setFeedbackText('');
    setSelectedOptions([]);
    setSelectedQuestions([]);
    onClose();
  };

  const currentRatingData = rating ? RATING_QUESTIONS[rating as keyof typeof RATING_QUESTIONS] : null;

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
            <Text style={styles.feedbackModalText}>
              We'd love to hear your feedback! How would you rate your experience?
            </Text>
            
            {/* Star Rating */}
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

            {/* Contextual Questions Based on Rating */}
            {currentRatingData && (
              <View style={styles.contextualSection}>
                <Text style={styles.contextualTitle}>{currentRatingData.title}</Text>
                <Text style={styles.contextualSubtitle}>{currentRatingData.subtitle}</Text>
                
                <View style={styles.questionsContainer}>
                  {currentRatingData.questions.map((question, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.questionButton,
                        selectedQuestions.includes(question) && styles.questionButtonSelected
                      ]}
                      onPress={() => handleQuestionSelect(question)}
                    >
                      <Text style={[
                        styles.questionText,
                        selectedQuestions.includes(question) && styles.questionTextSelected
                      ]}>
                        {question}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* General Predefined Feedback Options (only show for ratings 3-5) */}
            {rating && rating >= 3 && (
              <View style={styles.generalSection}>
                <Text style={styles.sectionTitle}>General Feedback (Optional)</Text>
                <Text style={styles.sectionSubtitle}>
                  Select any that apply to help us understand your experience better:
                </Text>
                
                {PREDEFINED_FEEDBACK_OPTIONS.map((category, categoryIndex) => (
                  <View key={categoryIndex} style={styles.categoryContainer}>
                    <Text style={styles.categoryTitle}>{category.category}</Text>
                    <View style={styles.optionsContainer}>
                      {category.options.map((option, optionIndex) => (
                        <TouchableOpacity
                          key={optionIndex}
                          style={[
                            styles.optionButton,
                            selectedOptions.includes(option) && styles.optionButtonSelected
                          ]}
                          onPress={() => handleOptionSelect(option)}
                        >
                          <Text style={[
                            styles.optionText,
                            selectedOptions.includes(option) && styles.optionTextSelected
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Custom Feedback Text Input */}
            <Text style={styles.feedbackLabel}>Additional Comments (Optional):</Text>
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
            <Text style={styles.characterCount}>
              {feedbackText.length}/300 characters
            </Text>
          </ScrollView>
          
          {/* Action Buttons */}
          <View style={styles.feedbackActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                !rating && { backgroundColor: '#94A3B8' }
              ]}
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
  contextualSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  contextualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  contextualSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  questionsContainer: {
    gap: 8,
  },
  questionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  questionButtonSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  questionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  questionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  generalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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