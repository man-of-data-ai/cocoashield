import { File } from 'expo-file-system';
import type { CocoaShieldResult } from '../hooks/useCamHeatmap';

export interface Photo {
  uri: string;
}

export interface Position {
  latitude: number;
  longitude: number;
}

export interface CaptureTarget {
  baseUrl: string;
  cookie: string;
  fetcher?: typeof fetch;
}

const SERVER_RESULT = { Cssvd: 'infected', Healthy: 'healthy' } as const;

export function captureFields(result: CocoaShieldResult, position: Position | null): string {
  return JSON.stringify([
    {
      source: 'mobile',
      result: SERVER_RESULT[result.label],
      confidence: result.confidence,
      ...(position ?? {}),
    },
  ]);
}

export function buildCaptureForm(
  photo: Photo,
  result: CocoaShieldResult,
  position: Position | null,
): FormData {
  const form = new FormData();
  form.append('images', new File(photo.uri) as unknown as Blob);
  form.append('results', captureFields(result, position));
  return form;
}

export async function sendCapture(
  target: CaptureTarget,
  photo: Photo,
  result: CocoaShieldResult,
  position: Position | null,
): Promise<{ id: string }> {
  if (!target.cookie) {
    throw new Error('Aucune session active : reconnectez-vous avant d\'envoyer une capture.');
  }

  const send = target.fetcher ?? fetch;
  const response = await send(`${target.baseUrl.replace(/\/+$/, '')}/v1/analyses`, {
    method: 'POST',
    headers: { Cookie: target.cookie },
    credentials: 'omit',
    body: buildCaptureForm(photo, result, position),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? `Envoi refusé par le serveur (${response.status}).`);
  }
  return payload;
}
