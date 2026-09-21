export type MotionMask = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
};

export type MotionResult = {
  mask: MotionMask;
  changedPixels: number;
  metrics: {
    inputCopyMs: number;
    engineMs: number;
    outputViewMs: number;
  };
};

export const motionErrorMessages: Record<number, string> = {
  1: 'Motion engine rejected the frame: input pointer is null.',
  2: 'Motion engine rejected the frame: invalid dimensions.',
  3: 'Motion engine rejected the frame: threshold must be an integer from 1 to 255.',
  4: 'Motion engine rejected the frame: frame is too large.',
  5: 'Motion engine rejected the frame: input is outside WASM memory.',
};

export type WasmModule = {
  _malloc(size: number): number;
  _free(pointer: number): void;
  _processMotion(pointer: number, width: number, height: number, threshold: number): number;
  _resetMotionDetector(): void;
  _getChangedPixelCount(): number;
  _getLastMotionError(): number;
  _setThreadCount(count: number): void;
  _getThreadCount(): number;
  HEAPU8: Uint8Array;
};
