jest.mock('better-auth/crypto', () => ({ hashPassword: jest.fn(), verifyPassword: jest.fn() }));

import { AnalysesService } from './analyses.service';
import { AnalysisImageSource } from './entities/analysis-image.entity';
import { AnalysisResult } from './entities/analysis.entity';

const FILES = [{ path: '/tmp/a.jpg' }] as never;

function build() {
  const parcelsService = { resolveForCapture: jest.fn().mockResolvedValue('p-resolved') };
  const service = new AnalysesService(
    null as never,
    null as never,
    parcelsService as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );
  const create = jest.spyOn(service, 'create').mockResolvedValue({ id: 'a1' } as never);
  return { service, parcelsService, create };
}

describe('AnalysesService.createFromCapture', () => {
  it('resolves the parcel from the first declared position and creates there', async () => {
    const { service, parcelsService, create } = build();
    const metas = [
      { source: AnalysisImageSource.MOBILE, result: AnalysisResult.INFECTED, latitude: 5.78, longitude: -6.65 },
    ];

    await expect(service.createFromCapture('u1', FILES, metas)).resolves.toEqual({ id: 'a1' });
    expect(parcelsService.resolveForCapture).toHaveBeenCalledWith('u1', { latitude: 5.78, longitude: -6.65 });
    expect(create).toHaveBeenCalledWith('p-resolved', 'u1', FILES, metas, undefined, undefined, undefined);
  });

  it('resolves without a position when no image declares one', async () => {
    const { service, parcelsService } = build();

    await service.createFromCapture('u1', FILES, [{ source: AnalysisImageSource.MOBILE }]);
    expect(parcelsService.resolveForCapture).toHaveBeenCalledWith('u1', null);
  });

  it('ignores a half-declared position', async () => {
    const { service, parcelsService } = build();

    await service.createFromCapture('u1', FILES, [{ source: AnalysisImageSource.MOBILE, latitude: 5.78 }]);
    expect(parcelsService.resolveForCapture).toHaveBeenCalledWith('u1', null);
  });
});
