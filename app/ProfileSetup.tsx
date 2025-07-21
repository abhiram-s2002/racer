import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import { upsertUserProfile } from '@/app/_layout';
import { awardWelcomeAchievements } from '@/utils/rewardsSupabase';

function getRandomSeed() {
  return Math.random().toString(36).substring(2, 10);
}



// eslint-disable-next-line no-unused-vars, no-undef
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;

export default function ProfileSetup() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(getRandomSeed());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const avatar_url = `https://api.dicebear.com/7.x/pixel-art/png?seed=${avatarSeed}`;

  const handleSubmit = async () => {
    if (!username.trim() || !name.trim()) {
      Alert.alert('Required', 'Please enter both a username and your name.');
      return;
    }
    setLoading(true);
    // Update user metadata in Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      Alert.alert('Error', 'Could not get current user.');
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({
      data: { username, name, avatar_url }
    });
    if (updateError) {
      Alert.alert('Error', updateError.message || 'Failed to update profile.');
      setLoading(false);
      return;
    }
    // Fetch the latest user object after metadata update
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    if (updatedUser) {
      await upsertUserProfile({ ...updatedUser, user_metadata: { ...updatedUser.user_metadata, username, name, avatar_url } });
      
      // Award welcome achievements
      await awardWelcomeAchievements(username);
      
      Alert.alert('Profile Saved', 'Your profile has been saved to the database. Welcome to OmniMarketplace!');
    }
    setLoading(false);
    // Always go to HomeScreen after saving
    setTimeout(() => {
      router.replace('/');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.label}>Avatar</Text>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatar_url }} style={styles.avatar} />
        <TouchableOpacity style={styles.randomizeButton} onPress={() => setAvatarSeed(getRandomSeed())}>
          <Text style={styles.randomizeButtonText}>Randomize Avatar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder="Choose a username"
      />
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#1E293B',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
    marginTop: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
  },
  randomizeButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  randomizeButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    marginTop: 32,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 