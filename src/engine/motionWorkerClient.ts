import type { ROI } from '../features/roi';
import type { WorkerResponse } from '../features/motionWorkerProtocol';

export function createMotionWorker() {
  const worker = new Worker(new URL('../workers/motionWorker.ts', import.meta.url), { type: 'module' });
  let requestId = 0;
  return {
    worker,
    process(bitmap: ImageBitmap, width: number, height: number, threshold: number, roi: ROI, minArea: number): Promise<WorkerResponse> {
      const id = ++requestId;
      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => { worker.removeEventListener('message', onMessage); reject(new Error('Motion worker timed out.')); }, 15000);
        const onMessage = (event: MessageEvent<WorkerResponse>) => { if (event.data.requestId !== id) return; window.clearTimeout(timeout); worker.removeEventListener('message', onMessage); event.data.type === 'error' ? reject(new Error(event.data.message)) : resolve(event.data); };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', () => { window.clearTimeout(timeout); reject(new Error('Motion worker failed to load or execute.')); }, { once: true });
        worker.postMessage({ type: 'process', requestId: id, bitmap, width, height, threshold, roi, minArea }, [bitmap]);
      });
    },
    terminate() { worker.terminate(); },
  };
}
