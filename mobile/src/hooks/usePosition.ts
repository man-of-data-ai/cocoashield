import { useCallback } from 'react';
import * as Location from 'expo-location';
import type { Position } from '../api/capture';

export function usePosition() {
  return useCallback(async (): Promise<Position | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: coords.latitude, longitude: coords.longitude };
    } catch {
      return null;
    }
  }, []);
}
