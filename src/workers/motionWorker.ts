import type { WorkerRequest, WorkerResponse } from '../features/motionWorkerProtocol';

declare function importScripts(...urls: string[]): void;

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

function initWasm(): Promise<Wasm> {
  if (wasmPromise) return wasmPromise;
  wasmPromise = new Promise((resolve, reject) => {
    scope.Module = { onRuntimeInitialized: () => resolve(scope.Module as Wasm), onAbort: (reason?: unknown) => reject(new Error(String(reason ?? 'WASM aborted'))), locateFile: (path) => `/wasm/${path}` };
    try { importScripts('/wasm/motion_wasm_worker.js'); } catch (error) { reject(error); }
  });
  return wasmPromise;
}

function detect(data: Uint8Array, width: number, height: number, roi: WorkerRequest['roi'], minArea: number) {
  const x0 = Math.max(0, Math.floor(roi.x * width));
  const y0 = Math.max(0, Math.floor(roi.y * height));
  const x1 = Math.min(width, Math.ceil((roi.x + roi.width) * width));
  const y1 = Math.min(height, Math.ceil((roi.y + roi.height) * height));
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  const objects: WorkerResponse['objects'] = [];
  let changedPixelsInRoi = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const start = y * width + x;
    if (visited[start] || data[start * 4] === 0) continue;
    visited[start] = 1; let top = 0; stack[top++] = start;
    let area = 0, minX = x, maxX = x, minY = y, maxY = y, sumX = 0, sumY = 0;
    while (top) {
      const index = stack[--top]; const cx = index % width; const cy = Math.floor(index / width);
      area++; sumX += cx; sumY += cy; minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        const nx = next % width; const ny = Math.floor(next / width);
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1 || visited[next] || data[next * 4] === 0) continue;
        visited[next] = 1; stack[top++] = next;
      }
    }
    changedPixelsInRoi += area;
    if (area >= minArea) objects.push({ id: objects.length + 1, bbox: { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height }, centroid: { x: sumX / area / width, y: sumY / area / height }, area });
  }
  return { objects, changedPixelsInRoi };
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
    const analysis = detect(mask, request.width, request.height, request.roi, request.minArea);
    const analysisMs = performance.now() - analysisStarted;
    const response: WorkerResponse = { type: 'result', requestId: request.requestId, objects: analysis.objects, changedPixelsInRoi: analysis.changedPixelsInRoi, engineMs, captureMs, analysisMs };
    scope.postMessage(response);
  } catch (error) {
    request.bitmap.close();
    scope.postMessage({ type: 'error', requestId: request.requestId, message: error instanceof Error ? error.message : String(error) } satisfies WorkerResponse);
  }
};
