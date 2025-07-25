import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { validatePassword, validateEmail, validatePhoneNumber, validateUsername, getPasswordStrength } from '@/utils/validation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

interface ValidationField {
  value: string;
  isValid: boolean;
  error: string;
  isTouched: boolean;
}

interface SignupValidationProps {
  email: string;
  phoneNumber: string;
  password: string;
  username?: string;
  onValidationChange: (isValid: boolean) => void;
}

export default function SignupValidation({ 
  email, 
  phoneNumber, 
  password, 
  username = '', 
  onValidationChange 
}: SignupValidationProps) {
  const [fields, setFields] = useState<Record<string, ValidationField>>({
    email: { value: '', isValid: false, error: '', isTouched: false },
    phoneNumber: { value: '', isValid: false, error: '', isTouched: false },
    password: { value: '', isValid: false, error: '', isTouched: false },
    username: { value: '', isValid: false, error: '', isTouched: false },
  });

  const [passwordStrength, setPasswordStrength] = useState(getPasswordStrength(''));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Update field values
    setFields(prev => ({
      ...prev,
      email: { ...prev.email, value: email },
      phoneNumber: { ...prev.phoneNumber, value: phoneNumber },
      password: { ...prev.password, value: password },
      username: { ...prev.username, value: username },
    }));
  }, [email, phoneNumber, password, username]);

  useEffect(() => {
    // Validate all fields
    const newFields = { ...fields };
    let allValid = true;

    // Email validation
    if (email) {
      const emailValidation = validateEmail(email);
      newFields.email = {
        value: email,
        isValid: emailValidation.isValid,
        error: emailValidation.error || '',
        isTouched: true,
      };
      if (!emailValidation.isValid) allValid = false;
    }

    // Phone validation
    if (phoneNumber) {
      const phoneValidation = validatePhoneNumber(phoneNumber);
      newFields.phoneNumber = {
        value: phoneNumber,
        isValid: phoneValidation.isValid,
        error: phoneValidation.error || '',
        isTouched: true,
      };
      if (!phoneValidation.isValid) allValid = false;
    }

    // Password validation
    if (password) {
      const passwordValidation = validatePassword(password);
      newFields.password = {
        value: password,
        isValid: passwordValidation.isValid,
        error: passwordValidation.error || '',
        isTouched: true,
      };
      if (!passwordValidation.isValid) allValid = false;
      setPasswordStrength(getPasswordStrength(password));
    }

    // Username validation (if provided)
    if (username) {
      const usernameValidation = validateUsername(username);
      newFields.username = {
        value: username,
        isValid: usernameValidation.isValid,
        error: usernameValidation.error || '',
        isTouched: true,
      };
      if (!usernameValidation.isValid) allValid = false;
    }

    setFields(newFields);
    onValidationChange(allValid);

    // Animate validation results
    Animated.timing(fadeAnim, {
      toValue: allValid ? 1 : 0.8,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [email, phoneNumber, password, username]);

  const ValidationItem = ({ 
    field, 
    label, 
    icon 
  }: { 
    field: ValidationField; 
    label: string; 
    icon: React.ReactNode;
  }) => {
    if (!field.isTouched) return null;

    return (
      <Animated.View style={[styles.validationItem, { opacity: fadeAnim }]}>
        <View style={styles.validationIcon}>
          {field.isValid ? (
            <CheckCircle size={16} color="#22C55E" />
          ) : (
            <XCircle size={16} color="#EF4444" />
          )}
        </View>
        <View style={styles.validationContent}>
          <Text style={styles.validationLabel}>{label}</Text>
          {!field.isValid && field.error && (
            <Text style={styles.validationError}>{field.error}</Text>
          )}
        </View>
      </Animated.View>
    );
  };

  const PasswordStrengthMeter = () => {
    if (!password) return null;

    const strengthBars = Array.from({ length: 5 }, (_, i) => (
      <View
        key={i}
        style={[
          styles.strengthBar,
          {
            backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#E2E8F0',
          },
        ]}
      />
    ));

    return (
      <Animated.View style={[styles.strengthMeter, { opacity: fadeAnim }]}>
        <View style={styles.strengthHeader}>
          <Text style={styles.strengthLabel}>Password Strength</Text>
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
            {passwordStrength.label}
          </Text>
        </View>
        <View style={styles.strengthBars}>{strengthBars}</View>
        <View style={styles.requirementsList}>
          <RequirementItem 
            met={password.length >= 8} 
            text="At least 8 characters" 
          />
          <RequirementItem 
            met={/[A-Z]/.test(password)} 
            text="One uppercase letter" 
          />
          <RequirementItem 
            met={/[a-z]/.test(password)} 
            text="One lowercase letter" 
          />
          <RequirementItem 
            met={/\d/.test(password)} 
            text="One number" 
          />
          <RequirementItem 
            met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)} 
            text="One special character" 
          />
        </View>
      </Animated.View>
    );
  };

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <View style={styles.requirementItem}>
      {met ? (
        <CheckCircle size={14} color="#22C55E" />
      ) : (
        <AlertCircle size={14} color="#94A3B8" />
      )}
      <Text style={[styles.requirementText, { color: met ? '#22C55E' : '#94A3B8' }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ValidationItem 
        field={fields.email} 
        label="Email Address" 
        icon={<CheckCircle size={16} color="#22C55E" />}
      />
      <ValidationItem 
        field={fields.phoneNumber} 
        label="Phone Number" 
        icon={<CheckCircle size={16} color="#22C55E" />}
      />
      <ValidationItem 
        field={fields.password} 
        label="Password" 
        icon={<CheckCircle size={16} color="#22C55E" />}
      />
      {username && (
        <ValidationItem 
          field={fields.username} 
          label="Username" 
          icon={<CheckCircle size={16} color="#22C55E" />}
        />
      )}
      <PasswordStrengthMeter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  validationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  validationContent: {
    flex: 1,
  },
  validationLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 2,
  },
  validationError: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
  },
  strengthMeter: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  strengthText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  requirementsList: {
    gap: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
}); 