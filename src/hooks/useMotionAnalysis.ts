import { useEffect, useRef, useState } from 'react';
import { configureWasmThreads, processWithWasm, resetWasm } from '../engine/wasmMotion';
import { clampRoi, type ROI } from '../features/roi';
import { MotionEventTracker, type MotionEvent } from '../features/motionEvents';
import { createMovingObjectWorkspace, detectMovingObjects, mergeMovingObjects, type MovingObject } from '../features/movingObjects';
import { LatencySamples } from '../features/latencySamples';
import { getProcessingSize, type ResolutionPreset } from '../features/processingResolution';
import { createEventCsv, createEventJson, downloadTextFile } from '../features/eventExport';
import { chooseFastestThread, threadCandidates, type ThreadMode } from '../features/autoThread';
import { createMotionWorker } from '../engine/motionWorkerClient';
import { ObjectTracker, type TrackedMovingObject } from '../features/objectTracking';
import type { MotionEventObjectSnapshot } from '../features/motionEvents';
import { createAdaptiveControllerState, defaultAdaptiveControllerConfig, resetAdaptiveController, updateAdaptiveController } from '../features/adaptiveController';
import type { AdaptiveControllerAction } from '../features/adaptiveController';
import type { MotionMaskPreviewData } from '../components/MotionMaskPreview';

const defaultRoi: ROI = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
const minThreshold = 1;
const maxThreshold = 255;
const maxLatencySamples = 180;
  // Keep this small enough for thin motion contours at 1080p. The event
  // threshold below still prevents isolated noise from becoming an alert.
  const minObjectAreaRatio = 24 / (1920 * 1080);
  const eventStartRatio = 0.005;
  const eventContinueRatio = 0.002;
export type { ResolutionPreset } from '../features/processingResolution';

type BrowserStatus = {
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
  webAssembly: boolean;
  camera: boolean;
  offscreenCanvas: boolean;
};

type RuntimeStatus = {
  wasmEngine: 'active' | 'inactive';
  canvasCapture: 'active' | 'inactive';
  canvasRender: 'active' | 'inactive';
  roiFiltering: 'active' | 'inactive';
  cameraInput: 'active' | 'inactive';
  offscreenCanvasWorker: 'active' | 'inactive';
  pthreads: 'available' | 'unavailable';
  activeThreads: number;
};

function clampThreshold(value: number) {
  if (!Number.isFinite(value)) return minThreshold;
  return Math.min(maxThreshold, Math.max(minThreshold, Math.round(value)));
}

export function useMotionAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLCanvasElement>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const runIdRef = useRef(0);
  const frameRequestRef = useRef<number | null>(null);
  const videoFrameRequestRef = useRef<number | null>(null);
  const dashboardTimerRef = useRef<number | null>(null);
  const sourceRequestRef = useRef(0);
  const lastAnalyzedVideoTimeRef = useRef<number | null>(null);
  const tracker = useRef(new MotionEventTracker());
  const objectWorkspace = useRef(createMovingObjectWorkspace());
  const objectTracker = useRef(new ObjectTracker());
  const latencySamples = useRef(new LatencySamples(maxLatencySamples));
  const motionWorkerRef = useRef<ReturnType<typeof createMotionWorker> | null>(null);

  const [status, setStatus] = useState('No video selected');
  const [sourceReady, setSourceReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [threshold, setThreshold] = useState(20);
  const [resolutionPreset, setResolutionPreset] = useState<ResolutionPreset>('1080p');
  const resolutionPresetRef = useRef(resolutionPreset);
  const [processingSize, setProcessingSize] = useState({ width: 0, height: 0 });
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [effectiveResolutionPreset, setEffectiveResolutionPreset] = useState<ResolutionPreset>('1080p');
  const [frameSamplingRate, setFrameSamplingRate] = useState(1);
  const [maskPreviewEnabled, setMaskPreviewEnabled] = useState(false);
  const [maskPreview, setMaskPreview] = useState<MotionMaskPreviewData | null>(null);
  const lastMaskPreviewAtRef = useRef(0);
  const frameSamplingRateRef = useRef(1);
  const [lastAdaptiveAction, setLastAdaptiveAction] = useState<AdaptiveControllerAction>('keep');
  const adaptiveEnabledRef = useRef(false);
  const effectiveResolutionRef = useRef(effectiveResolutionPreset);
  const thresholdRef = useRef(threshold);
  const [roi, setRoiState] = useState(defaultRoi);
  const roiRef = useRef(roi);
  const [fps, setFps] = useState(0);
  const [wasmLatency, setWasmLatency] = useState(0);
  const [endToEndLatency, setEndToEndLatency] = useState(0);
  const [p95, setP95] = useState(0);
  const [p99, setP99] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [activeThreads, setActiveThreads] = useState(1);
  const [threadMode, setThreadModeState] = useState<ThreadMode>('manual');
  const [threadStatus, setThreadStatus] = useState('Manual');
  const [motion, setMotion] = useState(0);
  const [events, setEvents] = useState<MotionEvent[]>([]);
  const [movingObjects, setMovingObjects] = useState<TrackedMovingObject[]>([]);
  const [detectedObjects, setDetectedObjects] = useState<MovingObject[]>([]);
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>({
    crossOriginIsolated: false,
    sharedArrayBuffer: false,
    webAssembly: false,
    camera: false,
    offscreenCanvas: false,
  });
  const runtimeStatus: RuntimeStatus = {
    wasmEngine: 'active',
    canvasCapture: 'active',
    canvasRender: 'active',
    roiFiltering: 'active',
    cameraInput: 'inactive',
    offscreenCanvasWorker: motionWorkerRef.current ? 'active' : 'inactive',
    pthreads: browserStatus.crossOriginIsolated && browserStatus.sharedArrayBuffer ? 'available' : 'unavailable',
    activeThreads,
  };
  const adaptiveControllerRef = useRef(createAdaptiveControllerState());
  const dashboardRef = useRef({ fps: 0, wasmLatency: 0, endToEndLatency: 0, p95: 0, p99: 0, motion: 0 });

  useEffect(() => {
    const nextStatus = {
      crossOriginIsolated: globalThis.crossOriginIsolated === true,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined',
      camera: Boolean(navigator.mediaDevices?.getUserMedia),
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    };
    setBrowserStatus(nextStatus);
    dashboardTimerRef.current = window.setInterval(() => {
      const snapshot = dashboardRef.current;
      setFps(snapshot.fps); setWasmLatency(snapshot.wasmLatency); setEndToEndLatency(snapshot.endToEndLatency);
      setP95(snapshot.p95); setP99(snapshot.p99); setMotion(snapshot.motion);
    }, 200);
    // Keep the user-selected default (one thread). Auto-thread calibration is
    // intentionally separate and must not silently override this preference.
    return () => { if (dashboardTimerRef.current !== null) window.clearInterval(dashboardTimerRef.current); };
  }, []);

  function updateThreadCount(value: number) {
    setThreadModeState('manual');
    setThreadStatus('Applying');
    const next = Math.max(1, Math.min(4, Math.floor(value)));
    latencySamples.current.reset();
    setP95(0);
    setP99(0);
    void configureWasmThreads(next).then((actual) => { setActiveThreads(actual); setThreadStatus('Manual'); }).catch((error) => {
      setStatus(error instanceof Error ? error.message : 'Unable to change WASM thread count');
      setThreadStatus('Error');
    });
  }

  async function updateThreadMode(mode: ThreadMode) {
    setThreadModeState(mode);
    if (mode === 'manual') { setThreadStatus('Manual'); return; }
    if (!sourceReady || !sourceRef.current || !videoRef.current) { setThreadStatus('Auto: start analysis to calibrate'); return; }
    setThreadStatus('Calibrating');
  }

  function updateThreshold(value: number) {
    const nextThreshold = clampThreshold(value);
    thresholdRef.current = nextThreshold;
    setThreshold(nextThreshold);
  }

  function setRoi(nextRoi: ROI) {
    const next = clampRoi(nextRoi);
    roiRef.current = next;
    setRoiState(next);
  }

  function updateResolutionPreset(next: ResolutionPreset) {
    resolutionPresetRef.current = next;
    setResolutionPreset(next);
  }

  function updateAdaptiveEnabled(enabled: boolean) {
    adaptiveEnabledRef.current = enabled;
    setAdaptiveEnabled(enabled);
    resetAdaptiveController(adaptiveControllerRef.current);
    setLastAdaptiveAction('keep');
    frameSamplingRateRef.current = 1;
    setFrameSamplingRate(1);
    if (!enabled) {
      effectiveResolutionRef.current = resolutionPresetRef.current;
      setEffectiveResolutionPreset(resolutionPresetRef.current);

      const video = videoRef.current;
      const source = sourceRef.current;
      if (video && source && video.videoWidth > 0 && video.videoHeight > 0) {
        const nextSize = getProcessingSize(video.videoWidth, video.videoHeight, resolutionPresetRef.current);
        source.width = nextSize.width;
        source.height = nextSize.height;
        setProcessingSize(nextSize);
        latencySamples.current.reset();
        setP95(0);
        setP99(0);
        if (runningRef.current && !motionWorkerRef.current) void resetWasm();
      }
    }
  }

  useEffect(() => () => {
    stopAnalysis();
    sourceRequestRef.current++;
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
  }, []);

  function stopAnalysis(statusText?: string) {
    runningRef.current = false;
    runIdRef.current++;
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    if (videoFrameRequestRef.current !== null) {
      const video = videoRef.current as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void } | null;
      video?.cancelVideoFrameCallback?.(videoFrameRequestRef.current);
      videoFrameRequestRef.current = null;
    }
    videoRef.current?.pause();
    motionWorkerRef.current?.terminate();
    motionWorkerRef.current = null;
    setRunning(false);
    if (statusText) setStatus(statusText);
  }

  async function selectVideo(file?: File) {
    if (!file || !videoRef.current) return;

    const requestId = ++sourceRequestRef.current;
    stopAnalysis();
    setSourceReady(false);
    setStatus('Loading video metadata');

    const video = videoRef.current;
    video.pause();
    video.removeAttribute('src');
    video.load();

    // A new video starts a fresh timeline; restarting same video preserves it.
    tracker.current.reset();
    setEvents([]);
    setMovingObjects([]);
    setDetectedObjects([]);
    objectTracker.current.reset();
    setProcessingSize({ width: 0, height: 0 });
    setMotion(0);
    setFps(0);
    setWasmLatency(0);
    setEndToEndLatency(0);
    setP95(0);
    setP99(0);
    setDroppedFrames(0);
    setMaskPreview(null);
    lastAnalyzedVideoTimeRef.current = null;
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }

    const videoObjectUrl = URL.createObjectURL(file);
    videoObjectUrlRef.current = videoObjectUrl;
    try {
      const metadataPromise = new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Unable to load selected video.')); };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
        };
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        video.addEventListener('error', onError, { once: true });
      });
      video.src = videoObjectUrl;
      video.load();
      await metadataPromise;
      if (requestId !== sourceRequestRef.current) return;
      if (!video.videoWidth || !video.videoHeight) throw new Error('Video has no usable dimensions.');
      setSourceReady(true);
      setStatus('Video ready');
    } catch (error) {
      if (requestId !== sourceRequestRef.current) return;
      setStatus(error instanceof Error ? error.message : 'Unable to load selected video.');
    }
  }

  async function start() {
    if (runningRef.current) return;

    if (!sourceReady || !videoRef.current?.src) {
      setStatus('Select a video first');
      return;
    }

    const runId = ++runIdRef.current;
    const video = videoRef.current;
    const workerSupported = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';

    // Stop can pause the video, so every new analysis run must resume playback.
    try {
      setStatus('Preparing motion engine');
      if (!workerSupported) await resetWasm();
      if (runId !== runIdRef.current) return;
      await video.play();
    } catch {
      stopAnalysis('Unable to start motion engine or play video');
      setSourceReady(false);
      return;
    }

    if (runId !== runIdRef.current) return;

    setRunning(true);
    runningRef.current = true;

    const source = sourceRef.current;
    const ctx = source?.getContext('2d', { willReadFrequently: true });
    if (!source || !ctx) {
      stopAnalysis('Canvas is unavailable');
      return;
    }

    const size = getProcessingSize(video.videoWidth, video.videoHeight, resolutionPresetRef.current);
    resetAdaptiveController(adaptiveControllerRef.current);
    setLastAdaptiveAction('keep');
    frameSamplingRateRef.current = 1;
    setFrameSamplingRate(1);
    effectiveResolutionRef.current = resolutionPresetRef.current;
    setEffectiveResolutionPreset(resolutionPresetRef.current);
    source.width = size.width;
    source.height = size.height;
    setProcessingSize(size);
    setStatus('Analyzing');

    if (workerSupported) motionWorkerRef.current = createMotionWorker();

    if (threadMode === 'auto' && !workerSupported) {
      ctx.drawImage(video, 0, 0, source.width, source.height);
      const calibrationImage = ctx.getImageData(0, 0, source.width, source.height);
      const results: Array<{ threads: number; latency: number }> = [];
      for (const candidate of threadCandidates) {
        await configureWasmThreads(candidate);
        await resetWasm();
        const started = performance.now();
        await processWithWasm(calibrationImage, thresholdRef.current);
        results.push({ threads: candidate, latency: performance.now() - started });
      }
      const selected = chooseFastestThread(results);
      await configureWasmThreads(selected);
      setActiveThreads(selected);
      await resetWasm();
      setThreadStatus(`Auto: ${selected} thread${selected === 1 ? '' : 's'}`);
    } else if (threadMode === 'auto' && workerSupported) {
      setActiveThreads(1);
      setThreadStatus('Worker: 1 thread');
    }

    let last = performance.now();
    let frames = 0;
    let lastDroppedFrames = 0;
    let decodedFrames = 0;
    latencySamples.current.reset();
    lastAnalyzedVideoTimeRef.current = null;
    setP95(0);
    setP99(0);

    let frameInFlight = false;
    const scheduleNext = () => {
      if (!runningRef.current || runId !== runIdRef.current) return;
      const videoWithCallback = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime: number }) => void) => number;
      };
      if (videoWithCallback.requestVideoFrameCallback) {
        videoFrameRequestRef.current = videoWithCallback.requestVideoFrameCallback((_now, metadata) => { void loop(metadata.mediaTime); });
      } else {
        frameRequestRef.current = requestAnimationFrame(() => void loop(video.currentTime));
      }
    };

    const loop = async (callbackMediaTime?: number) => {
      if (!runningRef.current || runId !== runIdRef.current) return;
      if (frameInFlight) return;
      frameInFlight = true;
      decodedFrames += 1;
      const samplingRate = frameSamplingRateRef.current;
      if (samplingRate > 1 && decodedFrames % samplingRate !== 0) {
        frameInFlight = false;
        scheduleNext();
        return;
      }

      // Hidden source canvas provides pixels; output canvas displays processed data.
      try {
        // requestAnimationFrame is a fallback scheduler; avoid processing the same
        // decoded video frame more than once when playback is slower than the UI.
        const videoTime = callbackMediaTime ?? video.currentTime;
        if (lastAnalyzedVideoTimeRef.current === videoTime) {
          frameInFlight = false;
          scheduleNext();
          return;
        }
        const frameStarted = performance.now();
        const minObjectArea = Math.max(4, Math.round(minObjectAreaRatio * source.width * source.height));
        let nextWasmLatency: number;
        let ratio: number;
        let frameObjects: MovingObject[];
        if (motionWorkerRef.current) {
          const bitmap = await createImageBitmap(video);
          const includeMask = maskPreviewEnabled;
          const workerResult = await motionWorkerRef.current.process(bitmap, source.width, source.height, thresholdRef.current, roiRef.current, minObjectArea, includeMask);
          if (workerResult.type !== 'result') throw new Error(workerResult.message ?? 'Motion worker failed.');
          nextWasmLatency = workerResult.engineMs ?? 0;
          frameObjects = (workerResult.objects ?? []).map((object) => ({ ...object, meanIntensity: 255, maxIntensity: 255 }));
          const roiPixels = Math.max(1, roiRef.current.width * roiRef.current.height * source.width * source.height);
          ratio = (workerResult.validMotionPixelsInRoi ?? 0) / roiPixels;
          if (includeMask && workerResult.maskData && workerResult.maskWidth && workerResult.maskHeight) { lastMaskPreviewAtRef.current = performance.now(); setMaskPreview({ width: workerResult.maskWidth, height: workerResult.maskHeight, data: workerResult.maskData }); }
        } else {
          ctx.drawImage(video, 0, 0, source.width, source.height);
          const image = ctx.getImageData(0, 0, source.width, source.height);
          const result = await processWithWasm(image, thresholdRef.current);
          nextWasmLatency = result.metrics.engineMs;
          const currentRoi = roiRef.current;
          const analysis = detectMovingObjects(result.mask, currentRoi, minObjectArea, objectWorkspace.current);
          frameObjects = analysis.objects;
          const roiPixels = Math.max(1, currentRoi.width * currentRoi.height * image.width * image.height);
          ratio = analysis.validMotionPixelsInRoi / roiPixels;
          if (maskPreviewEnabled) {
            lastMaskPreviewAtRef.current = performance.now();
            const maskData = new Uint8Array(result.mask.width * result.mask.height);
            for (let index = 0; index < maskData.length; index += 1) maskData[index] = result.mask.data[index * 4];
            setMaskPreview({ width: result.mask.width, height: result.mask.height, data: maskData });
          }
        }
       if (!runningRef.current || runId !== runIdRef.current) return;
       lastAnalyzedVideoTimeRef.current = videoTime;

        // Normalize detected pixels against selected ROI area.
         setDetectedObjects(frameObjects);
         const trackedObjects = objectTracker.current.update(mergeMovingObjects(frameObjects));
        setMovingObjects(trackedObjects);
        const representativeObject = trackedObjects.reduce<MotionEventObjectSnapshot | undefined>((best, object) => {
          if (best && best.area >= object.area) return best;
          return { bbox: object.bbox, centroid: object.centroid, area: object.area, trackId: object.id, meanIntensity: object.meanIntensity, maxIntensity: object.maxIntensity };
        }, undefined);
       const nextEndToEndLatency = performance.now() - frameStarted;
       latencySamples.current.add(nextEndToEndLatency);
         const update = tracker.current.update(videoTime, ratio, eventStartRatio, nextWasmLatency, nextEndToEndLatency, eventContinueRatio, representativeObject);

       // Tracker turns continuous motion into discrete timeline events.
       if (update) setEvents((current) => update.kind === 'started'
         ? [update.event, ...current]
         : current.map((item) => item.id === update.event.id ? update.event : item));

       dashboardRef.current.motion = Math.round(ratio * 10000) / 100;
       dashboardRef.current.wasmLatency = Math.round(nextWasmLatency * 100) / 100;
       dashboardRef.current.endToEndLatency = Math.round(nextEndToEndLatency * 100) / 100;
      frames++;

      const now = performance.now();
      // Report FPS over one-second windows to avoid noisy per-frame values.
      if (now - last >= 1000) {
        const windowFps = (frames * 1000) / (now - last);
         dashboardRef.current.fps = windowFps;
        const quality = video.getVideoPlaybackQuality?.();
        const totalDroppedFrames = quality?.droppedVideoFrames ?? lastDroppedFrames;
        const windowDroppedFrames = Math.max(0, totalDroppedFrames - lastDroppedFrames);
        lastDroppedFrames = totalDroppedFrames;
        setDroppedFrames((current) => current + windowDroppedFrames);
        const [currentP95, currentP99] = latencySamples.current.percentiles(0.95, 0.99);
         dashboardRef.current.p95 = currentP95;
         dashboardRef.current.p99 = currentP99;
         if (adaptiveEnabledRef.current && currentP95 > 0) {
           const decision = updateAdaptiveController(adaptiveControllerRef.current, {
             now,
             p95Latency: currentP95,
             fps: windowFps,
             droppedFramesDelta: windowDroppedFrames,
             currentResolution: effectiveResolutionRef.current,
             requestedResolution: resolutionPresetRef.current,
             currentFrameSamplingRate: frameSamplingRateRef.current,
             maxFrameSamplingRate: 4,
           }, defaultAdaptiveControllerConfig);
           setLastAdaptiveAction(decision.action);
           if (decision.frameSamplingRate !== frameSamplingRateRef.current) {
             frameSamplingRateRef.current = decision.frameSamplingRate;
             setFrameSamplingRate(decision.frameSamplingRate);
           }
           if (decision.resolution !== effectiveResolutionRef.current) {
             effectiveResolutionRef.current = decision.resolution;
             setEffectiveResolutionPreset(decision.resolution);
             const nextSize = getProcessingSize(video.videoWidth, video.videoHeight, decision.resolution);
            source.width = nextSize.width;
            source.height = nextSize.height;
            setProcessingSize(nextSize);
            latencySamples.current.reset();
            setP95(0);
            setP99(0);
            if (!motionWorkerRef.current) await resetWasm();
          }
        }
        frames = 0;
        last = now;
      }

        frameInFlight = false;
        scheduleNext();
      } catch (error) {
        frameInFlight = false;
        if (runningRef.current && runId === runIdRef.current) stopAnalysis(error instanceof Error ? error.message : 'Frame processing failed');
      }
    };

    scheduleNext();
  }

  function stop() {
    const update = tracker.current.finish();
    if (update) setEvents((current) => current.map((item) => item.id === update.event.id ? update.event : item));
    stopAnalysis('Stopped');
  }

  function exportEventsJson() { downloadTextFile(createEventJson(events), `motionguard-events-${Date.now()}.json`, 'application/json;charset=utf-8'); }
  function exportEventsCsv() { downloadTextFile(createEventCsv(events), `motionguard-events-${Date.now()}.csv`, 'text/csv;charset=utf-8'); }

  return {
    videoRef,
    sourceRef,
    status,
    running,
    sourceReady,
    threshold,
    resolutionPreset,
    setResolutionPreset: updateResolutionPreset,
    processingSize,
    adaptiveEnabled,
    effectiveResolutionPreset,
    setAdaptiveEnabled: updateAdaptiveEnabled,
    setThreshold: updateThreshold,
    roi,
    setRoi,
    fps,
    wasmLatency,
    endToEndLatency,
    p95,
    p99,
    droppedFrames,
    frameSamplingRate,
    maskPreviewEnabled,
    setMaskPreviewEnabled,
    maskPreview,
    lastAdaptiveAction,
    motion,
    events,
    movingObjects,
    detectedObjects,
    browserStatus,
    runtimeStatus,
    activeThreads,
    threadMode,
    threadStatus,
    setThreadMode: updateThreadMode,
    setThreadCount: updateThreadCount,
    selectVideo,
    start,
    stop,
    exportEventsJson,
    exportEventsCsv,
  };
}
