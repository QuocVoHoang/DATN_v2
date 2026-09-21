import { motionErrorMessages, type MotionResult, type WasmModule } from './motionTypes';

declare global { interface Window { Module?: Partial<WasmModule> & { onRuntimeInitialized?: () => void; onAbort?: (reason?: unknown) => void }; } }

let modulePromise: Promise<WasmModule> | null = null;
let inputPointer = 0;
let inputCapacity = 0;

const MAX_WASM_THREADS = 4;

export function initWasm(): Promise<WasmModule> {
  if (modulePromise) return modulePromise;
  modulePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = (error: Error) => {
      modulePromise = null;
      script.remove();
      reject(error);
    };
    window.Module = {
      onRuntimeInitialized: () => resolve(window.Module as WasmModule),
      onAbort: (reason?: unknown) => fail(new Error(`WASM runtime aborted${reason ? `: ${String(reason)}` : ''}`)),
    };
    script.src = '/wasm/motion_wasm.js';
    script.onerror = () => fail(new Error('WASM has not been built. Run npm run build:wasm.'));
    document.head.appendChild(script);
  });
  return modulePromise;
}

export async function processWithWasm(image: ImageData, threshold: number): Promise<MotionResult> {
  const module = await initWasm();
  const input = image.data;
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0 || input.length !== image.width * image.height * 4) {
    throw new Error('Invalid image dimensions or RGBA data length.');
  }
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new Error('Threshold must be an integer from 1 to 255.');
  }
  if (input.length > inputCapacity) {
    const nextPointer = module._malloc(input.length);
    if (!nextPointer) throw new Error('Unable to allocate WASM input memory.');
    if (inputPointer) module._free(inputPointer);
    inputPointer = nextPointer;
    inputCapacity = input.length;
  }
  const copyStarted = performance.now();
  module.HEAPU8.set(input, inputPointer);
  const inputCopyMs = performance.now() - copyStarted;
  const engineStarted = performance.now();
  const outputPointer = module._processMotion(inputPointer, image.width, image.height, threshold);
  const engineMs = performance.now() - engineStarted;
  if (!outputPointer) {
    const code = module._getLastMotionError();
    throw new Error(motionErrorMessages[code] ?? 'Motion engine failed to process the frame.');
  }
  const outputStarted = performance.now();
  const heap = module.HEAPU8;
  const byteLength = input.length;
  if (outputPointer < 0 || outputPointer + byteLength > heap.byteLength) {
    throw new Error('Motion engine returned an output outside WASM memory.');
  }
  const outputViewMs = performance.now() - outputStarted;
  return { mask: { width: image.width, height: image.height, data: new Uint8Array(heap.buffer, outputPointer, byteLength) }, changedPixels: module._getChangedPixelCount(), metrics: { inputCopyMs, engineMs, outputViewMs } };
}

export async function resetWasm(): Promise<void> {
  const module = await initWasm();
  module._resetMotionDetector();
}

export async function configureWasmThreads(count: number): Promise<number> {
  const module = await initWasm();
  if (!Number.isFinite(count)) throw new Error('Thread count must be finite.');
  module._setThreadCount(Math.max(1, Math.min(MAX_WASM_THREADS, Math.floor(count))));
  return module._getThreadCount();
}
