import { resolvePosition } from './image-geo.service';
import { GeolocationQuality } from './entities/analysis-image.entity';

const EXIF = {
  latitude: 5.78,
  longitude: -6.65,
  altitudeM: 120,
  gimbalYaw: null,
  gimbalPitch: null,
  gimbalRoll: null,
  captureTimestamp: null,
  geolocationQuality: GeolocationQuality.RTK_FIX,
  geolocationPrecisionM: 0.03,
};

describe('resolvePosition', () => {
  it('keeps the EXIF position when the file carries one', () => {
    expect(resolvePosition(EXIF, { latitude: 1, longitude: 2 })).toBe(EXIF);
  });

  it('uses the declared position when the file carries none', () => {
    expect(resolvePosition(null, { latitude: 5.78, longitude: -6.65 })).toMatchObject({
      latitude: 5.78,
      longitude: -6.65,
      geolocationQuality: GeolocationQuality.MANUAL,
    });
  });

  it('returns nothing when neither source has a position', () => {
    expect(resolvePosition(null, undefined)).toBeNull();
    expect(resolvePosition(null, {})).toBeNull();
  });

  it('rejects a half-declared or non-numeric position', () => {
    expect(resolvePosition(null, { latitude: 5.78 })).toBeNull();
    expect(resolvePosition(null, { latitude: 'nord' as never, longitude: -6.65 })).toBeNull();
  });

  it('rejects coordinates outside the earth', () => {
    expect(resolvePosition(null, { latitude: 91, longitude: -6.65 })).toBeNull();
    expect(resolvePosition(null, { latitude: 5.78, longitude: 181 })).toBeNull();
  });
});
