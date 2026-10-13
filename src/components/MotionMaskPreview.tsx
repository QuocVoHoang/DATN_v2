import { useEffect, useRef } from 'react';

export type MotionMaskPreviewData = {
  width: number;
  height: number;
  data: Uint8Array;
};

export function MotionMaskPreview({
  data,
  enabled,
  samplingRate,
}: {
  data: MotionMaskPreviewData | null;
  enabled: boolean;
  samplingRate: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !enabled) return;
    canvas.width = data.width;
    canvas.height = data.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const pixels = new Uint8ClampedArray(data.width * data.height * 4);
    for (let i = 0; i < data.data.length; i += 1) {
      const value = data.data[i];
      const offset = i * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
    context.putImageData(new ImageData(pixels, data.width, data.height), 0, 0);
  }, [data, enabled]);
  if (!enabled) return null;
  return (
    <section className="mt-5 border border-[#d7e1dc] bg-white p-4">
      <div className="mb-2 flex flex-wrap justify-between gap-2 font-mono text-[11px] tracking-[0.12em] text-[#587168]">
        <span>MOTION MASK PREVIEW</span>
        <span className="tracking-normal">
          {data
            ? `${data.width}×${data.height} · sampling 1/${samplingRate}`
            : 'Waiting for analyzed frame'}
        </span>
      </div>
      <div className="overflow-hidden bg-black">
        <canvas
          ref={canvasRef}
          className="block h-auto max-h-90 w-full object-contain"
          aria-label="Motion mask preview"
        />
      </div>
      <p className="mt-2 text-[11px] text-[#60736c]">
        Trắng: pixel chuyển động · Đen: không chuyển động.
      </p>
    </section>
  );
}
