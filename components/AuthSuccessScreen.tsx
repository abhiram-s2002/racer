import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface AuthSuccessScreenProps {
  title?: string;
  message?: string;
  onComplete?: () => void;
  autoComplete?: boolean;
  autoCompleteDelay?: number;
}

export default function AuthSuccessScreen({ 
  title = "Success!",
  message = "Your account has been created successfully.",
  onComplete,
  autoComplete = true,
  autoCompleteDelay = 2000
}: AuthSuccessScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Check mark animation with delay
    setTimeout(() => {
      Animated.spring(checkScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto complete after delay
    if (autoComplete && onComplete) {
      setTimeout(() => {
        onComplete();
      }, autoCompleteDelay);
    }
  }, [autoComplete, onComplete, autoCompleteDelay]);

  const float = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <LinearGradient
      colors={['#22C55E', '#16A34A', '#15803D']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Animated background elements */}
      <Animated.View style={[styles.floatingCircle, { opacity: fadeAnim }]} />
      <Animated.View style={[styles.floatingCircle2, { opacity: fadeAnim }]} />
      <Animated.View style={[styles.floatingCircle3, { opacity: fadeAnim }]} />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: float }
              ]
            }
          ]}
        >
          <Sparkles size={48} color="#fff" />
        </Animated.View>

        <Animated.View
          style={[
            styles.checkContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: checkScaleAnim },
                { translateY: float }
              ]
            }
          ]}
        >
          <CheckCircle size={64} color="#fff" />
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float }]
            }
          ]}
        >
          {title}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.message,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float }]
            }
          ]}
        >
          {message}
        </Animated.Text>

        {/* Success particles */}
        <Animated.View
          style={[
            styles.particlesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float }]
            }
          ]}
        >
          <View style={styles.particle} />
          <View style={styles.particle} />
          <View style={styles.particle} />
          <View style={styles.particle} />
          <View style={styles.particle} />
        </Animated.View>

        {!autoComplete && onComplete && (
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: float }]
              }
            ]}
          >
            <View style={styles.continueButton}>
              <ArrowRight size={20} color="#667eea" />
              <Text style={styles.continueButtonText}>Continue</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: height * 0.1,
    right: -50,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: height * 0.2,
    left: -30,
  },
  floatingCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: height * 0.6,
    right: width * 0.1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Bold',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  particlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  particle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 3,
  },
  buttonContainer: {
    marginTop: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
}); 