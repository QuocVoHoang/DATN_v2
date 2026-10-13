import { resolutionPresets, type ResolutionPreset } from './processingResolution';

export type AdaptiveControllerAction =
  | 'keep'
  | 'downscale-resolution'
  | 'upscale-resolution'
  | 'increase-frame-sampling'
  | 'decrease-frame-sampling';

export type AdaptiveControllerConfig = {
  frameBudgetMs: number;
  targetFps: number;
  overloadLatencyMultiplier: number;
  healthyLatencyMultiplier: number;
  overloadFpsRatio: number;
  healthyFpsRatio: number;
  downshiftHoldWindows: number;
  upshiftHoldWindows: number;
  cooldownMs: number;
};

export const defaultAdaptiveControllerConfig: AdaptiveControllerConfig = {
  frameBudgetMs: 33.3,
  targetFps: 30,
  overloadLatencyMultiplier: 1.1,
  healthyLatencyMultiplier: 0.8,
  overloadFpsRatio: 0.85,
  healthyFpsRatio: 0.95,
  downshiftHoldWindows: 2,
  upshiftHoldWindows: 5,
  cooldownMs: 2500,
};

export type AdaptiveControllerState = {
  slowWindows: number;
  fastWindows: number;
  cooldownUntil: number;
  lastAction: AdaptiveControllerAction;
};

export type AdaptiveControllerInput = {
  now: number;
  p95Latency: number;
  fps: number;
  droppedFramesDelta: number;
  currentResolution: ResolutionPreset;
  requestedResolution: ResolutionPreset;
  currentFrameSamplingRate: number;
  maxFrameSamplingRate: number;
};

export type AdaptiveControllerDecision = {
  action: AdaptiveControllerAction;
  resolution: ResolutionPreset;
  frameSamplingRate: number;
  shouldResetLatencyWindow: boolean;
  reason: string;
};

const resolutionOrder = resolutionPresets.map((preset) => preset.value);

export function createAdaptiveControllerState(): AdaptiveControllerState {
  return {
    slowWindows: 0,
    fastWindows: 0,
    cooldownUntil: 0,
    lastAction: 'keep',
  };
}

export function resetAdaptiveController(state: AdaptiveControllerState) {
  state.slowWindows = 0;
  state.fastWindows = 0;
  state.cooldownUntil = 0;
  state.lastAction = 'keep';
}

function keep(
  state: AdaptiveControllerState,
  resolution: ResolutionPreset,
  reason: string,
): AdaptiveControllerDecision {
  state.lastAction = 'keep';
  return {
    action: 'keep',
    resolution,
    frameSamplingRate: 1,
    shouldResetLatencyWindow: false,
    reason,
  };
}

export function updateAdaptiveController(
  state: AdaptiveControllerState,
  input: AdaptiveControllerInput,
  config: AdaptiveControllerConfig = defaultAdaptiveControllerConfig,
): AdaptiveControllerDecision {
  const { now, p95Latency, fps, droppedFramesDelta, currentResolution, requestedResolution } =
    input;
  const samplingRate = Math.max(1, Math.floor(input.currentFrameSamplingRate));
  const maxSamplingRate = Math.max(samplingRate, Math.floor(input.maxFrameSamplingRate));
  const keepWithSampling = (reason: string): AdaptiveControllerDecision => {
    const decision = keep(state, currentResolution, reason);
    return { ...decision, frameSamplingRate: samplingRate };
  };
  if (p95Latency <= 0 || !Number.isFinite(p95Latency))
    return keepWithSampling('insufficient latency data');
  if (now < state.cooldownUntil) return keepWithSampling('cooldown active');

  const overloaded =
    p95Latency > config.frameBudgetMs * config.overloadLatencyMultiplier ||
    fps < config.targetFps * config.overloadFpsRatio ||
    droppedFramesDelta > 0;
  const healthy =
    p95Latency < config.frameBudgetMs * config.healthyLatencyMultiplier &&
    fps >= config.targetFps * config.healthyFpsRatio &&
    droppedFramesDelta === 0;

  if (overloaded) {
    state.slowWindows += 1;
    state.fastWindows = 0;
    if (state.slowWindows < config.downshiftHoldWindows)
      return keepWithSampling('overload hold window');

    const index = resolutionOrder.indexOf(currentResolution);
    if (index <= 0) {
      if (samplingRate >= maxSamplingRate)
        return keepWithSampling('minimum resolution and maximum sampling reached');
      state.slowWindows = 0;
      state.cooldownUntil = now + config.cooldownMs;
      state.lastAction = 'increase-frame-sampling';
      return {
        action: 'increase-frame-sampling',
        resolution: currentResolution,
        frameSamplingRate: samplingRate + 1,
        shouldResetLatencyWindow: true,
        reason: 'minimum resolution reached and overload persists',
      };
    }
    state.slowWindows = 0;
    state.cooldownUntil = now + config.cooldownMs;
    state.lastAction = 'downscale-resolution';
    return {
      action: 'downscale-resolution',
      resolution: resolutionOrder[index - 1],
      shouldResetLatencyWindow: true,
      frameSamplingRate: samplingRate,
      reason: 'latency, FPS, or dropped frames indicate overload',
    };
  }

  if (healthy) {
    state.fastWindows += 1;
    state.slowWindows = 0;
    if (state.fastWindows < config.upshiftHoldWindows)
      return keepWithSampling('healthy hold window');

    if (samplingRate > 1) {
      state.fastWindows = 0;
      state.cooldownUntil = now + config.cooldownMs;
      state.lastAction = 'decrease-frame-sampling';
      return {
        action: 'decrease-frame-sampling',
        resolution: currentResolution,
        frameSamplingRate: samplingRate - 1,
        shouldResetLatencyWindow: true,
        reason: 'healthy metrics allow more frames to be processed',
      };
    }

    const currentIndex = resolutionOrder.indexOf(currentResolution);
    const requestedIndex = resolutionOrder.indexOf(requestedResolution);
    if (currentIndex < 0 || requestedIndex < 0 || currentIndex >= requestedIndex)
      return keepWithSampling('requested resolution reached');
    state.fastWindows = 0;
    state.cooldownUntil = now + config.cooldownMs;
    state.lastAction = 'upscale-resolution';
    return {
      action: 'upscale-resolution',
      resolution: resolutionOrder[currentIndex + 1],
      frameSamplingRate: samplingRate,
      shouldResetLatencyWindow: true,
      reason: 'latency, FPS, and dropped frames are healthy',
    };
  }

  state.slowWindows = 0;
  state.fastWindows = 0;
  return keepWithSampling('metrics are between overload and healthy thresholds');
}
