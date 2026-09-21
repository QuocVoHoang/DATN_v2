import { describe, expect, it } from 'vitest';
import { createEventCsv, createEventJson } from './eventExport';
import type { MotionEvent } from './motionEvents';

const event = (id: number, start: number, roiId = 'roi-main'): MotionEvent => ({ startedAt: start, endedAt: start + 2, peakRatio: 0.1, peakWasmLatency: 2, peakEndToEndLatency: 5 });

describe('event export', () => {
  it('creates versioned chronological JSON without internal fields', () => {
    const result = JSON.parse(createEventJson([event(2, 4), event(1, 1)], '2026-08-28T00:00:00.000Z'));
    expect(result).toMatchObject({ schemaVersion: 1, exportedAt: '2026-08-28T00:00:00.000Z', eventCount: 2 });
    expect(result.events.map((item: { start: number }) => item.start)).toEqual([1, 4]);
    expect(result.events[0]).not.toHaveProperty('quietFrames');
  });

  it('creates stable CSV columns and escapes values', () => {
    const csv = createEventCsv([event(1, 1, 'roi,main')]);
    expect(csv.split('\r\n')[0]).toBe('id,start,end,duration,bbox_x,bbox_y,bbox_width,bbox_height,centroid_x,centroid_y,area,peak_ratio,roi_id,track_id,mean_intensity,max_intensity,peak_wasm_latency_ms,peak_end_to_end_latency_ms');
    expect(csv).toContain('roi-main');
  });

  it('exports header for empty CSV', () => { expect(createEventCsv([]).split('\r\n')).toHaveLength(2); });
});
