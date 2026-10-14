import { resolutionPresets, type ResolutionPreset } from './processingResolution';

export type AdaptiveControllerAction =
  | 'keep'
  | 'downscale-resolution'
  | 'upscale-resolution'
  | 'increase-frame-sampling'
  | 'decrease-frame-sampling';

export type AdaptiveControllerConfig = {
  frameBudgetMs: number;
  overloadLatencyMultiplier: number;
  healthyLatencyMultiplier: number;
  downshiftHoldWindows: number;
  upshiftHoldWindows: number;
  cooldownMs: number;
};

export const defaultAdaptiveControllerConfig: AdaptiveControllerConfig = {
  frameBudgetMs: 33.3,
  overloadLatencyMultiplier: 1.1,
  healthyLatencyMultiplier: 0.8,
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
  currentResolution: ResolutionPreset;
  requestedResolution: ResolutionPreset;
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
  const { now, p95Latency, currentResolution, requestedResolution } = input;
  if (p95Latency <= 0 || !Number.isFinite(p95Latency))
    return keep(state, currentResolution, 'insufficient latency data');
  if (now < state.cooldownUntil) return keep(state, currentResolution, 'cooldown active');

  const overloaded = p95Latency > config.frameBudgetMs * config.overloadLatencyMultiplier;
  const healthy = p95Latency < config.frameBudgetMs * config.healthyLatencyMultiplier;

  if (overloaded) {
    state.slowWindows += 1;
    state.fastWindows = 0;
    if (state.slowWindows < config.downshiftHoldWindows)
      return keep(state, currentResolution, 'overload hold window');

    const index = resolutionOrder.indexOf(currentResolution);
    if (index <= 0) return keep(state, currentResolution, 'minimum resolution reached');
    state.slowWindows = 0;
    state.cooldownUntil = now + config.cooldownMs;
    state.lastAction = 'downscale-resolution';
    return {
      action: 'downscale-resolution',
      resolution: resolutionOrder[index - 1],
      shouldResetLatencyWindow: true,
      frameSamplingRate: 1,
      reason: 'P95 latency exceeds the frame budget',
    };
  }

  if (healthy) {
    state.fastWindows += 1;
    state.slowWindows = 0;
    if (state.fastWindows < config.upshiftHoldWindows)
      return keep(state, currentResolution, 'healthy hold window');

    const currentIndex = resolutionOrder.indexOf(currentResolution);
    const requestedIndex = resolutionOrder.indexOf(requestedResolution);
    if (currentIndex < 0 || requestedIndex < 0 || currentIndex >= requestedIndex)
      return keep(state, currentResolution, 'requested resolution reached');
    state.fastWindows = 0;
    state.cooldownUntil = now + config.cooldownMs;
    state.lastAction = 'upscale-resolution';
    return {
      action: 'upscale-resolution',
      resolution: resolutionOrder[currentIndex + 1],
      frameSamplingRate: 1,
      shouldResetLatencyWindow: true,
      reason: 'P95 latency is comfortably under the frame budget',
    };
  }

  state.slowWindows = 0;
  state.fastWindows = 0;
  return keep(state, currentResolution, 'latency is between overload and healthy thresholds');
}
