type Props = { running: boolean; ready: boolean; selectVideo: (file?: File) => void; start: () => void; stop: () => void };

export function SourceControls({ running, ready, selectVideo, start, stop }: Props) {
  const actionClass = 'cursor-pointer rounded border border-[#70927f] px-[18px] py-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-35';
  return <>
    <label className={`${actionClass} bg-[#8bd66d] text-[#132018]`}>Choose video<input className="hidden" type="file" accept="video/mp4,video/*" onChange={(e) => void selectVideo(e.target.files?.[0])} /></label>
    <button className={`${actionClass} bg-[#8bd66d] text-[#132018]`} onClick={() => void start()} disabled={running || !ready}>Start</button>
    <button className={`${actionClass} bg-transparent text-[#294238]`} onClick={stop} disabled={!running}>Stop</button>
  </>;
}
