import type { ResolutionPreset } from '../features/processingResolution';
import { SourceControls } from './toolbar/SourceControls';
import { ProcessingControls } from './toolbar/ProcessingControls';
import { AdaptiveControls } from './toolbar/AdaptiveControls';

type ToolbarProps = {
  source: { running: boolean; ready: boolean; selectVideo: (file?: File) => void; start: () => void; stop: () => void };
  processing: { threshold: number; resolutionPreset: ResolutionPreset; effectiveResolutionPreset: ResolutionPreset; adaptiveEnabled: boolean; onThresholdChange: (value: number) => void; onResolutionChange: (value: ResolutionPreset) => void };
  adaptive: { enabled: boolean; onEnabledChange: (value: boolean) => void; maskPreviewEnabled: boolean; onMaskPreviewChange: (value: boolean) => void };
};

export function Toolbar({ source, processing, adaptive }: ToolbarProps) {
  return <section className="flex flex-wrap items-center gap-3 py-5">
    <SourceControls {...source} />
    <ProcessingControls running={source.running} {...processing} />
    <AdaptiveControls {...adaptive} />
    <label className="font-mono text-xs text-[#60736c]">
      <input
        type="checkbox"
        className="mr-2"
        checked={adaptive.maskPreviewEnabled}
        onChange={(event) => adaptive.onMaskPreviewChange(event.target.checked)}
      />
      motion mask mode
    </label>
  </section>;
}
