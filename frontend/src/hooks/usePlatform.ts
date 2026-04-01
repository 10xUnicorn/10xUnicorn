/**
 * usePlatform — Feature gates for web vs native
 */
import { Platform } from 'react-native';

export function usePlatform() {
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isNative = isIOS || isAndroid;

  return {
    isWeb,
    isIOS,
    isAndroid,
    isNative,
    // Feature flags
    canImportContacts: isNative, // expo-contacts is native-only
    canPickImage: true, // web has file input, native has image picker
    canPushNotify: isNative, // expo-notifications is native-only
    canUseNativeDriver: isNative, // Animated useNativeDriver only on native
    canUseSafeArea: true, // react-native-safe-area-context works on web
    canUseHaptics: isNative,
  };
}

// Static version for non-hook contexts
export const PlatformFlags = {
  isWeb: Platform.OS === 'web',
  isNative: Platform.OS !== 'web',
  canUseNativeDriver: Platform.OS !== 'web',
};
