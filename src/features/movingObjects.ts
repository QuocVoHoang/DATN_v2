import type { ROI } from './roi';
import type { MotionMask } from '../engine/motionTypes';

export type MovingObject = {
  bbox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  area: number;
  meanIntensity: number;
  maxIntensity: number;
};

export type MovingObjectWorkspace = {
  visited: Uint8Array;
  stack: Int32Array;
  capacity: number;
};
export type MovingObjectAnalysis = {
  objects: MovingObject[];
  changedPixelsInRoi: number;
  validMotionPixelsInRoi: number;
};

const neighborOffsets = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/** Merge nearby motion components before tracking so one moving subject does not
 * appear as a collection of flickering boxes. Coordinates are normalized. */
export function mergeMovingObjects(objects: MovingObject[], gap = 0.025): MovingObject[] {
  const pending = objects.map((object) => ({ ...object }));
  const merged: MovingObject[] = [];
  const touches = (a: MovingObject, b: MovingObject) =>
    a.bbox.x <= b.bbox.x + b.bbox.width + gap &&
    b.bbox.x <= a.bbox.x + a.bbox.width + gap &&
    a.bbox.y <= b.bbox.y + b.bbox.height + gap &&
    b.bbox.y <= a.bbox.y + a.bbox.height + gap;
  while (pending.length) {
    let group = pending.splice(0, 1)[0];
    let changed = true;
    while (changed) {
      changed = false;
      for (let index = pending.length - 1; index >= 0; index--) {
        if (!touches(group, pending[index])) continue;
        const next = pending.splice(index, 1)[0];
        const left = Math.min(group.bbox.x, next.bbox.x);
        const top = Math.min(group.bbox.y, next.bbox.y);
        const right = Math.max(group.bbox.x + group.bbox.width, next.bbox.x + next.bbox.width);
        const bottom = Math.max(group.bbox.y + group.bbox.height, next.bbox.y + next.bbox.height);
        const area = group.area + next.area;
        group = {
          ...group,
          bbox: { x: left, y: top, width: right - left, height: bottom - top },
          centroid: {
            x: (group.centroid.x * group.area + next.centroid.x * next.area) / area,
            y: (group.centroid.y * group.area + next.centroid.y * next.area) / area,
          },
          area,
          meanIntensity: (group.meanIntensity * group.area + next.meanIntensity * next.area) / area,
          maxIntensity: Math.max(group.maxIntensity, next.maxIntensity),
        };
        changed = true;
      }
    }
    merged.push(group);
  }
  return merged;
}
export function createMovingObjectWorkspace(): MovingObjectWorkspace {
  return { visited: new Uint8Array(0), stack: new Int32Array(0), capacity: 0 };
}

export function detectMovingObjects(
  mask: MotionMask,
  roi: ROI,
  minArea: number,
  workspace: MovingObjectWorkspace,
): MovingObjectAnalysis {
  const { width, height, data } = mask;
  const x0 = Math.max(0, Math.floor(roi.x * width));
  const y0 = Math.max(0, Math.floor(roi.y * height));
  const x1 = Math.min(width, Math.ceil((roi.x + roi.width) * width));
  const y1 = Math.min(height, Math.ceil((roi.y + roi.height) * height));
  const pixelCount = width * height;
  if (pixelCount > workspace.capacity) {
    workspace.visited = new Uint8Array(pixelCount);
    workspace.stack = new Int32Array(pixelCount);
    workspace.capacity = pixelCount;
  }
  workspace.visited.fill(0, 0, pixelCount);
  const { visited, stack } = workspace;
  const objects: MovingObject[] = [];
  let changedPixelsInRoi = 0;
  let validMotionPixelsInRoi = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const start = y * width + x;
      if (visited[start] || data[start * 4] === 0) continue;

      visited[start] = 1;
      let stackSize = 0;
      stack[stackSize++] = start;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;
      let sumIntensity = 0;
      let maxIntensity = 0;

      while (stackSize > 0) {
        const index = stack[--stackSize];
        const currentX = index % width;
        const currentY = Math.floor(index / width);
        const intensity = data[index * 4];
        area++;
        sumX += currentX;
        sumY += currentY;
        sumIntensity += intensity;
        maxIntensity = Math.max(maxIntensity, intensity);
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (const [dx, dy] of neighborOffsets) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < x0 || nextX >= x1 || nextY < y0 || nextY >= y1) continue;
          const next = nextY * width + nextX;
          if (!visited[next] && data[next * 4] > 0) {
            visited[next] = 1;
            stack[stackSize++] = next;
          }
        }
      }

      changedPixelsInRoi += area;
      if (area < minArea) continue;
      validMotionPixelsInRoi += area;
      objects.push({
        bbox: {
          x: minX / width,
          y: minY / height,
          width: (maxX - minX + 1) / width,
          height: (maxY - minY + 1) / height,
        },
        centroid: { x: sumX / area / width, y: sumY / area / height },
        area,
        meanIntensity: sumIntensity / area,
        maxIntensity,
      });
    }
  }

  return { objects, changedPixelsInRoi, validMotionPixelsInRoi };
}
