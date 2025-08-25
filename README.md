# GeoMart

A React Native Expo project with the latest system versions and dependencies.

## System Versions

### Node.js Environment
- **Node.js**: v22.17.0
- **npm**: 10.9.2
- **npx**: 10.9.2 (comes with npm)

### Key Project Dependencies

#### Core Framework
- **Expo**: 53.0.0 (latest SDK)
- **React**: 19.0.0
- **React Native**: 0.79.1
- **TypeScript**: 5.8.3

#### Navigation & Routing
- **Expo Router**: 5.0.2
- **React Navigation**: 7.0.14 (native) + 7.2.0 (bottom-tabs)

#### UI & Icons
- **Expo Vector Icons**: 14.1.0
- **Lucide React Native**: 0.475.0
- **Expo Blur**: 14.1.3
- **Expo Linear Gradient**: 14.1.3

#### Storage & Data
- **AsyncStorage**: 2.2.0
- **React Native Super Grid**: 6.0.1
- **Supabase**: 2.50.5

#### Media & Hardware
- **Expo Camera**: 16.1.5
- **Expo Image Picker**: 16.1.4
- **Expo Location**: 18.1.6
- **Expo Haptics**: 14.1.3

#### Development Tools
- **Babel Core**: 7.25.2
- **React Native Gesture Handler**: 2.24.0
- **React Native Reanimated**: 3.17.4

## Critical Dependency Resolutions

### AJV (Another JSON Validator) ✅ RESOLVED
- **Primary Version**: 8.17.1 (via overrides)
- **Used by**: schema-utils@4.3.0 (via expo-router)
- **Secondary Version**: 6.12.6
- **Status**: Both versions are compatible and work together

### Expo Font ✅ RESOLVED
- **Version**: 13.2.2 (part of Expo SDK 53)
- **Compatibility**: Fully compatible with React Native 0.79.1 and React 19
- **Used by**: @expo/vector-icons and other Expo modules

## Installation

1. **Install Node.js v22.17.0**
   ```bash
   # Using nvm (recommended)
   nvm install 22.17.0
   nvm use 22.17.0
   
   # Or download directly from nodejs.org
   ```

2. **Verify versions**
   ```bash
   node --version  # Should show v22.17.0
   npm --version   # Should show 10.9.2
   npx --version   # Should show 10.9.2
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

- `app/` - Expo Router app directory
- `components/` - Reusable React components
- `utils/` - Utility functions
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `assets/` - Static assets (images, fonts, etc.)

## Available Scripts

- `npm run dev` - Start Expo development server
- `npm run build:web` - Build for web platform
- `npm run type-check` - Run TypeScript type checking

## Notes

- This project uses Expo SDK 53.0.0
- React Native New Architecture is enabled
- TypeScript strict mode is enabled
- TypeScript is configured for type safety and code quality
- Supabase integration for backend services
- AJV compatibility issues are resolved with version overrides
