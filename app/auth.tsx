import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { signUp, signIn } from '@/utils/auth';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { getReferralByCode, createReferral, awardReferralBonus } from '@/utils/rewardsSupabase';
import { validateEmail, validatePassword, validateUsername } from '@/utils/validation';

// Process referral code function (moved outside component for export)
export const processReferralCode = async (code: string) => {
  try {
    // Validate referral code exists
    const referralData = await getReferralByCode(code);
    if (!referralData) {
      return false;
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Get the username from the user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    const username = profile.username;

    // Create the referral relationship
    const referralResult = await createReferral(
      referralData.username, // referrer
      username, // referred (username, not email/phone)
      code // referral code
    );
    
    if (!referralResult) {
      return false;
    }

    // Award 100 OMNI bonus for using referral code
    const bonusResult = await awardReferralBonus(username);
    
    if (!bonusResult) {
      return false;
    }

    return true;
  } catch (error) {
          // Error processing referral code
    return false;
  }
};

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [emailVerificationMode, setEmailVerificationMode] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();
  const errorHandler = ErrorHandler.getInstance();

  // Timer effect for resend code countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendTimer]);

  const handleAuth = async () => {
    setLoading(true);
    
    try {
      // Check network connectivity first
      if (!networkMonitor.isOnline()) {
        await errorHandler.handleError(
          new Error('No internet connection available'),
          {
            operation: 'authentication',
            component: 'AuthScreen',
          }
        );
        setLoading(false);
        return;
      }
    
    if (mode === 'signup') {
      // Validate email using standard validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        await errorHandler.handleError(
          new Error(emailValidation.error || 'Please enter a valid email'),
          {
            operation: 'email_validation',
            component: 'AuthScreen',
          }
        );
        setLoading(false);
        return;
      }

      // Validate password using standard validation
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        await errorHandler.handleError(
          new Error(passwordValidation.error || 'Please enter a valid password'),
          {
            operation: 'password_validation',
            component: 'AuthScreen',
          }
        );
        setLoading(false);
        return;
      }

      // Check if passwords match for signup
      if (password !== confirmPassword) {
        await errorHandler.handleError(
          new Error('Passwords do not match'),
          {
            operation: 'password_confirmation_validation',
            component: 'AuthScreen',
          }
        );
        setLoading(false);
        return;
      }

      // Check if confirmation password is provided
      if (!confirmPassword.trim()) {
        await errorHandler.handleError(
          new Error('Please confirm your password'),
          {
            operation: 'password_confirmation_required',
            component: 'AuthScreen',
          }
        );
        setLoading(false);
        return;
      }
        
      try {
        // Send OTP for email verification first
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: false, // We'll create user after OTP verification
          }
        });
        
        if (error) {
          await errorHandler.handleError(error, {
            operation: 'email_otp_send',
            component: 'AuthScreen',
          });
        } else {
          // OTP sent successfully, show OTP input and start timer
          setVerificationEmail(email);
          setOtpSent(true);
          setResendTimer(60); // Start 60-second timer
          setCanResend(false);
          setLoading(false);
          return;
        }
      } catch (error) {
        await errorHandler.handleError(error, {
          operation: 'email_otp_send',
          component: 'AuthScreen',
        });
      }
    } else {
      // Login
      // Validate email using standard validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        await errorHandler.handleError(
          new Error(emailValidation.error || 'Please enter a valid email'),
          {
            operation: 'email_validation',
            component: 'AuthScreen',
          }
        );
        setLoading(false);
        return;
      }
        
      try {
        const { error } = await signIn(email, password);
        if (error) {
          await errorHandler.handleError(error, {
            operation: 'email_login',
            component: 'AuthScreen',
          });
        } else {
          // Get user and check if profile setup is needed
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const username = user.user_metadata?.username;
            const name = user.user_metadata?.full_name || user.user_metadata?.name;
            
            if (!username || !name) {
              // User needs to complete profile setup
              router.replace('/ProfileSetup');
            } else {
              // User has complete profile, proceed to main app
              router.replace('/');
            }
          }
        }
      } catch (error) {
        await errorHandler.handleError(error, {
          operation: 'email_login',
          component: 'AuthScreen',
        });
      }
    }
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'authentication_general',
        component: 'AuthScreen',
      });
    } finally {
    setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!networkMonitor.isOnline()) {
      await errorHandler.handleError(
        new Error('No internet connection available'),
        {
          operation: 'password_reset',
          component: 'AuthScreen',
        }
      );
      return;
    }

    setResetLoading(true);
    
    try {
      if (!resetEmail.trim()) {
        Alert.alert('Error', 'Please enter your email address');
        setResetLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'omnimart://reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Password Reset Email Sent',
          'Check your email for password reset instructions. You can close this window.',
          [
            {
              text: 'OK',
              onPress: () => {
                setForgotPasswordMode(false);
                setResetEmail('');
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const validateReferralCode = async () => {
    if (!referralCode.trim()) return;
    
    const normalized = referralCode.trim().toUpperCase();
    // Validating referral code
    
    setValidatingReferral(true);
    try {
      const referralData = await getReferralByCode(normalized);
      if (referralData) {
        setReferralCodeValid(true);
      } else {
        setReferralCodeValid(false);
      }
    } catch (error) {
      // Exception during referral validation
      setReferralCodeValid(false);
    } finally {
      setValidatingReferral(false);
    }
  };

  const clearInputs = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setReferralCode('');
    setReferralCodeValid(null);
    setValidatingReferral(false);
    setResetEmail('');
    setVerificationEmail('');
    setEmailVerificationMode(false);
    setOtpSent(false);
    setOtp('');
    setResendTimer(0);
    setCanResend(false);
  };

  const exitForgotPasswordMode = () => {
    setForgotPasswordMode(false);
    setResetEmail('');
  };


  const handleOtpVerification = async () => {
    if (!networkMonitor.isOnline()) {
      await errorHandler.handleError(
        new Error('No internet connection available'),
        {
          operation: 'otp_verification',
          component: 'AuthScreen',
        }
      );
      return;
    }

    if (!otp.trim() || otp.length !== 6) {
      await errorHandler.handleError(
        new Error('Please enter a valid 6-digit OTP'),
        {
          operation: 'otp_validation',
          component: 'AuthScreen',
        }
      );
      return;
    }

    setOtpLoading(true);
    
    try {
      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: otp,
        type: 'email'
      });

      if (error) {
        await errorHandler.handleError(error, {
          operation: 'otp_verification',
          component: 'AuthScreen',
        });
      } else {
        // OTP verified, now create the user account
        const { error: signupError } = await signUp(verificationEmail, password);
        
        if (signupError) {
          await errorHandler.handleError(signupError, {
            operation: 'email_signup_after_otp',
            component: 'AuthScreen',
          });
        } else {
          // Store referral code in user metadata for later processing
          if (referralCode.trim() && referralCodeValid) {
            try {
              await supabase.auth.updateUser({
                data: { referral_code: referralCode.trim() }
              });
            } catch (referralError) {
              // Failed to store referral code in metadata
            }
          }
          
          // Navigate to profile setup page for new users
          router.replace('/ProfileSetup');
          setOtpLoading(false);
          return;
        }
      }
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'otp_verification',
        component: 'AuthScreen',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!networkMonitor.isOnline()) {
      await errorHandler.handleError(
        new Error('No internet connection available'),
        {
          operation: 'resend_otp',
          component: 'AuthScreen',
        }
      );
      return;
    }

    setResendLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: verificationEmail,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) {
        await errorHandler.handleError(error, {
          operation: 'resend_otp',
          component: 'AuthScreen',
        });
      } else {
        // Restart the timer after successful resend
        setResendTimer(60);
        setCanResend(false);
        Alert.alert(
          'OTP Sent',
          'A new verification code has been sent to your email address.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'resend_otp',
        component: 'AuthScreen',
      });
    } finally {
      setResendLoading(false);
    }
  };


  // If in forgot password mode, show password reset UI
  if (forgotPasswordMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.brandName}>OmniMarketplace</Text>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email to receive password reset instructions
            </Text>
          </View>
            
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                placeholder="Enter your email"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, resetLoading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {resetLoading ? 'Sending...' : 'Send Reset Instructions'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={exitForgotPasswordMode}
                disabled={resetLoading}
              >
                <Text style={styles.switchButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brandName}>OmniMarketplace</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' 
              ? 'Sign in to continue to your account' 
              : 'Join our community and start trading'
            }
          </Text>
        </View>
        
        {/* Input Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                email && !validateEmail(email).isValid && styles.inputError
              ]}
              placeholderTextColor="#9CA3AF"
            />
            {email && !validateEmail(email).isValid && (
              <Text style={styles.errorText}>
                {validateEmail(email).error}
              </Text>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[
                styles.input,
                password && !validatePassword(password).isValid && styles.inputError
              ]}
              placeholderTextColor="#9CA3AF"
            />
            {password && !validatePassword(password).isValid && (
              <Text style={styles.errorText}>
                {validatePassword(password).error}
              </Text>
            )}
          </View>

          {/* Confirmation Password Field - Only show in signup mode */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={[
                  styles.input,
                  confirmPassword && password !== confirmPassword && styles.inputError,
                  confirmPassword && password === confirmPassword && styles.inputSuccess
                ]}
                placeholderTextColor="#9CA3AF"
              />
              {confirmPassword && (
                <Text style={[
                  styles.validationText,
                  password === confirmPassword ? styles.validationSuccess : styles.validationError
                ]}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Referral Code Field - Only show in signup mode */}
        {mode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
            <View style={styles.referralCodeRow}>
              <TextInput
                placeholder="Enter referral code"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                style={[styles.input, styles.referralCodeInput]}
                placeholderTextColor="#9CA3AF"
              />
              {referralCode.trim() && (
                <TouchableOpacity 
                  style={styles.validateButton}
                  onPress={validateReferralCode}
                  disabled={validatingReferral}
                >
                  <Text style={styles.validateButtonText}>
                    {validatingReferral ? '...' : '✓'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {referralCode.trim() && (
              <Text style={[
                styles.validationText,
                referralCodeValid === true && styles.validationSuccess,
                referralCodeValid === false && styles.validationError
              ]}>
                {referralCodeValid === true 
                  ? '✓ Valid referral code! You\'ll earn 100 OMNI bonus!'
                  : referralCodeValid === false 
                  ? '✗ Invalid referral code. Please check and try again.'
                  : 'You\'ll earn 100 OMNI bonus for using a referral code!'
                }
              </Text>
            )}
          </View>
        )}

        {/* OTP Input Field - Only show in signup mode after OTP is sent */}
        {mode === 'signup' && otpSent && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter verification code sent to {verificationEmail}</Text>
            <TextInput
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
              style={styles.otpInput}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, otpLoading && styles.buttonDisabled]}
              onPress={handleOtpVerification}
              disabled={otpLoading || otp.length !== 6}
            >
              <Text style={styles.primaryButtonText}>
                {otpLoading ? 'Verifying...' : 'Complete Sign Up'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, (!canResend || resendLoading) && styles.buttonDisabled]}
              onPress={handleResendOtp}
              disabled={!canResend || resendLoading}
            >
              <Text style={[styles.secondaryButtonText, (!canResend || resendLoading) && styles.buttonTextDisabled]}>
                {resendLoading 
                  ? 'Sending...' 
                  : canResend 
                    ? 'Resend Code' 
                    : `Resend Code (${resendTimer}s)`
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!otpSent && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password Link - Only show in login mode */}
            {mode === 'login' && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => setForgotPasswordMode(true)}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            clearInputs();
          }}
          disabled={loading}
        >
          <Text style={styles.switchButtonText}>
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default withErrorBoundary(AuthScreen, 'AuthScreen');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  inputSuccess: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 4,
  },
  validationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  validationSuccess: {
    color: '#10B981',
  },
  validationError: {
    color: '#EF4444',
  },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralCodeInput: {
    flex: 1,
  },
  validateButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#10B981',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  otpContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  otpInput: {
    width: '100%',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    textAlign: 'center',
    letterSpacing: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
}); 