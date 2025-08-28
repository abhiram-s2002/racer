import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import { upsertUserProfile } from '@/app/_layout';
import { awardWelcomeAchievements } from '@/utils/rewardsSupabase';
import { User, RefreshCw, ArrowRight, Sparkles, Phone } from 'lucide-react-native';

import { validatePhoneNumber, validateUsername } from '@/utils/validation';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { withErrorBoundary } from '@/components/ErrorBoundary';

  const { height } = Dimensions.get('window');

function getRandomSeed() {
  return Math.random().toString(36).substring(2, 10);
}




function ProfileSetup() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('91');
  const [avatarSeed, setAvatarSeed] = useState(getRandomSeed());
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));




  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const router = useRouter();
  const errorHandler = ErrorHandler.getInstance();
  const insets = useSafeAreaInsets();

  const avatar_url = `https://api.dicebear.com/7.x/pixel-art/png?seed=${avatarSeed}`;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Check for existing phone number
    checkExistingPhone();
  }, []);

  const checkExistingPhone = async () => {
    try {
      // Check network connectivity first
      if (!networkMonitor.isOnline()) {
        await errorHandler.handleError(
          new Error('No internet connection available'),
          {
            operation: 'check_existing_phone',
            component: 'ProfileSetup',
          },
          false // Don't show alert for network issues during startup
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User data loaded successfully
        
        // Check if user already has a phone number in the database
        const { data: userProfile } = await supabase
          .from('users')
          .select('phone')
          .eq('id', user.id)
          .single();
        
        if (userProfile?.phone) {
          // Found existing phone in database
          setPhoneNumber(userProfile.phone);
        } else {
          // New user, starting with 91 prefix
          setPhoneNumber('91');
        }
      }
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'check_user_auth_method',
        component: 'ProfileSetup',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // Check network connectivity first
      if (!networkMonitor.isOnline()) {
        await errorHandler.handleError(
          new Error('No internet connection available'),
          {
            operation: 'profile_submit',
            component: 'ProfileSetup',
          }
        );
        return;
      }

      if (!username.trim() || !name.trim()) {
        await errorHandler.handleError(
          new Error('Please enter both a username and your name'),
          {
            operation: 'profile_validation',
            component: 'ProfileSetup',
          }
        );
        return;
      }

      // Validate username
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        await errorHandler.handleError(
          new Error(usernameValidation.error || 'Please enter a valid username'),
          {
            operation: 'username_validation',
            component: 'ProfileSetup',
          }
        );
        return;
      }

      // Phone number is always required and must be complete
      if (!phoneNumber.trim() || phoneNumber === '91' || phoneNumber.length < 12) {
        await errorHandler.handleError(
          new Error('Please enter your complete 10-digit mobile number'),
          {
            operation: 'phone_validation',
            component: 'ProfileSetup',
          }
        );
        return;
      }

      // Validate phone number format (must be 12 digits starting with 91)
      const phoneValidation = validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        await errorHandler.handleError(
          new Error(phoneValidation.error || 'Please enter a valid 10-digit mobile number'),
          {
            operation: 'phone_validation',
            component: 'ProfileSetup',
          }
        );
        return;
      }

      setLoading(true);
      
      // Update user metadata in Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        await errorHandler.handleError(
          new Error('Could not get current user'),
          {
            operation: 'get_user',
            component: 'ProfileSetup',
          }
        );
        setLoading(false);
        return;
      }
      

      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { username, name, avatar_url }
      });
      if (updateError) {
        await errorHandler.handleError(updateError, {
          operation: 'update_user_metadata',
          component: 'ProfileSetup',
        });
        setLoading(false);
        return;
      }

      // Fetch the latest user object after metadata update
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        // Submitting profile with user data
        
        // Update user profile with phone number included
        const profileResult = await upsertUserProfile({ 
          ...updatedUser, 
          phone: phoneNumber, // Pass the phone number as entered
          user_metadata: { ...updatedUser.user_metadata, username, name, avatar_url } 
        });
        
        if (profileResult && profileResult.error) {
          await errorHandler.handleError(
            new Error('Failed to save profile. Please try again'),
            {
              operation: 'upsert_user_profile',
              component: 'ProfileSetup',
            }
          );
          setLoading(false);
          return;
        }
        
        // Wait a moment for the database transaction to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Award welcome achievements
        try {
          await awardWelcomeAchievements(username);
        } catch (achievementError) {
          await errorHandler.handleSilentError(achievementError, {
            operation: 'award_welcome_achievements',
            component: 'ProfileSetup',
          });
          // Don't fail the profile setup if achievements fail
        }
        
        // Profile setup completed successfully
        Alert.alert('Success', 'Profile setup completed! Welcome to OmniMarketplace!');
        setTimeout(() => {
          router.replace('/');
        }, 500);
      }
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'profile_submit_general',
        component: 'ProfileSetup',
      });
    } finally {
      setLoading(false);
    }
  };



  const randomizeAvatar = () => {
    setAvatarSeed(getRandomSeed());
  };

  const getPhoneLabel = () => {
    return 'Phone Number (Required)';
  };

  const getPhoneHelperText = () => {
    return 'Enter your 10-digit mobile number (91 is automatically added)';
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim() || username.length < 3) return;
    
    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
      
      if (data) {
        setUsernameError('Username is already taken');
      } else if (error && error.code === 'PGRST116') {
        // No rows returned - username is available
        setUsernameError('');
      } else {
        // Error checking username
      }
    } catch (error) {
              // Error checking username availability
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const validateUsernameRealTime = (text: string) => {
    if (!text.trim()) {
      setUsernameError('');
      return;
    }
    
    const validation = validateUsername(text);
    if (!validation.isValid) {
      setUsernameError(validation.error || 'Invalid username');
    } else {
      // Clear any existing timeout
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
      
      // Set a new timeout to check availability after user stops typing
      const timeout = setTimeout(() => {
        checkUsernameAvailability(text);
      }, 500); // Wait 500ms after user stops typing
      
      setUsernameCheckTimeout(timeout);
    }
  };

  return (
    <>
      <KeyboardAvoidingView 
        style={[styles.container, { paddingTop: insets.top }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.gradient}>
            <Animated.View 
              style={[
                styles.content,
                { opacity: fadeAnim }
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Sparkles size={24} color="#22C55E" />
                </View>
                <Text style={styles.welcomeText}>Complete Your Profile</Text>
              </View>

              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <Image source={{ uri: avatar_url }} style={styles.avatar} />
                <TouchableOpacity 
                  style={styles.randomizeButton} 
                  onPress={randomizeAvatar}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={14} color="#22C55E" />
                  <Text style={styles.randomizeButtonText}>Randomize</Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, usernameError && styles.inputError]}
                      value={username}
                      onChangeText={(text) => {
                        const lowerText = text.toLowerCase();
                        setUsername(lowerText);
                        validateUsernameRealTime(lowerText);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Choose a unique username"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  {isCheckingUsername ? (
                    <Text style={styles.checkingText}>Checking availability...</Text>
                  ) : usernameError ? (
                    <Text style={styles.errorText}>{usernameError}</Text>
                  ) : username && username.length >= 3 && !usernameError ? (
                    <Text style={styles.successText}>✓ Username is available</Text>
                  ) : (
                    <Text style={styles.helperText}>
                      Use 3-30 characters, lowercase letters, numbers, _ or -
                    </Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{getPhoneLabel()}</Text>
                  <View style={[styles.inputWrapper, phoneError && styles.inputError]}>
                    <Phone size={18} color="#94A3B8" style={styles.inputIcon} />
                    <Text style={styles.prefixText}>+91</Text>
                    <TextInput
                      style={styles.input}
                      value={phoneNumber.substring(2)}
                      onChangeText={(text) => {
                        // Only allow digits and limit to 10 characters
                        const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
                        const newPhoneNumber = '91' + digitsOnly;
                        setPhoneNumber(newPhoneNumber);
                        
                        // Validate phone number in real-time
                        if (newPhoneNumber.length < 12) {
                          setPhoneError('Please enter your complete 10-digit mobile number');
                        } else {
                          const validation = validatePhoneNumber(newPhoneNumber);
                          if (!validation.isValid) {
                            setPhoneError(validation.error || 'Invalid phone number');
                          } else {
                            setPhoneError('');
                          }
                        }
                      }}
                      placeholder="7306519350"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />
                  </View>
                  {phoneError ? (
                    <Text style={styles.errorText}>{phoneError}</Text>
                  ) : (
                    <Text style={styles.helperText}>
                      {getPhoneHelperText()}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={handleSubmit} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Complete Setup</Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


    </>
  );
}

export default withErrorBoundary(ProfileSetup, 'ProfileSetup');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40, // Add bottom padding to ensure button is visible
  },
  gradient: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: height - 100, // Ensure minimum height for content
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#22C55E',
    marginBottom: 8,
  },
  randomizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  randomizeButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
  },
  formSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    fontFamily: 'Inter-Medium',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
    fontFamily: 'Inter-SemiBold',
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  checkingText: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  successText: {
    fontSize: 11,
    color: '#22C55E',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  prefixText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    marginRight: 8,
  },
});