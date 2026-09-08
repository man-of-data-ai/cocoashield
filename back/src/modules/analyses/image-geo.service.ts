import { Injectable, Logger } from '@nestjs/common';
import * as exifr from 'exifr';
import { GeolocationQuality } from './entities/analysis-image.entity';

export interface ImageGps {
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  gimbalYaw: number | null;
  gimbalPitch: number | null;
  gimbalRoll: number | null;
  captureTimestamp: Date | null;
  geolocationQuality: GeolocationQuality;
  geolocationPrecisionM: number | null;
}

function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class ImageGeoService {
  private readonly logger = new Logger(ImageGeoService.name);

  async extractGps(filePath: string): Promise<ImageGps | null> {
    try {
      const metadata = await exifr.parse(filePath, { gps: true, exif: true, xmp: true, tiff: true });
      const fallbackGps = metadata?.latitude != null && metadata?.longitude != null ? null : await exifr.gps(filePath);
      const latitude = finite(metadata?.latitude ?? metadata?.GPSLatitude ?? fallbackGps?.latitude);
      const longitude = finite(metadata?.longitude ?? metadata?.GPSLongitude ?? fallbackGps?.longitude);
      if (latitude === null || longitude === null) return null;

      const rtkFlag = finite(metadata?.RtkFlag ?? metadata?.['drone-dji:RtkFlag']);
      const geolocationQuality = rtkFlag === 50
        ? GeolocationQuality.RTK_FIX
        : rtkFlag === 34
          ? GeolocationQuality.RTK_FLOAT
          : GeolocationQuality.GNSS_ONLY;
      const precision = geolocationQuality === GeolocationQuality.RTK_FIX
        ? 0.03
        : geolocationQuality === GeolocationQuality.RTK_FLOAT
          ? 0.2
          : 0.5;
      const rawTimestamp = metadata?.DateTimeOriginal ?? metadata?.CreateDate ?? null;
      const captureTimestamp = rawTimestamp instanceof Date ? rawTimestamp : rawTimestamp ? new Date(rawTimestamp) : null;

      return {
        latitude,
        longitude,
        altitudeM: finite(metadata?.RelativeAltitude ?? metadata?.['drone-dji:RelativeAltitude'] ?? metadata?.GPSAltitude),
        gimbalYaw: finite(metadata?.GimbalYawDegree ?? metadata?.['drone-dji:GimbalYawDegree']),
        gimbalPitch: finite(metadata?.GimbalPitchDegree ?? metadata?.['drone-dji:GimbalPitchDegree']),
        gimbalRoll: finite(metadata?.GimbalRollDegree ?? metadata?.['drone-dji:GimbalRollDegree']),
        captureTimestamp: captureTimestamp && Number.isFinite(captureTimestamp.getTime()) ? captureTimestamp : null,
        geolocationQuality,
        geolocationPrecisionM: precision,
      };
    } catch (error) {
      this.logger.warn(`Could not read EXIF/XMP geolocation from ${filePath}: ${(error as Error).message}`);
      return null;
    }
  }
}
