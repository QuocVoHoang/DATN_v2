import type { MovingObject } from './movingObjects';

export type TrackConfig = {
  confirmFrames?: number;
  maxMissedFrames?: number;
  smoothing?: number;
  maxCenterDistance?: number;
};
export type TrackedMovingObject = MovingObject & { id: number };

type Track = TrackedMovingObject & { hits: number; missed: number };

function centerDistance(a: MovingObject, b: MovingObject) {
  const dx = a.centroid.x - b.centroid.x;
  const dy = a.centroid.y - b.centroid.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function smooth(previous: MovingObject, next: MovingObject, alpha: number): MovingObject {
  const mix = (a: number, b: number) => a + (b - a) * alpha;
  return {
    ...next,
    bbox: {
      x: mix(previous.bbox.x, next.bbox.x),
      y: mix(previous.bbox.y, next.bbox.y),
      width: mix(previous.bbox.width, next.bbox.width),
      height: mix(previous.bbox.height, next.bbox.height),
    },
    centroid: {
      x: mix(previous.centroid.x, next.centroid.x),
      y: mix(previous.centroid.y, next.centroid.y),
    },
  };
}

/** Lightweight one-to-one tracker for motion regions. Coordinates are normalized. */
export class ObjectTracker {
  private tracks: Track[] = [];
  private nextId = 1;
  private readonly config: Required<TrackConfig>;

  constructor(config: TrackConfig = {}) {
    this.config = {
      confirmFrames: 2,
      maxMissedFrames: 4,
      smoothing: 0.35,
      maxCenterDistance: 0.12,
      ...config,
    };
  }

  update(objects: MovingObject[]): TrackedMovingObject[] {
    const candidates = objects.map((object) => ({
      object,
      distance: Number.POSITIVE_INFINITY,
      track: -1,
    }));
    const pairs: Array<{ candidate: number; track: number; distance: number }> = [];
    candidates.forEach((candidate, candidateIndex) =>
      this.tracks.forEach((track, trackIndex) => {
        const distance = centerDistance(candidate.object, track);
        if (distance <= this.config.maxCenterDistance)
          pairs.push({
            candidate: candidateIndex,
            track: trackIndex,
            distance,
          });
      }),
    );
    pairs.sort((a, b) => a.distance - b.distance);
    const usedCandidates = new Set<number>();
    const usedTracks = new Set<number>();
    for (const pair of pairs) {
      if (usedCandidates.has(pair.candidate) || usedTracks.has(pair.track)) continue;
      candidates[pair.candidate].track = pair.track;
      candidates[pair.candidate].distance = pair.distance;
      usedCandidates.add(pair.candidate);
      usedTracks.add(pair.track);
    }

    const next: Track[] = [];
    for (const candidate of candidates) {
      if (candidate.track >= 0) {
        const previous = this.tracks[candidate.track];
        next.push({
          ...smooth(previous, candidate.object, this.config.smoothing),
          id: previous.id,
          hits: previous.hits + 1,
          missed: 0,
        });
      } else {
        next.push({
          ...candidate.object,
          id: this.nextId++,
          hits: 1,
          missed: 0,
        });
      }
    }
    this.tracks.forEach((track, index) => {
      if (!usedTracks.has(index) && track.missed + 1 <= this.config.maxMissedFrames)
        next.push({ ...track, missed: track.missed + 1 });
    });
    this.tracks = next;
    return this.tracks
      .filter((track) => track.hits >= this.config.confirmFrames)
      .map(({ hits: _hits, missed: _missed, ...object }) => object);
  }

  reset() {
    this.tracks = [];
  }
}
