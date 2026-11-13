import { NativeModules, Platform } from 'react-native';

const PRODUCTION_API_URL = 'https://studywallah.onrender.com';

function inferLanApiUrl() {
  if (Platform.OS === 'web') {
    // In web, use relative URLs (empty string) so API requests target the same origin and port (/api/v1/...)
    return '';
  }

  // If running in development with Metro
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      const scriptURL = NativeModules?.SourceCode?.getConstants?.()?.scriptURL || NativeModules?.SourceCode?.scriptURL;
      if (typeof scriptURL === 'string' && scriptURL.startsWith('http')) {
        const withoutProto = scriptURL.split('://')[1] || '';
        const host = withoutProto.split(':')[0];
        if (host) {
          return `http://${host}:8080`;
        }
      }
    } catch {
      // Fallback below
    }
  }

  return PRODUCTION_API_URL;
}

const envUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.trim()
  : '';

export const API_BASE_URL = (envUrl || inferLanApiUrl()).replace(/\/+$/, '');
