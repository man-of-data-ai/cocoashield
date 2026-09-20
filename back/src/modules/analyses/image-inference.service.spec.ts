import { verdictFromLogit } from './image-inference.service';
import { AnalysisResult } from './entities/analysis.entity';

describe('verdictFromLogit', () => {
  it('reads a positive logit as healthy', () => {
    const { result, confidence } = verdictFromLogit(2.2);

    expect(result).toBe(AnalysisResult.HEALTHY);
    expect(confidence).toBeCloseTo(0.9002, 3);
  });

  it('reads a negative logit as infected', () => {
    const { result, confidence } = verdictFromLogit(-2.2);

    expect(result).toBe(AnalysisResult.INFECTED);
    expect(confidence).toBeCloseTo(0.9002, 3);
  });

  it('always reports the confidence of the verdict it returns', () => {
    for (const logit of [-5, -0.4, 0.4, 5]) {
      expect(verdictFromLogit(logit).confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('calls the ambiguous middle infected rather than healthy', () => {
    expect(verdictFromLogit(0).result).toBe(AnalysisResult.INFECTED);
  });

  it('stays finite on saturated logits', () => {
    expect(verdictFromLogit(-800).confidence).toBe(1);
    expect(verdictFromLogit(800).confidence).toBe(1);
  });
});
