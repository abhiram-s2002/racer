import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ScrollView,
  BackHandler,
  Platform,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, MapPin, Phone, Mail, Settings, CircleHelp as HelpCircle, FileText, LogOut, CreditCard as Edit3, CircleCheck as CheckCircle, Circle as XCircle, ArrowRight, Lock, Flag, EyeOff, UserX, Package, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signOut } from '@/utils/auth';
import defaultAvatar from '../../assets/images/icon.png';
import { supabase } from '@/utils/supabaseClient';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { Button } from 'react-native';
import { validatePhoneNumber, formatPhoneNumberForDisplay } from '@/utils/validation';
import RatingDisplay from '@/components/RatingDisplay';
import VerificationBadge from '@/components/VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAvatarSource } from '@/utils/avatarUtils';
import { useCachedProfile } from '@/hooks/useCachedProfile';





function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  // Use cached profile hook for better performance
  const {
    profileData,
    notifications,
    loading: profileLoading,
    error: profileError,
    refreshProfile,
    updateProfile,
    updateNotifications,
  } = useCachedProfile();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: '',
    email: '',
    phone: '',
    locationDisplay: '',
    bio: '',
    avatar: '',
    isAvailable: true,
    username: '',
  });
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const mapRef = useRef<MapView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Handle back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      // For now, just let the default behavior handle it
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  // Profile data is now automatically loaded by the useCachedProfile hook

  // When setting location (GPS or map), reverse geocode and store display name
  const setLocationFromCoords = async (coords: { latitude: number; longitude: number }) => {
    try {
      // Getting location for coordinates
      const [place] = await Location.reverseGeocodeAsync(coords);
      
      const address = place
        ? [place.name, place.street, place.city, place.region, place.country].filter(Boolean).join(', ')
        : `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      
      setEditProfile(prev => ({
        ...prev,
        locationDisplay: address,
      }));
    } catch (error) {
      // Silent error handling
    }
  };

  // Remove automatic GPS location detection - now manual only

  // Profile image upload function with 95% compression
  const uploadProfileImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload profile images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Start with highest quality, we'll compress it ourselves
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setUploadingImage(true);
      const imageUri = result.assets[0].uri;

      // Get current user's access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        Alert.alert('Not logged in', 'You must be logged in to upload images.');
        return;
      }

      // Compress image to 70% compression (30% quality) - standard quality for profiles
      const compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 300, height: 300 } }], // Square 300x300 for avatars
        { 
          compress: 0.3, // 70% compression (30% quality) - standard profile quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      // Create unique filename for avatar
      const filename = `avatar_${Date.now()}.jpg`;
      
      // Upload to avatars bucket
      const response = await fetch(
        `https://vroanjodovwsyydxrmma.supabase.co/storage/v1/object/avatars/${filename}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: (() => {
            const formData = new FormData();
            formData.append('file', {
              uri: compressedImage.uri,
              name: filename,
              type: 'image/jpeg',
            } as any);
            return formData;
          })(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        return;
      }

      const avatarUrl = `https://vroanjodovwsyydxrmma.supabase.co/storage/v1/object/public/avatars/${filename}`;

      // Delete old avatar image if it exists and is from our avatars bucket
      const currentAvatar = profileData.avatar;
      if (currentAvatar && currentAvatar.includes('avatars/')) {
        try {
          // Extract filename from current avatar URL
          const oldFilename = currentAvatar.split('avatars/')[1];
          if (oldFilename) {
            await fetch(
              `https://vroanjodovwsyydxrmma.supabase.co/storage/v1/object/avatars/${oldFilename}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              }
            );
          }
        } catch (deleteError) {
          // Don't fail the upload if deletion fails - just log it
          console.warn('Failed to delete old avatar:', deleteError);
        }
      }

      // Update user profile with new avatar URL
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          Alert.alert('Error', 'Failed to save profile image. Please try again.');
          return;
        }

        // Update profile using cached hook
        await updateProfile({ avatar: avatarUrl });

        Alert.alert('Success', 'Profile image updated successfully!');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleAvailability = async () => {
    const newAvailability = !profileData.isAvailable;
    await updateProfile({ isAvailable: newAvailability });
  };


  // Save notification settings using cached hook
  const saveNotificationSettings = async (newSettings: typeof notifications) => {
    setSavingNotifications(true);
    try {
      await updateNotifications(newSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleEditProfile = () => {
    // When opening edit mode, show the raw phone number (not formatted) for editing
    setEditProfile({
      ...profileData,
      phone: profileData.phone || '' // Keep raw digits for editing
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    // Update profile in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Validate phone number before saving
      let phoneValue = null;
      if (editProfile.phone && editProfile.phone.trim() !== '') {
        let phoneToValidate = editProfile.phone.trim();
        
        // Auto-prepend "91" if user enters 10 digits (common Indian mobile format)
        if (phoneToValidate.length === 10 && /^\d{10}$/.test(phoneToValidate)) {
          phoneToValidate = '91' + phoneToValidate;
        }
        
        const phoneValidation = validatePhoneNumber(phoneToValidate);
        
        if (!phoneValidation.isValid) {
          Alert.alert('Invalid Phone Number', phoneValidation.error || 'Please enter a valid phone number');
          return;
        }
        phoneValue = phoneValidation.sanitizedValue || phoneToValidate;
      }

      const upsertData = {
        id: user.id,
        username: profileData.username, // Always send the existing username
        name: editProfile.name,
        email: user.email,
        phone: phoneValue, // Use validated phone number
        location_display: editProfile.locationDisplay, // Use location_display for now
        bio: editProfile.bio,
        // Don't overwrite avatar_url - keep existing uploaded image
        isAvailable: editProfile.isAvailable,
      };
      
      if (!upsertData.username) {
        Alert.alert('Profile Error', 'Username is missing. Please contact support.');
        return;
      }
      const { error } = await supabase.from('users').upsert([upsertData]);
      if (error) {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        return;
      }
      // Refresh profile data
      await refreshProfile();
    }
    setEditModalVisible(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Logout Error', error.message);
            } else {
              router.replace('/auth');
            }
          }
        }
      ]
    );
  };



  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  // Show loading state
  if (profileLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#64748B' }}>Loading profile...</Text>
      </View>
    );
  }

  // Show error state
  if (profileError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#EF4444', marginBottom: 16 }}>Error loading profile</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
          onPress={refreshProfile}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editProfile.name}
                onChangeText={text => setEditProfile(prev => ({ ...prev, name: text }))}
              />
              <Text style={styles.inputLabel}>Username</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: '#F3F4F6',
                      color: '#A1A1AA',
                      borderColor: '#E5E7EB',
                      borderStyle: 'dashed',
                    },
                  ]}
                  value={editProfile.username}
                  editable={false}
                  autoCapitalize="none"
                  placeholderTextColor="#A1A1AA"
                />
                <View style={{ marginLeft: 6 }}>
                  <Lock size={16} color="#A1A1AA" />
                </View>
              </View>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: '#F3F4F6',
                      color: '#A1A1AA',
                      borderColor: '#E5E7EB',
                      borderStyle: 'dashed',
                    },
                  ]}
                value={editProfile.email}
                  editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
                  placeholderTextColor="#A1A1AA"
              />
                <View style={{ marginLeft: 6 }}>
                  <Lock size={16} color="#A1A1AA" />
                </View>
              </View>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editProfile.phone}
                onChangeText={text => setEditProfile(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                placeholder="7306519350 (10 digits) or 917306519350 (12 digits)"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={editProfile.locationDisplay}
                onChangeText={text => setEditProfile(prev => ({ ...prev, locationDisplay: text }))}
                placeholder="Enter your location (e.g., Bangalore, India)"
                placeholderTextColor="#94A3B8"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#22C55E', borderRadius: 8, padding: 12, marginRight: 8 }} 
                  onPress={() => setMapModalVisible(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Select on Map</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: gpsLoading ? '#94A3B8' : '#64748B', 
                    borderRadius: 8, 
                    padding: 12 
                  }} 
                  disabled={gpsLoading}
                  onPress={async () => {
                    setGpsLoading(true);
                    try {
                      // Requesting location permission
                      const { status } = await Location.requestForegroundPermissionsAsync();
                      
                      if (status !== 'granted') {
                        Alert.alert(
                          'Permission Denied', 
                          'Location permission is required to auto-fill your location. Please enable location access in your device settings.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => {
                              // In a real app, you'd open device settings
                              // User wants to open settings
                            }}
                          ]
                        );
                        return;
                      }
                      
                      const location = await Location.getCurrentPositionAsync({ 
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                        distanceInterval: 10,
                      });
                      
                      await setLocationFromCoords(location.coords);
                    } catch (error) {
                      Alert.alert(
                        'Location Error', 
                        'Failed to get your current location. Please check your GPS settings or try again.',
                        [
                          { text: 'OK', style: 'default' },
                          { text: 'Try Again', onPress: () => {
                            // Retry the GPS functionality
                            // User wants to retry GPS
                          }}
                        ]
                      );
                    } finally {
                      setGpsLoading(false);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                    {gpsLoading ? 'Getting Location...' : 'Use GPS'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={editProfile.bio}
                onChangeText={text => setEditProfile(prev => ({ ...prev, bio: text }))}
                multiline
                maxLength={200}
              />
              <Text style={styles.inputLabel}>Profile Image</Text>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Image source={getAvatarSource(profileData.avatar)} style={styles.avatar} />
                <TouchableOpacity 
                  style={[styles.uploadButton, uploadingImage && styles.uploadButtonDisabled]} 
                  onPress={uploadProfileImage}
                  disabled={uploadingImage}
                >
                  <Camera size={16} color="#22C55E" />
                  <Text style={styles.uploadButtonText}>
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Map picker modal with header and instructions */}
      <Modal visible={mapModalVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#22C55E', paddingTop: 48, paddingBottom: 16, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Select Your Location</Text>
            <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>Tap anywhere on the map to choose a spot</Text>
          </View>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: selectedCoords ? selectedCoords.latitude : 37.7749,
              longitude: selectedCoords ? selectedCoords.longitude : -122.4194,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e: { nativeEvent: { coordinate: { latitude: number, longitude: number } } }) => setSelectedCoords(e.nativeEvent.coordinate)}
          >
            {selectedCoords && <Marker coordinate={selectedCoords} />}
          </MapView>
          {/* My Location Floating Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 100,
              right: 20,
              backgroundColor: '#22C55E',
              borderRadius: 24,
              padding: 14,
              zIndex: 20,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={async () => {
              try {
                // Getting current location for map
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Denied', 'Location permission is required to show your current location on the map.');
                  return;
                }
                
                const location = await Location.getCurrentPositionAsync({ 
                  accuracy: Location.Accuracy.Balanced,
                  timeInterval: 10000,
                  distanceInterval: 10,
                });
                
                setSelectedCoords(location.coords);
                mapRef.current?.animateToRegion({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              } catch (error) {
                Alert.alert('Location Error', 'Failed to get your current location for the map.');
              }
            }}
          >
            <MapPin size={22} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>My Location</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: '#fff' }}>
            <Button
              title="Cancel"
              color="#64748B"
              onPress={() => setMapModalVisible(false)}
            />
            <TouchableOpacity
              style={{ backgroundColor: '#22C55E', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32 }}
              onPress={async () => {
                if (selectedCoords) {
                  await setLocationFromCoords(selectedCoords);
                }
                setMapModalVisible(false);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image source={getAvatarSource(profileData.avatar)} style={styles.avatar} />
              <TouchableOpacity 
                style={[styles.cameraButton, uploadingImage && styles.cameraButtonDisabled]} 
                onPress={uploadProfileImage}
                disabled={uploadingImage}
              >
                <Camera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profileData.name || 'No name set'}</Text>
                {isUserVerified(profileData) && <VerificationBadge size="medium" />}
              </View>
              <Text style={styles.username}>@{profileData.username || 'username'}</Text>
              
              {/* User Rating Display */}
              <View style={styles.ratingRow}>
                <RatingDisplay 
                  username={profileData.username}
                  showDetails={false}
                  size="medium"
                  showCount={true}
                  showAverage={true}
                />
              </View>
              
              <View style={styles.locationRow}>
                <MapPin size={16} color="#64748B" />
                <Text style={styles.location}>{profileData.locationDisplay ? profileData.locationDisplay : 'No location set'}</Text>
              </View>
              <View style={styles.availabilityRow}>
                <View style={[styles.availabilityBadge, profileData.isAvailable ? styles.available : styles.unavailable]}>
                  {profileData.isAvailable ? (
                    <CheckCircle size={16} color="#22C55E" />
                  ) : (
                    <XCircle size={16} color="#EF4444" />
                  )}
                  <Text style={[styles.availabilityText, profileData.isAvailable ? styles.availableText : styles.unavailableText]}>
                    {profileData.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Edit3 size={16} color="#22C55E" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        {/* Removed as per edit hint */}

        {/* Bio Section */}
        <View style={styles.bioSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profileData.bio || 'No bio set'}</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactItem}>
            <MapPin size={20} color="#64748B" />
            <Text style={styles.contactText}>{profileData.locationDisplay ? profileData.locationDisplay : 'No location set'}</Text>
          </View>
          <View style={styles.contactItem}>
            <Mail size={20} color="#64748B" />
            <Text style={styles.contactText}>{profileData.email}</Text>
          </View>
          <View style={styles.contactItem}>
            <Phone size={20} color="#64748B" />
                            <Text style={styles.contactText}>{formatPhoneNumberForDisplay(profileData.phone)}</Text>
          </View>
        </View>

        {/* Phone Privacy Management */}
        <TouchableOpacity 
          style={styles.phoneSharingSection}
          onPress={() => router.push('/phone-privacy')}
          activeOpacity={0.7}
        >
          <View style={styles.phonePrivacyContent}>
            <View style={styles.phonePrivacyLeft}>
              <Phone size={20} color="#22C55E" />
              <View style={styles.phonePrivacyTextContainer}>
                <Text style={styles.phonePrivacyTitle}>Phone Privacy</Text>
                <Text style={styles.phonePrivacyDescription}>
                  Manage how your phone number is shared with other users
                </Text>
              </View>
            </View>
            <ArrowRight size={20} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Verification Section */}
        <TouchableOpacity 
          style={styles.verificationSection}
          onPress={() => router.push('/verification')}
          activeOpacity={0.7}
        >
          <View style={styles.verificationContent}>
            <View style={styles.verificationLeft}>
              <Shield size={20} color="#22C55E" />
              <View style={styles.verificationTextContainer}>
                <Text style={styles.verificationTitle}>Verification</Text>
                <Text style={styles.verificationDescription}>
                  {isUserVerified(profileData) ? 'View your verification status' : 'Get verified to build trust'}
                </Text>
              </View>
            </View>
            <ArrowRight size={20} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Availability Toggle */}
        <View style={styles.availabilitySection}>
          <Text style={styles.sectionTitle}>Availability Status</Text>
          <View style={styles.availabilityToggle}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Available for business</Text>
              <Text style={styles.toggleDescription}>
                Turn this off when you&apos;re not available to respond to messages
              </Text>
            </View>
            <Switch
              value={profileData.isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#E2E8F0', true: '#22C55E' }}
              thumbColor={profileData.isAvailable ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.notificationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            {savingNotifications && (
              <Text style={styles.savingIndicator}>Saving...</Text>
            )}
          </View>
          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationLabel}>New Messages</Text>
              <Text style={styles.notificationDescription}>Get notified when you receive new messages</Text>
            </View>
            <Switch
              value={notifications.newMessages}
              onValueChange={async (value) => {
                const newSettings = { ...notifications, newMessages: value };
                await saveNotificationSettings(newSettings);
              }}
              trackColor={{ false: '#E2E8F0', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationLabel}>Listing Updates</Text>
              <Text style={styles.notificationDescription}>Get notified about your listing activity</Text>
            </View>
            <Switch
              value={notifications.listingUpdates}
              onValueChange={async (value) => {
                const newSettings = { ...notifications, listingUpdates: value };
                await saveNotificationSettings(newSettings);
              }}
              trackColor={{ false: '#E2E8F0', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationLabel}>Marketing Emails</Text>
              <Text style={styles.notificationDescription}>Receive promotional emails and offers</Text>
            </View>
            <Switch
              value={notifications.marketingEmails}
              onValueChange={async (value) => {
                const newSettings = { ...notifications, marketingEmails: value };
                await saveNotificationSettings(newSettings);
              }}
              trackColor={{ false: '#E2E8F0', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* My Listings */}
        <TouchableOpacity 
          style={styles.listingsSection}
          onPress={() => router.push('/my-listings')}
          activeOpacity={0.7}
        >
          <View style={styles.listingsContent}>
            <View style={styles.listingsLeft}>
              <Package size={20} color="#22C55E" />
              <View style={styles.listingsTextContainer}>
                <Text style={styles.listingsTitle}>Manage Listings</Text>
                <Text style={styles.listingsDescription}>
                  View and manage your marketplace listings
                </Text>
              </View>
            </View>
            <ArrowRight size={20} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => router.push('/settings')}
          >
            <Settings size={20} color="#64748B" />
            <Text style={styles.quickActionText}>App Settings</Text>
            <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => Alert.alert('Help & Support', 'Contact us at support@omnimarketplace.com for assistance.')}
          >
            <HelpCircle size={20} color="#64748B" />
            <Text style={styles.quickActionText}>Help & Support</Text>
            <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => router.push('/terms')}
          >
            <FileText size={20} color="#64748B" />
            <Text style={styles.quickActionText}>Terms & Privacy</Text>
            <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          {/* New Quick Actions for Content Management */}
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => router.push('/reported-content')}
          >
            <Flag size={20} color="#EF4444" />
            <Text style={styles.quickActionText}>Reported Content</Text>
            <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => router.push('/hidden-listings')}
          >
            <EyeOff size={20} color="#F59E0B" />
            <Text style={styles.quickActionText}>Hidden Listings</Text>
            <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => router.push('/blocked-users')}
          >
            <UserX size={20} color="#DC2626" />
            <Text style={styles.quickActionText}>Blocked Users</Text>
            <ArrowRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/privacy')}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>How we protect your data</Text>
            </View>
            <ArrowRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>




    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  ratingRow: {
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 4,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  available: {
    backgroundColor: '#DCFCE7',
  },
  unavailable: {
    backgroundColor: '#FEE2E2',
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  availableText: {
    color: '#16A34A',
  },
  unavailableText: {
    color: '#DC2626',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },

  bioSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    marginLeft: 12,
  },
  availabilitySection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneSharingSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phonePrivacyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phonePrivacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phonePrivacyTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  phonePrivacyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  phonePrivacyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  verificationSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verificationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  verificationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  listingsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listingsTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  listingsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  listingsDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  notificationSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savingIndicator: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickActionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 30,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    marginHorizontal: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%', // Limit modal height to 80% of screen
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  saveButtonText: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },
  // New styles for Legal Section
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  uploadButton: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  uploadButtonText: {
    color: '#22C55E',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  cameraButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});

export default withErrorBoundary(ProfileScreen, 'ProfileScreen');