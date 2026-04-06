// Bull stub for Turbopack compatibility

export interface JobOptions {
  jobId?: string;
  priority?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  attempts?: number;
  backoff?: { type: 'exponential' | 'fixed'; delay: number };
}

export interface Job<T = unknown> {
  id: string;
  data: T;
  progress: number;
  attemptNumber?: number;
  returnvalue?: T;
  failedReason?: string;
  finishedOn?: number;
  remove(): Promise<void>;
  update(data: T): Promise<void>;
  updateProgress(value: unknown): Promise<void>;
}

export interface Queue<T = unknown> {
  add(name: string, data: T, opts?: JobOptions): Promise<Job<T>>;
  getJob(id: string): Promise<Job<T> | undefined>;
  getWaiting(): Promise<Job[]>;
  getActive(): Promise<Job[]>;
  getCompleted(): Promise<Job[]>;
  getFailed(): Promise<Job[]>;
  clean(maxAge: number, max?: number, type?: string): Promise<void>;
  close(): Promise<void>;
  waitUntilReady(): Promise<void>;
  getJobCounts(): Promise<{ waiting: number; active: number; completed: number; failed: number; paused: number; delayed: number }>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  on(event: string, handler: (...args: any[]) => void): void;
  process(concurrency: number, handler: (job: Job<T>) => Promise<unknown>): void;
}

interface QueueImpl<T> extends Queue<T> {
  add(name: string, data: T, opts?: JobOptions): Promise<Job<T>>;
}

function createQueue<T = unknown>(_name: string, _opts?: object): QueueImpl<T> {
  const createJob = (): Job<T> => ({
    id: `job-${Date.now()}`,
    data: undefined as T,
    progress: 0,
    remove: async () => { /* noop */ },
    update: async () => { /* noop */ },
    updateProgress: async () => { /* noop */ },
    finishedOn: undefined,
  })
  const queue: QueueImpl<T> = {
    add: async () => createJob(),
    getJob: async () => undefined,
    getWaiting: async () => [],
    getActive: async () => [],
    getCompleted: async () => [],
    getFailed: async () => [],
    clean: async () => { /* noop */ },
    close: async () => { /* noop */ },
    waitUntilReady: async () => { /* noop */ },
    getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, paused: 0, delayed: 0 }),
    pause: async () => { /* noop */ },
    resume: async () => { /* noop */ },
    on: () => { /* noop */ },
    process: () => { /* noop */ },
  }
  return queue
}

// Class-based Queue for use with 'new' keyword
class BullQueue<T = unknown> {
  private impl: QueueImpl<T>
  constructor(name: string, opts?: object) {
    this.impl = createQueue<T>(name, opts)
  }
  add(name: string, data: T, opts?: JobOptions) {
    return this.impl.add(name, data, opts)
  }
  getJob(id: string) {
    return this.impl.getJob(id)
  }
  getWaiting() {
    return this.impl.getWaiting()
  }
  getActive() {
    return this.impl.getActive()
  }
  getCompleted() {
    return this.impl.getCompleted()
  }
  getFailed() {
    return this.impl.getFailed()
  }
  clean(maxAge: number, max?: number, type?: string) {
    return this.impl.clean(maxAge, max, type)
  }
  close() {
    return this.impl.close()
  }
  waitUntilReady() {
    return Promise.resolve()
  }
  getJobCounts() {
    return this.impl.getJobCounts()
  }
  pause() {
    return this.impl.pause()
  }
  resume() {
    return this.impl.resume()
  }
  on(event: string, handler: (...args: any[]) => void) {
    return this.impl.on(event, handler)
  }
  process(concurrency: number, handler: (job: Job<T>) => Promise<unknown>) {
    return this.impl.process(concurrency, handler)
  }
}

// Use type assertion to allow both interface and class usage
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Queue: {
  new <T = unknown>(name: string, opts?: object): Queue<T>
  <T = unknown>(name: string, opts?: object): Queue<T>
} = BullQueue as any

export { BullQueue };
export default { createQueue };
