import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { signUp, signIn } from '@/utils/auth';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { getReferralByCode, createReferral, awardReferralBonus } from '@/utils/rewardsSupabase';

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
      // Check password length
      if (password.length < 6) {
        await errorHandler.handleError(
          new Error('Password must be at least 6 characters long'),
          {
            operation: 'password_length_validation',
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

      if (!email.trim()) {
        await errorHandler.handleError(
          new Error('Email is required'),
          {
            operation: 'email_signup_validation',
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
      if (!email.trim()) {
        await errorHandler.handleError(
          new Error('Email is required'),
          {
            operation: 'email_login_validation',
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
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>GeoMart</Text>
        </View>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email to receive password reset instructions
        </Text>
          
          <TextInput
            placeholder="Email Address"
            value={resetEmail}
            onChangeText={setResetEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#767676"
          />

          <TouchableOpacity
            style={[styles.button, resetLoading && styles.buttonDisabled]}
            onPress={handleForgotPassword}
            disabled={resetLoading}
          >
            <Text style={styles.buttonText}>
              {resetLoading ? 'Sending...' : 'Send Reset Instructions'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={exitForgotPasswordMode}
            disabled={resetLoading}
          >
            <Text style={styles.switchButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>GeoMart</Text>
        </View>
        <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
        
        {/* Input Fields */}
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#767676"
        />
        
        <TextInput
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[
            styles.input,
            mode === 'signup' && password.length > 0 && password.length < 6 && styles.inputError,
            mode === 'signup' && password.length >= 6 && styles.inputSuccess
          ]}
          placeholderTextColor="#767676"
        />
        {password.length > 0 && mode === 'signup' && (
          <Text style={[
            styles.passwordLengthText,
            password.length < 6 ? styles.passwordLengthError : styles.passwordLengthSuccess
          ]}>
            {password.length < 6 
              ? `✗ Password must be at least 6 characters (${password.length}/6)`
              : `✓ Password length is good (${password.length} characters)`
            }
          </Text>
        )}
        {password.length > 0 && mode === 'login' && (
          <Text style={styles.passwordLengthText}>
            Password length: {password.length} characters
          </Text>
        )}

        {/* Confirmation Password Field - Only show in signup mode */}
        {mode === 'signup' && (
          <View style={styles.confirmPasswordContainer}>
            <TextInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={[
                styles.input,
                confirmPassword && password !== confirmPassword && styles.inputError,
                confirmPassword && password === confirmPassword && styles.inputSuccess
              ]}
              placeholderTextColor="#767676"
            />
            {confirmPassword && (
              <Text style={[
                styles.passwordMatchText,
                password === confirmPassword ? styles.passwordMatchSuccess : styles.passwordMatchError
              ]}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </Text>
            )}
          </View>
        )}

        {/* Referral Code Field - Only show in signup mode */}
        {mode === 'signup' && (
          <View style={styles.referralCodeContainer}>
            <View style={styles.referralCodeRow}>
              <TextInput
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                style={[styles.input, styles.referralCodeInput]}
                placeholderTextColor="#767676"
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
                styles.referralCodeText,
                referralCodeValid === true && styles.validCodeText,
                referralCodeValid === false && styles.invalidCodeText
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
              placeholderTextColor="#767676"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, otpLoading && styles.buttonDisabled]}
              onPress={handleOtpVerification}
              disabled={otpLoading || otp.length !== 6}
            >
              <Text style={styles.buttonText}>
                {otpLoading ? 'Verifying...' : 'Complete Sign Up'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resendButton, (!canResend || resendLoading) && styles.resendButtonDisabled]}
              onPress={handleResendOtp}
              disabled={!canResend || resendLoading}
            >
              <Text style={[styles.resendButtonText, (!canResend || resendLoading) && styles.resendButtonTextDisabled]}>
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
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {mode === 'login' ? 'Login' : 'Verify Email'}
            </Text>
          </TouchableOpacity>
        )}

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
        
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            clearInputs();
          }}
          disabled={loading}
        >
          <Text style={styles.switchButtonText}>
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default withErrorBoundary(AuthScreen, 'AuthScreen');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#22C55E',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#0F1111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    width: '100%',
    fontSize: 13,
    color: '#0F1111',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A6A6A6',
    height: 31,
  },
  button: {
    width: '100%',
    backgroundColor: '#22C55E',
    paddingVertical: 8,
    borderRadius: 3,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E7E34',
  },
  buttonDisabled: {
    backgroundColor: '#A7F3D0',
    borderColor: '#86EFAC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
  },
  switchButton: {
    marginTop: 2,
    padding: 6,
  },
  switchButtonText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '400',
  },
  confirmPasswordContainer: {
    width: '100%',
    marginBottom: 14,
  },
  passwordMatchText: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  passwordMatchSuccess: {
    color: '#22C55E',
  },
  passwordMatchError: {
    color: '#EF4444',
  },
  passwordLengthText: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  passwordLengthError: {
    color: '#EF4444',
  },
  passwordLengthSuccess: {
    color: '#22C55E',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  inputSuccess: {
    borderColor: '#22C55E',
    borderWidth: 1,
  },
  forgotPasswordButton: {
    marginTop: 8,
    marginBottom: 16,
    padding: 6,
  },
  forgotPasswordText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '400',
  },
  referralCodeContainer: {
    width: '100%',
    marginBottom: 14,
  },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralCodeInput: {
    flex: 1,
  },
  validateButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 3,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
  },
  referralCodeText: {
    fontSize: 12,
    color: '#22C55E',
    marginTop: 6,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
  validCodeText: {
    color: '#22C55E',
  },
  invalidCodeText: {
    color: '#EF4444',
  },
  emailText: {
    fontWeight: '600',
    color: '#22C55E',
  },
  verificationInstructions: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  otpContainer: {
    width: '100%',
    marginTop: 10,
  },
  otpLabel: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 10,
  },
  otpInput: {
    width: '100%',
    fontSize: 18,
    color: '#0F1111',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#A6A6A6',
    textAlign: 'center',
    letterSpacing: 2,
  },
  resendButton: {
    marginTop: 10,
    padding: 8,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '400',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonTextDisabled: {
    color: '#999999',
  },
}); 