import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { signUp, signIn, signUpWithPhone, signInWithPhone } from '@/utils/auth';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { validatePhoneNumber } from '@/utils/validation';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { withErrorBoundary } from '@/components/ErrorBoundary';

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
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
      if (authMethod === 'email') {
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
        // Phone signup
        if (!phone.trim()) {
            await errorHandler.handleError(
              new Error('Phone number is required'),
              {
                operation: 'phone_signup_validation',
                component: 'AuthScreen',
              }
            );
          setLoading(false);
          return;
        }
        
        const validation = validatePhoneNumber(phone);
        if (!validation.isValid) {
            await errorHandler.handleError(
              new Error(validation.error || 'Invalid phone number'),
              {
                operation: 'phone_validation',
                component: 'AuthScreen',
              }
            );
          setLoading(false);
          return;
        }
        
          try {
        const { error } = await signUpWithPhone(phone, password);
            if (error) {
              await errorHandler.handleError(error, {
                operation: 'phone_signup',
                component: 'AuthScreen',
              });
            } else {
          // Navigate to profile setup page for new users
          router.replace('/ProfileSetup');
          setLoading(false);
          return;
        }
          } catch (error) {
            await errorHandler.handleError(error, {
              operation: 'phone_signup',
              component: 'AuthScreen',
            });
          }
        }
    } else {
      // Login
      if (authMethod === 'email') {
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
      } else {
        // Phone login
        if (!phone.trim()) {
            await errorHandler.handleError(
              new Error('Phone number is required'),
              {
                operation: 'phone_login_validation',
                component: 'AuthScreen',
              }
            );
          setLoading(false);
          return;
        }
        
        const validation = validatePhoneNumber(phone);
        if (!validation.isValid) {
            await errorHandler.handleError(
              new Error(validation.error || 'Invalid phone number'),
              {
                operation: 'phone_validation',
                component: 'AuthScreen',
              }
            );
          setLoading(false);
          return;
        }
        
          try {
        const { error } = await signInWithPhone(phone, password);
            if (error) {
              await errorHandler.handleError(error, {
                operation: 'phone_login',
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
              operation: 'phone_login',
              component: 'AuthScreen',
            });
          }
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

  const clearInputs = () => {
    setEmail('');
    setPhone('');
    setPassword('');
  };

  const handleAuthMethodChange = (method: 'email' | 'phone') => {
    setAuthMethod(method);
    clearInputs();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>
        
        {/* Auth Method Toggle */}
        <View style={styles.authMethodContainer}>
          <TouchableOpacity
            style={[styles.authMethodButton, authMethod === 'email' && styles.authMethodActive]}
            onPress={() => handleAuthMethodChange('email')}
            disabled={loading}
          >
            <Text style={[styles.authMethodText, authMethod === 'email' && styles.authMethodTextActive]}>
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authMethodButton, authMethod === 'phone' && styles.authMethodActive]}
            onPress={() => handleAuthMethodChange('phone')}
            disabled={loading}
          >
            <Text style={[styles.authMethodText, authMethod === 'phone' && styles.authMethodTextActive]}>
              Phone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Fields */}
        {authMethod === 'email' ? (
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#94A3B8"
          />
        ) : (
          <TextInput
            placeholder="Phone Number (+91XXXXXXXXXX)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#94A3B8"
          />
        )}
        
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>
        </TouchableOpacity>
        
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
  authMethodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
  },
  authMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  authMethodActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authMethodText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  authMethodTextActive: {
    color: '#22C55E',
    fontFamily: 'Inter-SemiBold',
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
}); 