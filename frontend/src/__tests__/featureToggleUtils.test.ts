import { warnUnsupportedFeatureToggles } from '../engines/featureToggleUtils';

describe('warnUnsupportedFeatureToggles', () => {
  it('logs unsupported toggles', () => {
    const logger = vi.fn();
    warnUnsupportedFeatureToggles({ tempo: true, unknownFlag: true } as any, logger, 'TestEngine');
    expect(logger).toHaveBeenCalledWith('[TestEngine] Ignored feature toggles: unknownFlag');
  });

  it('does nothing for supported toggles', () => {
    const logger = vi.fn();
    warnUnsupportedFeatureToggles({ tempo: true, key: true }, logger, 'TestEngine');
    expect(logger).not.toHaveBeenCalled();
  });
});
