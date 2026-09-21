export const resolutionPresets = [
  { value: '360p', label: '360p', height: 360 },
  { value: '480p', label: '480p', height: 480 },
  { value: '540p', label: '540p', height: 540 },
  { value: '720p', label: '720p', height: 720 },
  { value: '900p', label: '900p', height: 900 },
  { value: '1080p', label: '1080p', height: 1080 },
  { value: '1440p', label: '1440p', height: 1440 },
  { value: '1800p', label: '1800p', height: 1800 },
  { value: '4k', label: '4K', height: 2160 },
] as const;

export type ResolutionPreset = typeof resolutionPresets[number]['value'];

export function getProcessingSize(videoWidth: number, videoHeight: number, preset: ResolutionPreset) {
  const targetHeight = resolutionPresets.find((item) => item.value === preset)?.height ?? videoHeight;
  const height = Math.max(1, Math.min(videoHeight, targetHeight));
  const width = Math.max(1, Math.round((videoWidth * height / videoHeight) / 2) * 2);
  return { width, height };
}
