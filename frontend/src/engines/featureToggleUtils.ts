import type { FeatureToggles } from '../types/audio';

export const SUPPORTED_FEATURE_TOGGLES = ['spectral', 'tempo', 'key', 'mfcc', 'onset', 'segments', 'mlClassification'] as const;

export function warnUnsupportedFeatureToggles(
  featureToggles: FeatureToggles | undefined,
  logger: (message: string) => void = console.warn,
  label = 'Engine'
) {
  if (!featureToggles) return [];
  const unsupported = Object.keys(featureToggles).filter(
    (key) => !SUPPORTED_FEATURE_TOGGLES.includes(key as any)
  );
  if (unsupported.length) {
    logger(`[${label}] Ignored feature toggles: ${unsupported.join(', ')}`);
  }
  return unsupported;
}
