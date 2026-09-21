import type { ResolutionPreset } from '../features/processingResolution';
import { SourceControls } from './toolbar/SourceControls';
import { ProcessingControls } from './toolbar/ProcessingControls';
import { AdaptiveControls } from './toolbar/AdaptiveControls';

type ToolbarProps = {
  source: { running: boolean; ready: boolean; selectVideo: (file?: File) => void; start: () => void; stop: () => void };
  processing: { threshold: number; resolutionPreset: ResolutionPreset; effectiveResolutionPreset: ResolutionPreset; adaptiveEnabled: boolean; onThresholdChange: (value: number) => void; onResolutionChange: (value: ResolutionPreset) => void };
  adaptive: { enabled: boolean; onEnabledChange: (value: boolean) => void };
};

export function Toolbar({ source, processing, adaptive }: ToolbarProps) {
  return <section className="flex flex-wrap items-center gap-3 py-5">
    <SourceControls {...source} />
    <ProcessingControls running={source.running} {...processing} />
    <AdaptiveControls {...adaptive} />
  </section>;
}
