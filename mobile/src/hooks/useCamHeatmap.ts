import { useEffect, useRef, useState } from 'react';
import { Image } from 'react-native';
import { ClassificationModule } from 'react-native-executorch';
import { ImageManipulator } from 'expo-image-manipulator';

// index 0 = Healthy (sigmoid(logit) via astuce softmax([z,0])), index 1 = Cssvd.
const CocoaLabel = { Healthy: 0, Cssvd: 1 } as const;

// Grille 9x9 (cf. model_v3_camhead/export_cam.py). Reutilise ClassificationModule pour
// beneficier du meme pipeline de preprocessing natif (resize + normalisation).
const GRID_SIZE = 9;
const GridLabel = Object.fromEntries(
  Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => [`c${i}`, i])
) as Record<string, number>;

const PREPROCESSOR_CONFIG = {
  normMean: [0.485, 0.456, 0.406] as [number, number, number],
  normStd: [0.229, 0.224, 0.225] as [number, number, number],
};

export interface CocoaShieldResult {
  label: 'Healthy' | 'Cssvd';
  confidence: number; // 0..1
}

type ModelsState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export function useCamHeatmap() {
  const [state, setState] = useState<ModelsState>({ status: 'loading' });
  const classifierRef = useRef<ClassificationModule<typeof CocoaLabel> | null>(
    null
  );
  const camRef = useRef<ClassificationModule<typeof GridLabel> | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      ClassificationModule.fromCustomModel(
        require('../../assets/model/cocoashield_camhead_classifier.pte'),
        { labelMap: CocoaLabel, preprocessorConfig: PREPROCESSOR_CONFIG }
      ),
      ClassificationModule.fromCustomModel(
        require('../../assets/model/cocoashield_camhead_cam.pte'),
        { labelMap: GridLabel, preprocessorConfig: PREPROCESSOR_CONFIG }
      ),
    ])
      .then(([classifier, cam]) => {
        if (cancelled) return;
        classifierRef.current = classifier;
        camRef.current = cam;
        setState({ status: 'ready' });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err?.message ?? 'Echec du chargement des modeles',
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Grille 9x9 de valeurs 0..1 (intensite CAM relative), rangee ligne par ligne. */
  async function computeCam(imageUri: string): Promise<number[][]> {
    if (!camRef.current) throw new Error('Le modele CAM n\'est pas encore pret');
    const output = await camRef.current.forward(imageUri);
    const flat = Array.from(
      { length: GRID_SIZE * GRID_SIZE },
      (_, i) => output[`c${i}`] ?? 0
    );
    const max = Math.max(...flat, 1e-8);
    const normalized = flat.map((v) => v / max);
    const grid: number[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      grid.push(normalized.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE));
    }
    return grid;
  }

  async function classifyOnce(imageUri: string): Promise<CocoaShieldResult> {
    if (!classifierRef.current) {
      throw new Error('Le modele n\'est pas encore pret');
    }
    const output = await classifierRef.current.forward(imageUri);
    const healthyProb = output.Healthy;
    const cssvdProb = output.Cssvd;
    return healthyProb >= cssvdProb
      ? { label: 'Healthy', confidence: healthyProb }
      : { label: 'Cssvd', confidence: cssvdProb };
  }

  function getImageSize(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });
  }

  /** Genere une variante legerement recadree/retournee de l'image source (TTA). */
  async function makeVariant(
    uri: string,
    width: number,
    height: number
  ): Promise<string> {
    // Crop aleatoire conservant 85-100% de chaque dimension, decale aleatoirement.
    const keepRatio = 0.85 + Math.random() * 0.15;
    const cropW = Math.round(width * keepRatio);
    const cropH = Math.round(height * keepRatio);
    const originX = Math.round(Math.random() * (width - cropW));
    const originY = Math.round(Math.random() * (height - cropH));

    let ctx = ImageManipulator.manipulate(uri).crop({
      originX,
      originY,
      width: cropW,
      height: cropH,
    });
    if (Math.random() < 0.5) {
      ctx = ctx.flip('horizontal');
    }
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync();
    return saved.uri;
  }

  /**
   * Classification robuste : 5 passes rapides sur des variantes legerement differentes
   * de la meme image (crop + flip aleatoires), vote majoritaire sur le label. Utile pour
   * les cas limites (confiance proche de 50%) ou une seule inference peut basculer.
   */
  async function classify(
    imageUri: string,
    votes = 5
  ): Promise<CocoaShieldResult> {
    const { width, height } = await getImageSize(imageUri);
    // ImageManipulator (Android) n'est pas concurrency-safe : des renderAsync() paralleles
    // s'annulent mutuellement (JobCancellationException). On genere les variantes en sequence.
    const variantUris: string[] = [];
    for (let i = 0; i < votes; i++) {
      variantUris.push(await makeVariant(imageUri, width, height));
    }
    const results = await Promise.all(variantUris.map(classifyOnce));

    const healthyVotes = results.filter((r) => r.label === 'Healthy');
    const cssvdVotes = results.filter((r) => r.label === 'Cssvd');
    const majority = healthyVotes.length >= cssvdVotes.length ? healthyVotes : cssvdVotes;
    const avgConfidence =
      majority.reduce((sum, r) => sum + r.confidence, 0) / majority.length;

    return {
      label: majority === healthyVotes ? 'Healthy' : 'Cssvd',
      confidence: avgConfidence,
    };
  }

  async function analyze(imageUri: string) {
    const [result, camGrid] = await Promise.all([
      classify(imageUri),
      computeCam(imageUri),
    ]);
    return { result, camGrid };
  }

  return { state, analyze, gridSize: GRID_SIZE };
}
