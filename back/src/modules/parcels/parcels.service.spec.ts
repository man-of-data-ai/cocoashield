jest.mock('better-auth/crypto', () => ({ hashPassword: jest.fn(), verifyPassword: jest.fn() }));

import { BadRequestException } from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { UserRole } from '../users/entities/user-profile.entity';

const AT_PARCEL = { latitude: 5.78, longitude: -6.65 };

function build(overrides: { containing?: unknown; defaultParcelId?: string | null; accessible?: Record<string, unknown> }) {
  const parcelRepository = {
    findContaining: jest.fn().mockResolvedValue(overrides.containing ?? null),
    findByIdAccessible: jest.fn(async (id: string) => overrides.accessible?.[id] ?? null),
  };
  const usersService = {
    getAccessScope: jest.fn().mockResolvedValue({
      userId: 'u1',
      role: UserRole.OPERATEUR_TERRAIN,
      isPlatformAdmin: false,
      organizationIds: ['org1'],
      primaryOrganizationId: 'org1',
    }),
    ensureProfile: jest.fn().mockResolvedValue({ defaultParcelId: overrides.defaultParcelId ?? null }),
  };
  const service = new ParcelsService(
    parcelRepository as never,
    { log: jest.fn() } as never,
    usersService as never,
  );
  return { service, parcelRepository, usersService };
}

describe('ParcelsService.resolveForCapture', () => {
  it('takes the parcel whose boundary contains the capture', async () => {
    const { service, parcelRepository } = build({ containing: { id: 'p-field' } });

    await expect(service.resolveForCapture('u1', AT_PARCEL)).resolves.toBe('p-field');
    expect(parcelRepository.findContaining).toHaveBeenCalledWith(
      AT_PARCEL.latitude,
      AT_PARCEL.longitude,
      'u1',
      ['org1'],
      false,
    );
  });

  it('falls back to the profile default when the position is outside every parcel', async () => {
    const { service } = build({ containing: null, defaultParcelId: 'p-default', accessible: { 'p-default': { id: 'p-default' } } });

    await expect(service.resolveForCapture('u1', AT_PARCEL)).resolves.toBe('p-default');
  });

  it('uses the profile default when no position is given', async () => {
    const { service, parcelRepository } = build({ defaultParcelId: 'p-default', accessible: { 'p-default': { id: 'p-default' } } });

    await expect(service.resolveForCapture('u1', null)).resolves.toBe('p-default');
    expect(parcelRepository.findContaining).not.toHaveBeenCalled();
  });

  it('refuses when there is no position match and no default', async () => {
    const { service } = build({ containing: null, defaultParcelId: null });

    await expect(service.resolveForCapture('u1', AT_PARCEL)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a default parcel that is outside the account scope', async () => {
    const { service } = build({ containing: null, defaultParcelId: 'p-foreign', accessible: {} });

    await expect(service.resolveForCapture('u1', AT_PARCEL)).rejects.toBeInstanceOf(BadRequestException);
  });
});
