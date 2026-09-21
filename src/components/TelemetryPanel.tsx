import { Metric } from './Metric';

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

type TelemetryPanelProps = {
  metrics: { fps: number; wasmLatency: number; endToEndLatency: number; p95: number; p99: number; droppedFrames: number; motion: number };
  quality: { processingSize: { width: number; height: number }; adaptiveEnabled: boolean; effectiveResolutionPreset: string };
  pipeline: { browserStatus: BrowserStatus; runtimeStatus: RuntimeStatus };
  onThreadCountChange: (count: number) => void;
  threadMode: 'auto' | 'manual';
  threadStatus: string;
  onThreadModeChange: (mode: 'auto' | 'manual') => void;
};

export function TelemetryPanel({ metrics, quality, pipeline, onThreadCountChange, threadMode, threadStatus, onThreadModeChange }: TelemetryPanelProps) {
  const { fps, wasmLatency, endToEndLatency, p95, p99, droppedFrames, motion } = metrics;
  const { processingSize, adaptiveEnabled, effectiveResolutionPreset } = quality;
  const { browserStatus, runtimeStatus } = pipeline;
  return <aside className="border border-[#d7e1dc] p-5">
    <div className="mb-4.5 font-mono text-[11px] tracking-[0.14em] text-[#587168]">LIVE TELEMETRY</div>
    <div className="grid grid-cols-2 gap-x-10 max-[600px]:grid-cols-2 max-[400px]:grid-cols-1">
      <Metric label="FPS" value={fps.toFixed(1)} unit="fps" />
      <Metric label="Motion in ROI" value={motion.toFixed(2)} unit="%" />
      <Metric label="WASM latency" value={wasmLatency.toFixed(2)} unit="ms" />
      <Metric label="End-to-end latency" value={endToEndLatency.toFixed(2)} unit="ms" />
      <Metric label="P95 latency" value={p95.toFixed(2)} unit="ms" />
      <Metric label="P99 latency" value={p99.toFixed(2)} unit="ms" />
      {/* <Metric label="Dropped frames" value={droppedFrames.toString()} unit="frames" /> */}
      <Metric label="Processing size" value={processingSize.width ? `${processingSize.width}x${processingSize.height}` : '-'} unit="px" />
      {/* <Metric label="Adaptive quality" value={adaptiveEnabled ? 'ON' : 'OFF'} unit="" /> */}
      <Metric label="Effective resolution" value={effectiveResolutionPreset} unit="" />
    </div>
    <div className="mt-5 border-t border-[#d7e1dc] pt-4">
      <div className="mb-2 font-mono text-[11px] tracking-[0.14em] text-[#587168]">ACTIVE PIPELINE</div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[12px] text-[#60736c]">
        <Status label="WebAssembly engine" value={runtimeStatus.wasmEngine} enabled={runtimeStatus.wasmEngine === 'active'} />
        <Status label="Canvas 2D capture" value={runtimeStatus.canvasCapture} enabled={runtimeStatus.canvasCapture === 'active'} />
        <Status label="Canvas 2D render" value={runtimeStatus.canvasRender} enabled={runtimeStatus.canvasRender === 'active'} />
        <Status label="ROI filtering" value={runtimeStatus.roiFiltering} enabled={runtimeStatus.roiFiltering === 'active'} />
        <Status label="Camera input" value={runtimeStatus.cameraInput} enabled={runtimeStatus.cameraInput === 'active'} />
        <Status label="OffscreenCanvas worker" value={runtimeStatus.offscreenCanvasWorker} enabled={runtimeStatus.offscreenCanvasWorker === 'active'} />
        <Status label="Pthreads runtime" value={runtimeStatus.pthreads} enabled={runtimeStatus.pthreads === 'available'} />
        <div className="flex items-center justify-between gap-2 text-[12px] text-[#60736c]">
          <span>Active threads</span>
          <select className="border border-[#bdccc5] bg-white px-1.5 py-1 text-[#18231f]" value={threadMode === 'auto' ? 'auto' : runtimeStatus.activeThreads} onChange={(event) => {
            if (event.target.value === 'auto') onThreadModeChange('auto');
            else { onThreadModeChange('manual'); onThreadCountChange(Number(event.target.value)); }
          }}>
            <option value="auto">Auto</option>
            {[1, 2, 4].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </div>
        <div className="col-span-2 text-right text-[11px] text-[#587168]">{threadStatus}</div>
      </div>
    </div>
    <div className="mt-5 border-t border-[#d7e1dc] pt-4">
      <div className="mb-2 font-mono text-[11px] tracking-[0.14em] text-[#587168]">BROWSER CAPABILITIES</div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[12px] text-[#60736c]">
        <Status label="COOP/COEP isolated" enabled={browserStatus.crossOriginIsolated} />
        <Status label="SharedArrayBuffer" enabled={browserStatus.sharedArrayBuffer} />
        <Status label="WebAssembly" enabled={browserStatus.webAssembly} />
        <Status label="Camera API" enabled={browserStatus.camera} />
        <Status label="OffscreenCanvas" enabled={browserStatus.offscreenCanvas} />
      </div>
    </div>
  </aside>;
}

function Status({ label, enabled, value }: { label: string; enabled: boolean; value?: string }) {
  return <div className="flex justify-between gap-2"><span>{label}</span><strong className={enabled ? 'text-[#4c8f36]' : 'text-[#a06a55]'}>{value ?? (enabled ? 'yes' : 'no')}</strong></div>;
}
