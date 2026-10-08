import { describe, expect, it } from 'vitest';
import { createMovingObjectWorkspace, detectMovingObjects } from './movingObjects';
import type { MotionMask } from '../engine/motionTypes';

function mask(width: number, height: number, pixels: Array<[number, number]>): MotionMask {
  const data = new Uint8Array(width * height * 4);
  for (const [x, y] of pixels) data[(y * width + x) * 4] = 255;
  return { width, height, data };
}

const fullRoi = { x: 0, y: 0, width: 1, height: 1 };

describe('moving object connected components', () => {
  it('connects diagonally adjacent motion pixels', () => {
    const result = detectMovingObjects(mask(2, 2, [[0, 0], [1, 1]]), fullRoi, 1, createMovingObjectWorkspace());
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({ area: 2, bbox: { x: 0, y: 0, width: 1, height: 1 }, centroid: { x: 0.25, y: 0.25 } });
  });

  it('filters components smaller than minArea', () => {
    const result = detectMovingObjects(mask(3, 3, [[1, 1]]), fullRoi, 2, createMovingObjectWorkspace());
    expect(result.objects).toHaveLength(0);
    expect(result.changedPixelsInRoi).toBe(1);
    expect(result.validMotionPixelsInRoi).toBe(0);
  });

  it('calculates area, bounding box, and centroid', () => {
    const result = detectMovingObjects(mask(4, 4, [[1, 1], [2, 1], [1, 2], [2, 2]]), fullRoi, 1, createMovingObjectWorkspace());
    expect(result.objects[0]).toMatchObject({ area: 4, bbox: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, centroid: { x: 0.375, y: 0.375 } });
  });

  it('detects only motion inside the ROI', () => {
    const result = detectMovingObjects(mask(4, 4, [[0, 0], [2, 2]]), { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }, 1, createMovingObjectWorkspace());
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].centroid).toEqual({ x: 0.5, y: 0.5 });
    expect(result.changedPixelsInRoi).toBe(1);
  });
});
