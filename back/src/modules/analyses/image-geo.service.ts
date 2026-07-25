import { Injectable, Logger } from '@nestjs/common';
import * as exifr from 'exifr';

export interface ImageGps {
  latitude: number;
  longitude: number;
}

@Injectable()
export class ImageGeoService {
  private readonly logger = new Logger(ImageGeoService.name);

  async extractGps(filePath: string): Promise<ImageGps | null> {
    try {
      const gps = await exifr.gps(filePath);
      if (!gps) {
        return null;
      }
      return { latitude: gps.latitude, longitude: gps.longitude };
    } catch (error) {
      this.logger.warn(
        `Could not read EXIF GPS from ${filePath}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
