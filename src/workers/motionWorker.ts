import type { WorkerRequest, WorkerResponse } from '../features/motionWorkerProtocol';
import { createMovingObjectWorkspace, detectMovingObjects } from '../features/movingObjects';

type WorkerScope = { Module?: Partial<Wasm> & { onRuntimeInitialized?: () => void; onAbort?: (reason?: unknown) => void; locateFile?: (path: string) => string }; postMessage(message: WorkerResponse): void; onmessage: (event: MessageEvent<WorkerRequest>) => void };

type Wasm = {
  HEAPU8: Uint8Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _processMotion(pointer: number, width: number, height: number, threshold: number): number;
  _getLastMotionError(): number;
  _resetMotionDetector(): void;
};

const scope = self as unknown as WorkerScope;
let wasmPromise: Promise<Wasm> | null = null;
let inputPointer = 0;
let inputCapacity = 0;
let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
const objectWorkspace = createMovingObjectWorkspace();

function initWasm(): Promise<Wasm> {
  if (wasmPromise) return wasmPromise;
  wasmPromise = new Promise((resolve, reject) => {
    const loadModule = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>;
    void loadModule('/wasm/motion_wasm_worker.mjs')
      .then((module) => {
        const factory = (module as { default?: (options?: Record<string, unknown>) => Promise<Wasm> }).default;
        if (!factory) throw new Error('Worker WASM factory is unavailable.');
        return factory({ locateFile: (path: string) => `/wasm/${path}` });
      })
      .then(resolve, reject);
  });
  return wasmPromise;
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'process') return;
  const request = event.data;
  const started = performance.now();
  try {
    if (!canvas || canvas.width !== request.width || canvas.height !== request.height) {
      canvas = new OffscreenCanvas(request.width, request.height);
      context = canvas.getContext('2d', { willReadFrequently: true });
    }
    if (!context) throw new Error('OffscreenCanvas 2D context is unavailable.');
    context.drawImage(request.bitmap, 0, 0, request.width, request.height);
    request.bitmap.close();
    const image = context.getImageData(0, 0, request.width, request.height);
    const captureMs = performance.now() - started;
    const wasm = await initWasm();
    if (image.data.length > inputCapacity) { const next = wasm._malloc(image.data.length); if (!next) throw new Error('Unable to allocate WASM input.'); if (inputPointer) wasm._free(inputPointer); inputPointer = next; inputCapacity = image.data.length; }
    wasm.HEAPU8.set(image.data, inputPointer);
    const engineStarted = performance.now();
    const outputPointer = wasm._processMotion(inputPointer, request.width, request.height, request.threshold);
    const engineMs = performance.now() - engineStarted;
    if (!outputPointer) throw new Error(`WASM motion error ${wasm._getLastMotionError()}`);
    const mask = new Uint8Array(wasm.HEAPU8.buffer, outputPointer, image.data.length);
    const analysisStarted = performance.now();
    const analysis = detectMovingObjects({ width: request.width, height: request.height, data: mask }, request.roi, request.minArea, objectWorkspace);
    const analysisMs = performance.now() - analysisStarted;
    const response: WorkerResponse = { type: 'result', requestId: request.requestId, objects: analysis.objects, changedPixelsInRoi: analysis.changedPixelsInRoi, engineMs, captureMs, analysisMs };
    scope.postMessage(response);
  } catch (error) {
    request.bitmap.close();
    scope.postMessage({ type: 'error', requestId: request.requestId, message: error instanceof Error ? error.message : String(error) } satisfies WorkerResponse);
  }
};
