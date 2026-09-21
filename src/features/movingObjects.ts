import type { ROI } from './roi';
import type { MotionMask } from '../engine/motionTypes';

export type MovingObject = {
  id: number;
  bbox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  area: number;
  meanIntensity: number;
  maxIntensity: number;
};

export type MovingObjectWorkspace = { visited: Uint8Array; stack: Int32Array; capacity: number };
export type MovingObjectAnalysis = { objects: MovingObject[]; changedPixelsInRoi: number };
export function createMovingObjectWorkspace(): MovingObjectWorkspace { return { visited: new Uint8Array(0), stack: new Int32Array(0), capacity: 0 }; }

export function detectMovingObjects(mask: MotionMask, roi: ROI, minArea: number, workspace: MovingObjectWorkspace): MovingObjectAnalysis {
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

         const left = currentX - 1, right = currentX + 1, above = currentY - 1, below = currentY + 1;
         if (left >= x0) { const next = currentY * width + left; if (!visited[next] && data[next * 4] > 0) { visited[next] = 1; stack[stackSize++] = next; } }
         if (right < x1) { const next = currentY * width + right; if (!visited[next] && data[next * 4] > 0) { visited[next] = 1; stack[stackSize++] = next; } }
         if (above >= y0) { const next = above * width + currentX; if (!visited[next] && data[next * 4] > 0) { visited[next] = 1; stack[stackSize++] = next; } }
         if (below < y1) { const next = below * width + currentX; if (!visited[next] && data[next * 4] > 0) { visited[next] = 1; stack[stackSize++] = next; } }
       }

       changedPixelsInRoi += area;
      if (area < minArea) continue;
      objects.push({
        id: objects.length + 1,
        bbox: { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height },
        centroid: { x: sumX / area / width, y: sumY / area / height },
        area,
        meanIntensity: sumIntensity / area,
        maxIntensity,
      });
    }
  }

  return { objects, changedPixelsInRoi };
}
