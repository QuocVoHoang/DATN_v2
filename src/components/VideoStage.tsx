import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { moveRoi, resizeRoi, type ROI } from '../features/roi';
import type { TrackedMovingObject } from '../features/objectTracking';
import type { MovingObject } from '../features/movingObjects';
import type { MotionMaskPreviewData } from './MotionMaskPreview';

type VideoStageProps = {
  media: {
    videoRef: RefObject<HTMLVideoElement | null>;
    sourceRef: RefObject<HTMLCanvasElement | null>;
  };
  overlay: {
    roi: ROI;
    onRoiChange: (roi: ROI) => void;
    movingObjects: TrackedMovingObject[];
    detectedObjects: MovingObject[];
    maskPreview: MotionMaskPreviewData | null;
    maskPreviewEnabled: boolean;
  };
};

export function VideoStage({ media, overlay }: VideoStageProps) {
  const { videoRef, sourceRef } = media;
  const { roi, onRoiChange, movingObjects, detectedObjects, maskPreview, maskPreviewEnabled } =
    overlay;
  const stageRef = useRef<HTMLDivElement>(null);
  const roiRef = useRef(roi);
  const interactionRef = useRef<{
    mode: 'move' | 'resize';
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  roiRef.current = roi;
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !maskPreviewEnabled || !maskPreview) return;
    canvas.width = maskPreview.width;
    canvas.height = maskPreview.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const pixels = new Uint8ClampedArray(maskPreview.width * maskPreview.height * 4);
    for (let i = 0; i < maskPreview.data.length; i += 1) {
      const value = maskPreview.data[i];
      const offset = i * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
    context.putImageData(new ImageData(pixels, maskPreview.width, maskPreview.height), 0, 0);
  }, [maskPreview, maskPreviewEnabled]);

  function beginInteraction(event: PointerEvent, mode: 'move' | 'resize') {
    event.preventDefault();
    event.stopPropagation();
    interactionRef.current = {
      mode,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
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
    const nextRoi =
      interaction.mode === 'move' ? moveRoi(currentRoi, dx, dy) : resizeRoi(currentRoi, dx, dy);
    roiRef.current = nextRoi;
    onRoiChange(nextRoi);
  }

  function endInteraction(event: PointerEvent) {
    if (interactionRef.current?.pointerId === event.pointerId) interactionRef.current = null;
  }

  return (
    <div
      ref={stageRef}
      className="relative grid min-w-0 w-full place-items-center overflow-hidden bg-[#edf3ef]"
    >
      <video
        ref={videoRef}
        className={maskPreviewEnabled ? 'hidden' : 'block h-auto w-full'}
        muted
        loop
        playsInline
        preload="metadata"
      />
      {maskPreviewEnabled && (
        <canvas
          ref={maskCanvasRef}
          className="block h-auto w-full bg-black"
          aria-label="Motion mask"
        />
      )}
      {(maskPreviewEnabled ? detectedObjects : movingObjects).map((object, index) => (
        <div
          key={
            maskPreviewEnabled
              ? `component-${index}`
              : `track-${(object as TrackedMovingObject).id}`
          }
          className="pointer-events-none absolute inset-0"
          aria-label={
            maskPreviewEnabled
              ? `Motion component ${index + 1}`
              : `Tracked object ${(object as TrackedMovingObject).id}`
          }
        >
          <div
            className="absolute border border-[#f08c3a]"
            style={{
              left: `${object.bbox.x * 100}%`,
              top: `${object.bbox.y * 100}%`,
              width: `${object.bbox.width * 100}%`,
              height: `${object.bbox.height * 100}%`,
            }}
          >
            <span className="absolute -top-4 -left-px bg-[#f08c3a] px-1 font-mono text-[9px] text-white">
              {maskPreviewEnabled ? `#${index + 1}` : `#${(object as TrackedMovingObject).id}`}
            </span>
            <span
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f08c3a]"
              style={{
                left: `${((object.centroid.x - object.bbox.x) / Math.max(object.bbox.width, 0.0001)) * 100}%`,
                top: `${((object.centroid.y - object.bbox.y) / Math.max(object.bbox.height, 0.0001)) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
      <div
        className="absolute cursor-move border border-dashed border-[#6ab94f] touch-none"
        style={{
          left: `${roi.x * 100}%`,
          top: `${roi.y * 100}%`,
          width: `${roi.width * 100}%`,
          height: `${roi.height * 100}%`,
        }}
        onPointerDown={(event) => beginInteraction(event, 'move')}
        onPointerMove={updateInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      >
        <span className="absolute -top-5.5 -left-px whitespace-nowrap font-mono text-[10px] text-[#4c8f36]">
          ROI · REGION OF INTEREST
        </span>
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
