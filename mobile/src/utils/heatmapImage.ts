import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';

/** Bleu (peu) -> jaune -> rouge (beaucoup), meme palette que le script Python de reference. */
export function colorAt(v: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.5) {
    const k = t / 0.5;
    return [30 + k * 225, 60 + k * 195, 200 - k * 180];
  }
  const k = (t - 0.5) / 0.5;
  return [255, 255 - k * 205, 20 - k * 20];
}

function sampleBilinear(grid: number[][], x: number, y: number): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const x0 = Math.max(0, Math.min(cols - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(rows - 1, Math.floor(y)));
  const x1 = Math.min(cols - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const v00 = grid[y0][x0];
  const v10 = grid[y0][x1];
  const v01 = grid[y1][x0];
  const v11 = grid[y1][x1];
  const top = v00 * (1 - fx) + v10 * fx;
  const bottom = v01 * (1 - fx) + v11 * fx;
  return top * (1 - fy) + bottom * fy;
}

/**
 * Construit une image Skia lissee (resolution `outSize`x`outSize`) a partir de la grille CAM
 * brute (9x9), par interpolation bilineaire faite en JS.
 */
export function buildHeatmapImage(grid: number[][], outSize: number) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return null;

  const pixels = new Uint8Array(outSize * outSize * 4);
  let i = 0;
  for (let py = 0; py < outSize; py++) {
    const gy = ((py + 0.5) / outSize) * rows - 0.5;
    for (let px = 0; px < outSize; px++) {
      const gx = ((px + 0.5) / outSize) * cols - 0.5;
      const v = Math.max(0, Math.min(1, sampleBilinear(grid, gx, gy)));
      const [rr, gg, bb] = colorAt(v);
      pixels[i++] = Math.round(rr * v);
      pixels[i++] = Math.round(gg * v);
      pixels[i++] = Math.round(bb * v);
      pixels[i++] = Math.round(v * 255);
    }
  }
  const data = Skia.Data.fromBytes(pixels);
  return Skia.Image.MakeImage(
    { width: outSize, height: outSize, alphaType: AlphaType.Premul, colorType: ColorType.RGBA_8888 },
    data,
    outSize * 4
  );
}
