export type MotionEvent = {
  id?: number;
  startedAt: number;
  confirmedAt?: number;
  endedAt: number;
  lastMotionAt?: number;
  status?: 'active' | 'completed';
  peakRatio: number;
  peakWasmLatency: number;
  peakEndToEndLatency: number;
  object?: MotionEventObjectSnapshot;
};

export type MotionEventObjectSnapshot = {
  bbox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  area: number;
  trackId: number;
  meanIntensity: number;
  maxIntensity: number;
};

export type MotionEventUpdate = { kind: 'started' | 'updated' | 'ended'; event: MotionEvent };

type ActiveEvent = { id: number; startedAt: number; confirmedAt: number; lastMotionAt: number; peakRatio: number; peakWasmLatency: number; peakEndToEndLatency: number; object?: MotionEventObjectSnapshot };

/** Converts noisy per-frame measurements into stable surveillance events. */
export class MotionEventTracker {
  private active: ActiveEvent | null = null;
  private candidateStartedAt: number | null = null;
  private lastSeenAt: number | null = null;
  private nextId = 1;

  constructor(private readonly confirmDuration = 0.3, private readonly quietDuration = 1.5) {}

  update(time: number, ratio: number, startThreshold: number, wasmLatency: number, endToEndLatency: number, continueThreshold = startThreshold * 0.5, object?: MotionEventObjectSnapshot): MotionEventUpdate | null {
    if (this.lastSeenAt !== null && time < this.lastSeenAt) this.reset();
    const moving = ratio >= (this.active ? continueThreshold : startThreshold);

    if (!this.active) {
      if (!moving) { this.candidateStartedAt = null; return null; }
      this.candidateStartedAt ??= time;
      if (time - this.candidateStartedAt < this.confirmDuration) return null;
      this.active = { id: this.nextId++, startedAt: this.candidateStartedAt, confirmedAt: time, lastMotionAt: time, peakRatio: ratio, peakWasmLatency: wasmLatency, peakEndToEndLatency: endToEndLatency, object };
      this.lastSeenAt = time;
      return { kind: 'started', event: { ...this.active, endedAt: time, status: 'active' } };
    }

    this.lastSeenAt = time;
    if (moving) {
      this.active.lastMotionAt = time;
      this.active.peakRatio = Math.max(this.active.peakRatio, ratio);
      this.active.peakWasmLatency = Math.max(this.active.peakWasmLatency, wasmLatency);
      this.active.peakEndToEndLatency = Math.max(this.active.peakEndToEndLatency, endToEndLatency);
      if (ratio >= this.active.peakRatio) this.active.object = object ?? this.active.object;
      return { kind: 'updated', event: { ...this.active, endedAt: time, status: 'active' } };
    }
    if (time - this.active.lastMotionAt < this.quietDuration) return null;
    const event = { ...this.active, endedAt: this.active.lastMotionAt, status: 'completed' as const };
    this.active = null;
    this.candidateStartedAt = null;
    return { kind: 'ended', event };
  }

  finish(): MotionEventUpdate | null {
    if (!this.active) { this.candidateStartedAt = null; return null; }
    const event = { ...this.active, endedAt: this.active.lastMotionAt, status: 'completed' as const };
    this.active = null;
    this.candidateStartedAt = null;
    return { kind: 'ended', event };
  }

  reset() { this.active = null; this.candidateStartedAt = null; this.lastSeenAt = null; }
}
