import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { signUp, signIn } from '@/utils/auth';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);
    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) Alert.alert('Sign Up Error', error.message);
      else {
        // Upsert user profile after signup
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('users')
            .upsert([
              {
                id: user.id,
                name: user.user_metadata.full_name || user.email,
                avatar_url: user.user_metadata.avatar_url || null,
              }
            ]);
          // Navigate to profile setup page for new users
          router.replace('/ProfileSetup');
          setLoading(false);
          return;
        }
        Alert.alert('Success', 'Check your email for confirmation!');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) Alert.alert('Login Error', error.message);
      else {
        // Upsert user profile after login
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('users')
            .upsert([
              {
                id: user.id,
                name: user.user_metadata.full_name || user.email,
                avatar_url: user.user_metadata.avatar_url || null,
              }
            ]);
        }
        Alert.alert('Success', 'Logged in!');
        router.replace('/');
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>
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
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
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