import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: `${API_BASE_URL}/v1/auth`,
  plugins: [
    expoClient({
      scheme: 'cocoashield',
      storagePrefix: 'cocoashield',
      storage: SecureStore,
    }),
  ],
});
