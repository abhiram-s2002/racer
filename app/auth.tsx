import React, { useState } from 'react';
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
  const router = useRouter();
  const errorHandler = ErrorHandler.getInstance();

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
        const { error } = await signUp(email, password);
        if (error) {
          await errorHandler.handleError(error, {
            operation: 'email_signup',
            component: 'AuthScreen',
          });
        } else {
          // Store referral code in user metadata for later processing
          if (referralCode.trim() && referralCodeValid) {
            try {
              await supabase.auth.updateUser({
                data: { referral_code: referralCode.trim() }
              });
              // Referral code stored in user metadata
            } catch (referralError) {
              // Failed to store referral code in metadata
            }
          }
          
          // Navigate to profile setup page for new users
          router.replace('/ProfileSetup');
          setLoading(false);
          return;
        }
      } catch (error) {
        await errorHandler.handleError(error, {
          operation: 'email_signup',
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
  };

  const exitForgotPasswordMode = () => {
    setForgotPasswordMode(false);
    setResetEmail('');
  };

  // If in forgot password mode, show password reset UI
  if (forgotPasswordMode) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
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
            placeholderTextColor="#94A3B8"
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
        <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>
        
        {/* Input Fields */}
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#94A3B8"
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
          placeholderTextColor="#94A3B8"
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
              placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  button: {
    width: '100%',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  switchButton: {
    marginTop: 2,
    padding: 6,
  },
  switchButtonText: {
    color: '#22C55E',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  confirmPasswordContainer: {
    width: '100%',
    marginBottom: 16,
  },
  passwordMatchText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  passwordMatchSuccess: {
    color: '#22C55E',
  },
  passwordMatchError: {
    color: '#EF4444',
  },
  passwordLengthText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  passwordLengthError: {
    color: '#EF4444',
  },
  passwordLengthSuccess: {
    color: '#22C55E',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  inputSuccess: {
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  forgotPasswordButton: {
    marginTop: 8,
    marginBottom: 16,
    padding: 6,
  },
  forgotPasswordText: {
    color: '#64748B',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },
  referralCodeContainer: {
    width: '100%',
    marginBottom: 16,
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
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  referralCodeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginTop: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  validCodeText: {
    color: '#10B981',
  },
  invalidCodeText: {
    color: '#EF4444',
  },
}); 