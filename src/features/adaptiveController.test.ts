import { describe, expect, it } from 'vitest';
import {
  createAdaptiveControllerState,
  defaultAdaptiveControllerConfig,
  updateAdaptiveController,
} from './adaptiveController';

const base = {
  now: 0,
  p95Latency: 40,
  currentResolution: '1080p' as const,
  requestedResolution: '1080p' as const,
};

describe('adaptive controller', () => {
  it('keeps when there is no latency sample', () => {
    const result = updateAdaptiveController(createAdaptiveControllerState(), {
      ...base,
      p95Latency: 0,
    });
    expect(result.action).toBe('keep');
  });

  it('downscales after the configured overload hold windows', () => {
    const state = createAdaptiveControllerState();
    expect(updateAdaptiveController(state, base).action).toBe('keep');
    const result = updateAdaptiveController(state, { ...base, now: 1000 });
    expect(result).toMatchObject({
      action: 'downscale-resolution',
      resolution: '900p',
      shouldResetLatencyWindow: true,
    });
  });

  it('blocks changes during cooldown', () => {
    const state = createAdaptiveControllerState();
    updateAdaptiveController(state, base);
    updateAdaptiveController(state, { ...base, now: 1000 });
    const result = updateAdaptiveController(state, {
      ...base,
      now: 1001,
      currentResolution: '900p',
    });
    expect(result.reason).toBe('cooldown active');
  });

  it('upscales only after healthy windows and never exceeds requested resolution', () => {
    const state = createAdaptiveControllerState();
    const input = {
      ...base,
      p95Latency: 20,
      currentResolution: '720p' as const,
      requestedResolution: '1080p' as const,
    };
    for (let i = 0; i < defaultAdaptiveControllerConfig.upshiftHoldWindows - 1; i += 1) {
      expect(updateAdaptiveController(state, { ...input, now: i }).action).toBe('keep');
    }
    expect(updateAdaptiveController(state, { ...input, now: 10 }).resolution).toBe('900p');

    const capped = createAdaptiveControllerState();
    const result = updateAdaptiveController(capped, {
      ...input,
      currentResolution: '1080p',
    });
    expect(result.resolution).toBe('1080p');
  });

  it('keeps full frame processing at the minimum resolution during overload', () => {
    const state = createAdaptiveControllerState();
    const input = {
      ...base,
      currentResolution: '360p' as const,
      requestedResolution: '360p' as const,
    };
    updateAdaptiveController(state, input);
    const result = updateAdaptiveController(state, { ...input, now: 3000 });
    expect(result).toMatchObject({ action: 'keep', frameSamplingRate: 1, resolution: '360p' });
  });

  it('upscales resolution when healthy', () => {
    const state = createAdaptiveControllerState();
    const input = {
      ...base,
      p95Latency: 20,
      currentResolution: '720p' as const,
      requestedResolution: '1080p' as const,
       currentFrameSamplingRate: 1,
    };
    for (let i = 0; i < defaultAdaptiveControllerConfig.upshiftHoldWindows - 1; i += 1)
      updateAdaptiveController(state, { ...input, now: i });
    const result = updateAdaptiveController(state, { ...input, now: 3000 });
    expect(result).toMatchObject({ action: 'upscale-resolution', resolution: '900p', frameSamplingRate: 1 });
  });

  it('resets hold windows when latency is between thresholds', () => {
    const state = createAdaptiveControllerState();
    updateAdaptiveController(state, base);
    const result = updateAdaptiveController(state, { ...base, now: 1000, p95Latency: 30 });
    expect(result).toMatchObject({ action: 'keep', resolution: '1080p' });

    const next = updateAdaptiveController(state, { ...base, now: 2000 });
    expect(next.action).toBe('keep');
  });
});
