export class SlidingWindowRateLimiter {
  private windowStartMs: number;
  private count = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now
  ) {
    this.windowStartMs = this.now();
  }

  consume(): boolean {
    const currentNow = this.now();
    if (currentNow - this.windowStartMs >= this.windowMs) {
      this.windowStartMs = currentNow;
      this.count = 0;
    }

    this.count += 1;
    return this.count <= this.limit;
  }
}
