import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Phone, X } from 'lucide-react-native';
import { sendOTP, verifyOTP, updateUserPhone } from '@/utils/phoneVerification';
import { validatePhoneNumber } from '@/utils/validation';
import { withErrorBoundary } from '@/components/ErrorBoundary';

const { width } = Dimensions.get('window');

interface PhoneVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string) => void;
  userId: string;
  currentPhone?: string;
  skipPhoneInput?: boolean; // New prop to skip phone input step
  phoneAlreadyVerified?: boolean; // New prop to indicate if phone is already verified
}

function PhoneVerificationModal({
  visible,
  onClose,
  onSuccess,
  userId,
  currentPhone,
  skipPhoneInput = false,
  phoneAlreadyVerified = false
}: PhoneVerificationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // If phone is already verified, close modal and call success
      if (phoneAlreadyVerified && currentPhone) {
        onSuccess(currentPhone);
        handleClose();
        return;
      }
      
      // Auto-send OTP if we're skipping phone input
      if (skipPhoneInput && currentPhone) {
        handleAutoSendOTP();
      }
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, skipPhoneInput, currentPhone]);

  // Countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  const handleAutoSendOTP = async () => {
    if (!currentPhone?.trim()) {
      Alert.alert('Error', 'No phone number provided.');
      return;
    }

    setLoading(true);
    const result = await sendOTP(currentPhone);
    setLoading(false);

    if (result.success) {
      setCountdown(30); // Start countdown
      Alert.alert('OTP Sent', 'Verification code has been sent to your phone number.');
    } else {
      Alert.alert('Error', result.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      Alert.alert('Invalid Phone', validation.error || 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    const result = await sendOTP(phoneNumber);
    setLoading(false);

    if (result.success) {
      setOtpSent(true);
      setCountdown(120); // 2 minutes countdown
      // Don't show alert, let the UI transition smoothly
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    const result = await verifyOTP(phoneNumber, otp);
    setLoading(false);

    if (result.success) {
      // Update user's phone number in database
      const updateResult = await updateUserPhone(userId, phoneNumber);
      if (updateResult.success) {
        Alert.alert('Success', 'Phone number verified successfully!', [
          { text: 'OK', onPress: () => {
            onSuccess(phoneNumber);
            handleClose();
          }}
        ]);
      } else {
        Alert.alert('Error', updateResult.message);
      }
    } else {
      setAttempts(prev => prev + 1);
      Alert.alert('Verification Failed', result.message);
      
      if (result.attemptsRemaining !== undefined && result.attemptsRemaining <= 0) {
        setOtpSent(false);
        setOtp('');
        setAttempts(0);
      }
    }
  };

  // Auto-submit when 6 digits are entered
  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    
    // Auto-submit when 6 digits are entered
    if (cleaned.length === 6) {
      setTimeout(() => handleVerifyOTP(), 500); // Small delay for better UX
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    const result = await sendOTP(phoneNumber);
    setLoading(false);

    if (result.success) {
      setCountdown(120);
      setOtp('');
      Alert.alert('OTP Resent', result.message);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleClose = () => {
    setPhoneNumber(currentPhone || '');
    setOtp('');
    setOtpSent(false);
    setCountdown(0);
    setAttempts(0);
    onClose();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <Phone size={32} color="#22C55E" />
      </View>
      
      <Text style={styles.title}>Verify Your Phone</Text>
      <Text style={styles.subtitle}>
        Enter your phone number and verification code
      </Text>

      {/* Phone Number Input - Always Visible */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneInputWrapper}>
          <Phone size={20} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={[styles.phoneInput, otpSent && styles.disabledInput]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            autoFocus={!otpSent}
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
            editable={!otpSent}
          />
        </View>
      </View>

      {/* Send OTP Button - Always Visible */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled, otpSent && styles.secondaryButton]}
        onPress={handleSendOTP}
        disabled={loading || !phoneNumber.trim() || otpSent}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.buttonText, otpSent && styles.secondaryButtonText]}>
            {otpSent ? 'OTP Sent ✓' : 'Send Verification Code'}
          </Text>
        )}
      </TouchableOpacity>

      {/* OTP Input Section - Always Visible */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Verification Code</Text>
        <View style={[styles.otpInputWrapper, !otpSent && styles.disabledInputWrapper]}>
          <TextInput
            style={[styles.otpInput, !otpSent && styles.disabledInput]}
            value={otp}
            onChangeText={handleOtpChange}
            placeholder={otpSent ? "000000" : "Enter phone number first"}
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={otpSent}
            returnKeyType="done"
            onSubmitEditing={handleVerifyOTP}
            editable={otpSent}
          />
        </View>
      </View>

      {/* Resend Section - Only when OTP sent */}
      {otpSent && (
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={countdown > 0 || loading}
            style={styles.resendButton}
          >
            <Text style={[
              styles.resendButtonText,
              countdown > 0 && styles.resendButtonDisabled
            ]}>
              {countdown > 0 ? `Resend in ${formatCountdown(countdown)}` : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Verify Button - Only when OTP sent */}
      {otpSent && (
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Verify Phone Number</Text>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
          style={styles.gradient}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <BlurView intensity={20} style={styles.modalContent}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {renderContent()}
            </BlurView>
          </Animated.View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 16,
    fontFamily: 'Inter-Regular',
  },
  otpInputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  otpInput: {
    fontSize: 24,
    color: '#1E293B',
    paddingVertical: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
    letterSpacing: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  resendButton: {
    padding: 4,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  resendButtonDisabled: {
    color: '#94A3B8',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  button: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  progressContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  disabledInput: {
    opacity: 0.5,
    color: '#94A3B8',
  },
  disabledInputWrapper: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
  },
  secondaryButtonText: {
    color: '#64748B',
  },
}); 

export default withErrorBoundary(PhoneVerificationModal, 'PhoneVerificationModal'); 