import type { ResolutionPreset } from '../../features/processingResolution';
import { resolutionPresets } from '../../features/processingResolution';

type Props = { running: boolean; adaptiveEnabled: boolean; threshold: number; resolutionPreset: ResolutionPreset; effectiveResolutionPreset: ResolutionPreset; onThresholdChange: (value: number) => void; onResolutionChange: (value: ResolutionPreset) => void };

export function ProcessingControls({ running, adaptiveEnabled, threshold, resolutionPreset, effectiveResolutionPreset, onThresholdChange, onResolutionChange }: Props) {
  return <>
    <label className="ml-auto font-mono text-xs text-[#60736c] max-sm:ml-0">Resolution
      <select className="ml-2 border border-[#bdccc5] bg-white p-2.5 text-[#18231f]" value={adaptiveEnabled && running ? effectiveResolutionPreset : resolutionPreset} onChange={(e) => onResolutionChange(e.target.value as ResolutionPreset)} disabled={running}>
        {resolutionPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
      </select>
    </label>
    <label className="font-mono text-xs text-[#60736c]">Threshold
      <input className="ml-2 w-16.25 border border-[#bdccc5] bg-white p-2.5 text-[#18231f]" type="number" min="1" max="255" value={threshold} onChange={(e) => onThresholdChange(Number(e.target.value))} />
    </label>
  </>;
}
