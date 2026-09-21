export type ROI = { x: number; y: number; width: number; height: number };
import type { MotionMask } from '../engine/motionTypes';

const minRoiSize = 0.05;

export function clampRoi(roi: ROI): ROI {
  const width = Math.min(1, Math.max(minRoiSize, Number.isFinite(roi.width) ? roi.width : minRoiSize));
  const height = Math.min(1, Math.max(minRoiSize, Number.isFinite(roi.height) ? roi.height : minRoiSize));
  const x = Math.min(1 - width, Math.max(0, Number.isFinite(roi.x) ? roi.x : 0));
  const y = Math.min(1 - height, Math.max(0, Number.isFinite(roi.y) ? roi.y : 0));

  return { x, y, width, height };
}

export function moveRoi(roi: ROI, dx: number, dy: number): ROI {
  return clampRoi({ ...roi, x: roi.x + dx, y: roi.y + dy });
}

export function resizeRoi(roi: ROI, dw: number, dh: number): ROI {
  return clampRoi({ ...roi, width: roi.width + dw, height: roi.height + dh });
}

export function countPixelsInRoi(image: MotionMask, roi: ROI): number {
  const x0 = Math.max(0, Math.floor(roi.x * image.width));
  const y0 = Math.max(0, Math.floor(roi.y * image.height));
  const x1 = Math.min(image.width, Math.ceil((roi.x + roi.width) * image.width));
  const y1 = Math.min(image.height, Math.ceil((roi.y + roi.height) * image.height));
  let count = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (image.data[(y * image.width + x) * 4] > 0) count++;
  return count;
}
