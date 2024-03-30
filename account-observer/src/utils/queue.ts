type ProcessFunction<T> = (item: T) => Promise<void>;

export class Queue<T> {
  private _q: T[] = [];
  private processFn: ProcessFunction<T>;
  private isProcessing = false;

  constructor(fn: ProcessFunction<T>) {
    this.processFn = fn;
  }

  push(item: T) {
    this._q.unshift(item);
    this.process();
  }

  private pop(): T | undefined {
    return this._q.pop();
  }

  private getQueueLength(): number {
    return this._q.length;
  }

  private async process() {
    if (typeof this.processFn !== 'function') {
      throw new Error('Process function is not defined');
    }

    if (this.isProcessing) {
      return;
    }

    if (this.getQueueLength() > 0) {
      this.isProcessing = true;

      const item = this.pop();

      if (item) {
        try {
          await Promise.resolve(this.processFn(item))
            .then()
            .catch((error) => {
              throw error;
            });
        } catch (error) {
          this.push(item);

          throw error;
        } finally {
          this.isProcessing = false;
          this.process();
        }
      }
    }
  }
}
