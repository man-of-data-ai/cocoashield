import { captureFields, sendCapture } from './capture';

const RESULT = { label: 'Cssvd' as const, confidence: 0.91 };
const PHOTO = { uri: 'file:///tmp/leaf.jpg' };

describe('captureFields', () => {
  it('sends the on-device verdict so the server does not classify again', () => {
    expect(JSON.parse(captureFields(PHOTO, RESULT, null).results)).toEqual([
      { source: 'mobile', result: 'infected', confidence: 0.91 },
    ]);
  });

  it('maps a healthy verdict to the server vocabulary', () => {
    const { results } = captureFields(PHOTO, { label: 'Healthy', confidence: 0.8 }, null);

    expect(JSON.parse(results)[0].result).toBe('healthy');
  });

  it('attaches the position when the device has one', () => {
    const { results } = captureFields(PHOTO, RESULT, { latitude: 5.78, longitude: -6.65 });

    expect(JSON.parse(results)[0]).toMatchObject({ latitude: 5.78, longitude: -6.65 });
  });

  it('attaches the photo itself', () => {
    expect(captureFields(PHOTO, RESULT, null).image).toEqual({
      uri: PHOTO.uri,
      name: 'capture.jpg',
      type: 'image/jpeg',
    });
  });
});

describe('sendCapture', () => {
  const ok = { ok: true, json: async () => ({ id: 'a1' }) };

  it('posts to the capture endpoint with the session cookie', async () => {
    const fetcher = jest.fn().mockResolvedValue(ok);

    await sendCapture(
      { baseUrl: 'https://api.test', cookie: 'better-auth.session=abc', fetcher },
      PHOTO,
      RESULT,
      null,
    );

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.test/v1/analyses');
    expect(init.method).toBe('POST');
    expect(init.headers.Cookie).toBe('better-auth.session=abc');
    expect(init.credentials).toBe('omit');
  });

  it('returns the created analysis', async () => {
    const fetcher = jest.fn().mockResolvedValue(ok);

    await expect(
      sendCapture({ baseUrl: 'https://api.test', cookie: 'c', fetcher }, PHOTO, RESULT, null),
    ).resolves.toEqual({ id: 'a1' });
  });

  it('refuses to send without a session rather than sending anonymously', async () => {
    const fetcher = jest.fn();

    await expect(
      sendCapture({ baseUrl: 'https://api.test', cookie: '', fetcher }, PHOTO, RESULT, null),
    ).rejects.toThrow(/session/i);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('surfaces the server message when the upload is refused', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Aucune parcelle ne contient cette position.' }),
    });

    await expect(
      sendCapture({ baseUrl: 'https://api.test', cookie: 'c', fetcher }, PHOTO, RESULT, null),
    ).rejects.toThrow('Aucune parcelle ne contient cette position.');
  });

  it('strips a trailing slash on the base url', async () => {
    const fetcher = jest.fn().mockResolvedValue(ok);

    await sendCapture({ baseUrl: 'https://api.test/', cookie: 'c', fetcher }, PHOTO, RESULT, null);

    expect(fetcher.mock.calls[0][0]).toBe('https://api.test/v1/analyses');
  });
});
