export class LatencySamples {
  private readonly values: Float64Array;
  private readonly scratch: Float64Array;
  private next = 0;
  private count = 0;
  constructor(private readonly capacity: number) { this.values = new Float64Array(capacity); this.scratch = new Float64Array(capacity); }
  add(value: number) { this.values[this.next] = value; this.next = (this.next + 1) % this.capacity; this.count = Math.min(this.capacity, this.count + 1); }
  reset() { this.next = 0; this.count = 0; }
  percentiles(...ps: number[]) {
    if (!this.count) return ps.map(() => 0);
    for (let i = 0; i < this.count; i++) this.scratch[i] = this.values[(this.next - this.count + i + this.capacity) % this.capacity];
    const sorted = Array.from(this.scratch.subarray(0, this.count)).sort((a, b) => a - b);
    return ps.map((p) => sorted[Math.min(this.count - 1, Math.max(0, Math.ceil(this.count * p) - 1))]);
  }
}
