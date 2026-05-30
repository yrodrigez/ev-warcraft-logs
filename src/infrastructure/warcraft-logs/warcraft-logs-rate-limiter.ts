export const WCL_MIN_DELAY_MS = 1200;

export class WarcraftLogsRateLimiter {
  private lastRequestStartedAt = 0;
  private queue: Promise<void> = Promise.resolve();

  public run<T>(operation: () => Promise<T>): Promise<T> {
    const queuedOperation = this.queue.then(async () => {
      const delayMs = Math.max(0, this.lastRequestStartedAt + WCL_MIN_DELAY_MS - Date.now());

      if (delayMs > 0) {
        await this.delay(delayMs);
      }

      this.lastRequestStartedAt = Date.now();
      return operation();
    });

    this.queue = queuedOperation.then(
      () => undefined,
      () => undefined,
    );

    return queuedOperation;
  }

  private delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}
