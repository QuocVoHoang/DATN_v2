import { useRef, type PointerEvent, type RefObject } from 'react';
import { moveRoi, resizeRoi, type ROI } from '../features/roi';
import type { MovingObject } from '../features/movingObjects';

type VideoStageProps = {
  media: { videoRef: RefObject<HTMLVideoElement | null>; sourceRef: RefObject<HTMLCanvasElement | null> };
  overlay: { roi: ROI; onRoiChange: (roi: ROI) => void; movingObjects: MovingObject[] };
};

export function VideoStage({ media, overlay }: VideoStageProps) {
  const { videoRef, sourceRef } = media;
  const { roi, onRoiChange, movingObjects } = overlay;
  const stageRef = useRef<HTMLDivElement>(null);
  const roiRef = useRef(roi);
  const interactionRef = useRef<{ mode: 'move' | 'resize'; pointerId: number; x: number; y: number } | null>(null);
  roiRef.current = roi;

  function beginInteraction(event: PointerEvent, mode: 'move' | 'resize') {
    event.preventDefault();
    event.stopPropagation();
    interactionRef.current = { mode, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateInteraction(event: PointerEvent) {
    const interaction = interactionRef.current;
    const stage = stageRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId || !stage) return;

    const rect = stage.getBoundingClientRect();
    const dx = (event.clientX - interaction.x) / rect.width;
    const dy = (event.clientY - interaction.y) / rect.height;
    interaction.x = event.clientX;
    interaction.y = event.clientY;
    const currentRoi = roiRef.current;
    const nextRoi = interaction.mode === 'move' ? moveRoi(currentRoi, dx, dy) : resizeRoi(currentRoi, dx, dy);
    roiRef.current = nextRoi;
    onRoiChange(nextRoi);
  }

  function endInteraction(event: PointerEvent) {
    if (interactionRef.current?.pointerId === event.pointerId) interactionRef.current = null;
  }

  return (
    <div ref={stageRef} className="relative grid min-w-0 w-full place-items-center overflow-hidden bg-[#edf3ef]">
      <video ref={videoRef} className="block h-auto w-full" muted loop playsInline preload="metadata" />
      {movingObjects.map((object) => <div key={object.id} className="pointer-events-none absolute border border-[#f08c3a]" style={{ left: `${object.bbox.x * 100}%`, top: `${object.bbox.y * 100}%`, width: `${object.bbox.width * 100}%`, height: `${object.bbox.height * 100}%` }}>
        <span className="absolute -top-4 -left-px bg-[#f08c3a] px-1 font-mono text-[9px] text-white">#{object.id}</span>
        <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f08c3a]" style={{ left: `${((object.centroid.x - object.bbox.x) / object.bbox.width) * 100}%`, top: `${((object.centroid.y - object.bbox.y) / object.bbox.height) * 100}%` }} />
      </div>)}
      <div 
        className="absolute cursor-move border border-dashed border-[#6ab94f] touch-none"
        style={{ left: `${roi.x * 100}%`, top: `${roi.y * 100}%`, width: `${roi.width * 100}%`, height: `${roi.height * 100}%` }}
        onPointerDown={(event) => beginInteraction(event, 'move')}
        onPointerMove={updateInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      >
        <span className="absolute -top-5.5 -left-px whitespace-nowrap font-mono text-[10px] text-[#4c8f36]">ROI · REGION OF INTEREST</span>
        <span
          aria-label="Resize ROI"
          className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-se-resize bg-[#6ab94f]"
          onPointerDown={(event) => beginInteraction(event, 'resize')}
          onPointerMove={updateInteraction}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
        />
      </div>
      <canvas ref={sourceRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
