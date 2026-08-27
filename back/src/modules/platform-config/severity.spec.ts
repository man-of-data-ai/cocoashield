import { classifySeverity, SeverityLevel } from './severity';

const thresholds = { moderate: 0.1, high: 0.25, critical: 0.4 };

describe('classifySeverity', () => {
  it('classe selon les seuils fournis, bornes incluses', () => {
    expect(classifySeverity(0, thresholds)).toBe(SeverityLevel.FAIBLE);
    expect(classifySeverity(0.099, thresholds)).toBe(SeverityLevel.FAIBLE);
    expect(classifySeverity(0.1, thresholds)).toBe(SeverityLevel.MODERE);
    expect(classifySeverity(0.25, thresholds)).toBe(SeverityLevel.ELEVE);
    expect(classifySeverity(0.4, thresholds)).toBe(SeverityLevel.CRITIQUE);
    expect(classifySeverity(1, thresholds)).toBe(SeverityLevel.CRITIQUE);
  });

  it('suit des seuils reconfigurés, sans constante en dur', () => {
    const strict = { moderate: 0.01, high: 0.02, critical: 0.03 };
    expect(classifySeverity(0.05, strict)).toBe(SeverityLevel.CRITIQUE);
    expect(classifySeverity(0.05, thresholds)).toBe(SeverityLevel.FAIBLE);
  });
});
