type Props = { enabled: boolean; onEnabledChange: (value: boolean) => void };

export function AdaptiveControls({ enabled, onEnabledChange }: Props) {
  return <>
    <label className="font-mono text-xs text-[#60736c]"><input type="checkbox" className="mr-2" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />Adaptive quality</label>
  </>;
}
