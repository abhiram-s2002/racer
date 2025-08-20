import React from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react-native';

interface ValidationDetails {
  fileSize?: number;
  fileSizeMB?: string;
  maxSize?: number;
  maxSizeMB?: string;
  fileExtension?: string;
  supportedFormats?: string[];
  dimensions?: {
    width: number;
    height: number;
  };
  aspectRatio?: string;
  status?: string;
}

interface ImageValidationAlertProps {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: ValidationDetails;
  onDismiss: () => void;
  onContinue?: () => void;
  onRetry?: () => void;
}

export default function ImageValidationAlert({
  isValid,
  errors,
  warnings,
  details,
  onDismiss,
  onContinue,
  onRetry
}: ImageValidationAlertProps) {
  
  const showAlert = () => {
    let title = '';
    let message = '';
    let buttons: any[] = [];

    if (isValid && warnings.length === 0) {
      // Perfect image
      title = '✅ Image Ready!';
      message = `Your image is perfect for upload!\n\n📊 Details:\n• Size: ${details.fileSizeMB}MB\n• Dimensions: ${details.dimensions?.width}x${details.dimensions?.height}px\n• Format: ${details.fileExtension?.toUpperCase()}`;
      buttons = [{ text: 'Continue', onPress: onContinue }];
    } else if (isValid && warnings.length > 0) {
      // Valid but with warnings
      title = '⚠️ Image Has Warnings';
      message = `Your image can be uploaded, but consider these improvements:\n\n${warnings.join('\n')}\n\n📊 Details:\n• Size: ${details.fileSizeMB}MB\n• Dimensions: ${details.dimensions?.width}x${details.dimensions?.height}px\n• Format: ${details.fileExtension?.toUpperCase()}`;
      buttons = [
        { text: 'Continue Anyway', onPress: onContinue },
        { text: 'Choose Different Image', onPress: onRetry, style: 'cancel' }
      ];
    } else {
      // Invalid image
      title = '❌ Image Cannot Be Uploaded';
      message = `Please fix these issues:\n\n${errors.join('\n')}\n\n📊 Details:\n• Size: ${details.fileSizeMB}MB (Max: ${details.maxSizeMB}MB)\n• Dimensions: ${details.dimensions?.width}x${details.dimensions?.height}px\n• Format: ${details.fileExtension?.toUpperCase()}\n• Supported: ${details.supportedFormats?.join(', ').toUpperCase()}`;
      buttons = [
        { text: 'Choose Different Image', onPress: onRetry },
        { text: 'Cancel', style: 'cancel' }
      ];
    }

    Alert.alert(title, message, buttons);
  };

  // Auto-show alert when component mounts
  React.useEffect(() => {
    showAlert();
  }, []);

  return null; // This component only shows alerts, no UI
}

// Helper function to show validation alert
export function showImageValidationAlert(
  isValid: boolean,
  errors: string[],
  warnings: string[],
  details: ValidationDetails,
  onContinue?: () => void,
  onRetry?: () => void
) {
  let title = '';
  let message = '';
  let buttons: any[] = [];

  if (isValid && warnings.length === 0) {
    // Perfect image
    title = '✅ Image Ready!';
    message = `Your image is perfect for upload!\n\n📊 Details:\n• Size: ${details.fileSizeMB}MB\n• Dimensions: ${details.dimensions?.width}x${details.dimensions?.height}px\n• Format: ${details.fileExtension?.toUpperCase()}`;
    buttons = [{ text: 'Continue', onPress: onContinue }];
  } else if (isValid && warnings.length > 0) {
    // Valid but with warnings
    title = '⚠️ Image Has Warnings';
    message = `Your image can be uploaded, but consider these improvements:\n\n${warnings.join('\n')}\n\n📊 Details:\n• Size: ${details.fileSizeMB}MB\n• Dimensions: ${details.dimensions?.width}x${details.dimensions?.height}px\n• Format: ${details.fileExtension?.toUpperCase()}`;
    buttons = [
      { text: 'Continue Anyway', onPress: onContinue },
      { text: 'Choose Different Image', onPress: onRetry, style: 'cancel' }
    ];
  } else {
    // Invalid image
    title = '❌ Image Cannot Be Uploaded';
    message = `Please fix these issues:\n\n${errors.join('\n')}\n\n📊 Details:\n• Size: ${details.fileSizeMB}MB (Max: ${details.maxSizeMB}MB)\n• Dimensions: ${details.dimensions?.width}x${details.dimensions?.height}px\n• Format: ${details.fileExtension?.toUpperCase()}\n• Supported: ${details.supportedFormats?.join(', ').toUpperCase()}`;
    buttons = [
      { text: 'Choose Different Image', onPress: onRetry },
      { text: 'Cancel', style: 'cancel' }
    ];
  }

  Alert.alert(title, message, buttons);
}

// Helper function for quick validation check
export function validateImageQuick(uri: string, type: 'listing' | 'avatar'): Promise<boolean> {
  return new Promise((resolve) => {
    (async () => {
    try {
      const extension = uri.split('.').pop()?.toLowerCase();
      const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      
      // Quick format check
      if (!extension || !supportedFormats.includes(extension)) {
        Alert.alert(
          '❌ Unsupported File Type',
          `Please select a valid image file:\n${supportedFormats.join(', ').toUpperCase()}\n\nYour file: ${extension?.toUpperCase() || 'unknown'}`,
          [{ text: 'OK' }]
        );
        resolve(false);
        return;
      }

      // Quick size check (approximate) - using basic file info
      const response = await fetch(uri);
      const fileInfo = { size: response.headers.get('content-length') ? parseInt(response.headers.get('content-length')!) : 0 };
      
      const maxSize = type === 'listing' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
      const fileSizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);

      if (fileInfo.size > maxSize) {
        Alert.alert(
          '❌ File Too Large',
          `Maximum file size is ${maxSizeMB}MB.\nYour file is ${fileSizeMB}MB.\n\nPlease choose a smaller image.`,
          [{ text: 'OK' }]
        );
        resolve(false);
        return;
      }

      resolve(true);
    } catch (error) {
      Alert.alert(
        '❌ Validation Error',
        'Unable to validate image. Please try a different file.',
        [{ text: 'OK' }]
      );
      resolve(false);
    }
    })();
  });
} 