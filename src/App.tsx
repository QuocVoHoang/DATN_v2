import { AppHeader } from './components/AppHeader';
import { EventTimeline } from './components/EventTimeline';
import { TelemetryPanel } from './components/TelemetryPanel';
import { Toolbar } from './components/Toolbar';
import { VideoStage } from './components/VideoStage';
import { useMotionAnalysis } from './hooks/useMotionAnalysis';

export default function App() {
  const motion = useMotionAnalysis();

  return (
    <main className="mx-auto min-h-screen w-full px-5 bg-[#f7faf8] font-sans text-[#18231f]">
      <AppHeader
        running={motion.running}
        status={motion.status}
      />

      <section className="flex flex-row items-start gap-5 max-[800px]:flex-col">
        <div className="w-full flex-1">
          <VideoStage
             media={{ videoRef: motion.videoRef, sourceRef: motion.sourceRef }}
            overlay={{ roi: motion.roi, onRoiChange: motion.setRoi, movingObjects: motion.movingObjects }}
          />
        </div>

        <div className="w-full flex-1">
          <Toolbar
            source={{
              running: motion.running,
              ready: motion.sourceReady,
              selectVideo: motion.selectVideo,
              start: motion.start,
              stop: motion.stop
            }}
            processing={{ threshold: motion.threshold, resolutionPreset: motion.resolutionPreset, effectiveResolutionPreset: motion.effectiveResolutionPreset, adaptiveEnabled: motion.adaptiveEnabled, onThresholdChange: motion.setThreshold, onResolutionChange: motion.setResolutionPreset }}
             adaptive={{ enabled: motion.adaptiveEnabled, onEnabledChange: motion.setAdaptiveEnabled }}
          />

          <TelemetryPanel
            metrics={{ fps: motion.fps, wasmLatency: motion.wasmLatency, endToEndLatency: motion.endToEndLatency, p95: motion.p95, p99: motion.p99, droppedFrames: motion.droppedFrames, motion: motion.motion }}
            quality={{ processingSize: motion.processingSize, adaptiveEnabled: motion.adaptiveEnabled, effectiveResolutionPreset: motion.effectiveResolutionPreset }}
            pipeline={{ browserStatus: motion.browserStatus, runtimeStatus: motion.runtimeStatus }}
            onThreadCountChange={motion.setThreadCount}
            threadMode={motion.threadMode}
            threadStatus={motion.threadStatus}
            onThreadModeChange={motion.setThreadMode}
          />
        </div>
      </section>
      <div className="flex justify-center gap-5 max-[800px]:flex-col">
        <EventTimeline events={motion.events} onExportJson={motion.exportEventsJson} onExportCsv={motion.exportEventsCsv} />
      </div>
    </main>
  );
}
