#!/usr/bin/env node

/**
 * Analytics Setup Script for Racer Marketplace App
 * This script helps set up Google Analytics and Sentry for production monitoring
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

console.log('🚀 Setting up Analytics for Racer Marketplace App...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully');
  } else {
    console.log('⚠️  env.example not found. Please create .env file manually.');
  }
}

console.log('\n📊 Analytics Setup Instructions:\n');

console.log('1. 🌐 GOOGLE ANALYTICS:');
console.log('   - Go to https://analytics.google.com/');
console.log('   - Create a new property for "Racer Marketplace"');
console.log('   - Get your Measurement ID (format: G-XXXXXXXXXX)');
console.log('   - Add to .env: EXPO_PUBLIC_ANALYTICS_ID=G-XXXXXXXXXX\n');

console.log('2. 🐛 SENTRY ERROR MONITORING:');
console.log('   - Go to https://sentry.io/');
console.log('   - Create a new project for "Racer Marketplace"');
console.log('   - Get your DSN (format: https://xxxxx@xxxxx.ingest.sentry.io/xxxxx)');
console.log('   - Add to .env: EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx\n');

console.log('3. 📱 APP STORE CONNECT:');
console.log('   - Go to https://appstoreconnect.apple.com/');
console.log('   - Create a new app: "Racer Marketplace"');
console.log('   - Bundle ID: com.racermarketplace.app');
console.log('   - Platform: iOS\n');

console.log('4. 🤖 GOOGLE PLAY CONSOLE:');
console.log('   - Go to https://play.google.com/console/');
console.log('   - Create a new app: "Racer Marketplace"');
console.log('   - Package name: com.racermarketplace.app');
console.log('   - Platform: Android\n');

console.log('5. 🏗️  BUILD COMMANDS:');
console.log('   iOS: npx eas build --platform ios --profile production');
console.log('   Android: npx eas build --platform android --profile production\n');

console.log('6. 📤 SUBMIT COMMANDS:');
console.log('   iOS: npx eas submit --platform ios');
console.log('   Android: npx eas submit --platform android\n');

console.log('📋 Next Steps:');
console.log('   1. Set up analytics accounts and add credentials to .env');
console.log('   2. Create app store accounts');
console.log('   3. Prepare app store assets (screenshots, descriptions)');
console.log('   4. Build and test the app');
console.log('   5. Submit to app stores');

console.log('\n✅ Analytics setup guide completed!'); 