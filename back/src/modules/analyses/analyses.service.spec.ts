jest.mock('better-auth/crypto', () => ({ hashPassword: jest.fn(), verifyPassword: jest.fn() }));

import { AnalysesService } from './analyses.service';
import { AnalysisImageSource } from './entities/analysis-image.entity';
import { AnalysisResult } from './entities/analysis.entity';

const FILES = [{ path: '/tmp/a.jpg' }] as never;

function build(exif: { latitude: number; longitude: number } | null = null) {
  const parcelsService = { resolveForCapture: jest.fn().mockResolvedValue('p-resolved') };
  const imageGeoService = { extractGps: jest.fn().mockResolvedValue(exif) };
  const service = new AnalysesService(
    null as never,
    null as never,
    parcelsService as never,
    imageGeoService as never,
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

  it('resolves from the position the image will be plotted at, not the declared one', async () => {
    const { service, parcelsService } = build({ latitude: 5.79, longitude: -2.11 });

    await service.createFromCapture('u1', FILES, [
      { source: AnalysisImageSource.MOBILE, latitude: 5.35, longitude: -4.0 },
    ]);

    expect(parcelsService.resolveForCapture).toHaveBeenCalledWith('u1', {
      latitude: 5.79,
      longitude: -2.11,
    });
  });

  it('ignores a half-declared position', async () => {
    const { service, parcelsService } = build();

    await service.createFromCapture('u1', FILES, [{ source: AnalysisImageSource.MOBILE, latitude: 5.78 }]);
    expect(parcelsService.resolveForCapture).toHaveBeenCalledWith('u1', null);
  });
});

describe('AnalysesService.create', () => {
  it('keeps the on-device verdict apart and still queues the server analysis', async () => {
    const images: Array<Record<string, unknown>> = [];
    const imageRepo = {
      create: jest.fn(async (data: Record<string, unknown>) => {
        images.push(data);
        return { id: `img${images.length}`, ...data };
      }),
    };
    const queue = { add: jest.fn() };
    const service = new AnalysesService(
      { create: jest.fn().mockResolvedValue({ id: 'a1' }) } as never,
      imageRepo as never,
      { findOneForOwner: jest.fn().mockResolvedValue({ organizationId: null }), updateStatus: jest.fn() } as never,
      { extractGps: jest.fn().mockResolvedValue(null) } as never,
      null as never,
      { resolve: jest.fn().mockResolvedValue(null) } as never,
      null as never,
      queue as never,
      null as never,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'a1' } as never);

    await service.create('p1', 'u1', [{ path: '/tmp/a.jpg' }, { path: '/tmp/b.jpg' }] as never, [
      { source: AnalysisImageSource.MOBILE, result: AnalysisResult.INFECTED, confidence: 0.91 },
      { source: AnalysisImageSource.UPLOAD },
    ]);

    expect(images[0]).toMatchObject({ status: 'pending', mobileResult: 'infected', mobileConfidence: 0.91 });
    expect(images[0]).not.toHaveProperty('result');
    expect(images[1]).toMatchObject({ mobileResult: null, mobileConfidence: null });
    expect(queue.add.mock.calls.map(([, job]) => job)).toEqual([{ analysisImageId: 'img1' }, { analysisImageId: 'img2' }]);
  });
});

describe('AnalysesService.create without a parcel', () => {
  it('keeps the capture, records its author and leaves every parcel untouched', async () => {
    const analysisRepo = { create: jest.fn().mockResolvedValue({ id: 'a1' }) };
    const parcelsService = { findOneForOwner: jest.fn(), updateStatus: jest.fn() };
    const queue = { add: jest.fn() };
    const service = new AnalysesService(
      analysisRepo as never,
      { create: jest.fn().mockResolvedValue({ id: 'img1' }) } as never,
      parcelsService as never,
      { extractGps: jest.fn().mockResolvedValue(null) } as never,
      null as never,
      { resolve: jest.fn().mockResolvedValue(null) } as never,
      null as never,
      queue as never,
      null as never,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'a1' } as never);

    await service.create(null, 'u1', FILES, [{ source: AnalysisImageSource.MOBILE, result: AnalysisResult.HEALTHY }]);

    expect(analysisRepo.create).toHaveBeenCalledWith(expect.objectContaining({ parcelId: null, ownerId: 'u1' }));
    expect(parcelsService.findOneForOwner).not.toHaveBeenCalled();
    expect(parcelsService.updateStatus).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith('classify', { analysisImageId: 'img1' });
  });
});

describe('AnalysesService loading photos before starting', () => {
  function buildLoaded() {
    const analysisRepo = {
      create: jest.fn().mockResolvedValue({ id: 'a1' }),
      markStarted: jest.fn().mockResolvedValueOnce(true).mockResolvedValue(false),
    };
    const parcelsService = { findOneForOwner: jest.fn().mockResolvedValue({ organizationId: null }), updateStatus: jest.fn() };
    const queue = { add: jest.fn() };
    const service = new AnalysesService(
      analysisRepo as never,
      { create: jest.fn().mockResolvedValue({ id: 'img1' }) } as never,
      parcelsService as never,
      { extractGps: jest.fn().mockResolvedValue(null) } as never,
      null as never,
      { resolve: jest.fn().mockResolvedValue(null) } as never,
      null as never,
      queue as never,
      null as never,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'a1', parcelId: 'p1', images: [{ id: 'img1' }] } as never);
    return { service, analysisRepo, parcelsService, queue };
  }

  it('keeps the analysis pending and queues nothing when start is false', async () => {
    const { service, analysisRepo, parcelsService, queue } = buildLoaded();

    await service.create('p1', 'u1', FILES, [], undefined, undefined, undefined, false);

    expect(analysisRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(parcelsService.updateStatus).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('queues every image on start, and refuses a second start', async () => {
    const { service, parcelsService, queue } = buildLoaded();

    await service.start('a1', 'u1');

    expect(parcelsService.updateStatus).toHaveBeenCalledWith('p1', 'analyzing');
    expect(queue.add).toHaveBeenCalledWith('classify', { analysisImageId: 'img1' });
    await expect(service.start('a1', 'u1')).rejects.toThrow('Cette analyse a déjà été lancée.');
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
