export const threadCandidates = [1, 2, 4] as const;
export type ThreadMode = 'auto' | 'manual';

export function chooseFastestThread(results: Array<{ threads: number; latency: number }>): number {
  if (results.length === 0) return 1;
  return [...results].sort((a, b) => a.latency - b.latency || a.threads - b.threads)[0].threads;
}
