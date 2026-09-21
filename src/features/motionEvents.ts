export type MotionEvent = {
  startedAt: number;
  endedAt: number;
  peakRatio: number;
  peakWasmLatency: number;
  peakEndToEndLatency: number;
};

export class MotionEventTracker {
  private active: { startedAt: number; peakRatio: number; peakWasmLatency: number; peakEndToEndLatency: number } | null = null;
  update(time: number, ratio: number, threshold: number, wasmLatency: number, endToEndLatency: number): MotionEvent | null {
    if (ratio >= threshold && !this.active) {
      this.active = { startedAt: time, peakRatio: ratio, peakWasmLatency: wasmLatency, peakEndToEndLatency: endToEndLatency };
    }
    if (this.active) {
      this.active.peakRatio = Math.max(this.active.peakRatio, ratio);
      this.active.peakWasmLatency = Math.max(this.active.peakWasmLatency, wasmLatency);
      this.active.peakEndToEndLatency = Math.max(this.active.peakEndToEndLatency, endToEndLatency);
    }
    if (ratio < threshold && this.active) {
      const event = { ...this.active, endedAt: time };
      this.active = null;
      return event;
    }
    return null;
  }
  reset() { this.active = null; }
}
