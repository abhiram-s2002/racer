import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, MapPin, ShoppingBag, Gift, Star, Users, Apple, ShoppingCart, MessageCircle, Wrench, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  backgroundColor: string;
  textColor: string;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Fresh Groceries Delivered',
    description: 'Get fresh vegetables, fruits, dairy products, and daily essentials delivered from local farmers and vendors in your neighborhood.',
    icon: <Apple size={80} color="#10B981" />,
    backgroundColor: '#F0FDF4',
    textColor: '#0F172A',
  },
  {
    id: 2,
    title: 'Shop Local, Eat Fresh',
    description: 'Support local farmers and vendors. Find the freshest produce, organic vegetables, seasonal fruits, and farm-fresh dairy products near you.',
    icon: <ShoppingCart size={80} color="#10B981" />,
    backgroundColor: '#FEF3C7',
    textColor: '#0F172A',
  },
  {
    id: 3,
    title: 'Request What You Need',
    description: 'Need specific vegetables, fruits, or groceries? Post a request and let local farmers and vendors know what you\'re looking for. They\'ll respond with availability and prices.',
    icon: <MessageCircle size={80} color="#10B981" />,
    backgroundColor: '#F3E8FF',
    textColor: '#0F172A',
  },
  {
    id: 4,
    title: 'Trusted Community',
    description: 'Buy from verified local farmers and vendors. Rate and review to help others find the best fresh produce, quality vegetables, and reliable sellers in your area.',
    icon: <Star size={80} color="#10B981" />,
    backgroundColor: '#FEF2F2',
    textColor: '#0F172A',
  },
  {
    id: 5,
    title: 'List Your Services',
    description: 'Are you a service provider? List your services like home repairs, cleaning, tutoring, delivery, and more. Connect with customers in your area.',
    icon: <Wrench size={80} color="#10B981" />,
    backgroundColor: '#F0F9FF',
    textColor: '#0F172A',
  },
  {
    id: 6,
    title: 'Complete Local Marketplace',
    description: 'From fresh groceries to home services, find everything you need in one place. Buy, sell, request, and connect with your local community.',
    icon: <Plus size={80} color="#10B981" />,
    backgroundColor: '#FDF4FF',
    textColor: '#0F172A',
  },
  {
    id: 7,
    title: 'Earn While You Shop',
    description: 'Get rewarded for every purchase! Earn OMNI tokens that you can use for future fresh produce, vegetables, and daily essentials.',
    icon: <Gift size={80} color="#10B981" />,
    backgroundColor: '#ECFDF5',
    textColor: '#0F172A',
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/');
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
      router.replace('/');
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const renderSlide = (slide: OnboardingSlide) => (
    <View key={slide.id} style={[styles.slide, { backgroundColor: slide.backgroundColor }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {slide.icon}
        </View>
        <Text style={[styles.title, { color: slide.textColor }]}>
          {slide.title}
        </Text>
        <Text style={[styles.description, { color: slide.textColor }]}>
          {slide.description}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Skip Button */}
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {onboardingSlides.map(renderSlide)}
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {currentSlide < onboardingSlides.length - 1 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.getStartedButton} onPress={handleComplete}>
              <Text style={styles.getStartedButtonText}>Get Started</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#10B981',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#E2E8F0',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
