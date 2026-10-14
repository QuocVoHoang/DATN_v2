export type WorkerObject = {
  bbox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  area: number;
};

export type WorkerRequest = {
  type: 'process';
  requestId: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  threshold: number;
  threadCount: number;
  roi: { x: number; y: number; width: number; height: number };
  minArea: number;
};

export type WorkerResponse = {
  type: 'ready' | 'result' | 'error';
  requestId?: number;
  mediaTime?: number;
  objects?: WorkerObject[];
  changedPixelsInRoi?: number;
  validMotionPixelsInRoi?: number;
  engineMs?: number;
  captureMs?: number;
  analysisMs?: number;
  activeThreads?: number;
  message?: string;
};
