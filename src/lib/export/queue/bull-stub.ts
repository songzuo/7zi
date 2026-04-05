// Bull stub for Turbopack compatibility
export interface JobOptions {
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
}

function createQueue<T = unknown>(_name: string, _opts?: object): Queue<T> {
  return {
    add: async () => ({ id: `job-${Date.now()}`, data: undefined as T, progress: 0 }),
    getJob: async () => undefined,
    getWaiting: async () => [],
    getActive: async () => [],
    getCompleted: async () => [],
    getFailed: async () => [],
    clean: async () => { /* noop */ },
    close: async () => { /* noop */ },
  };
}

export { createQueue as Queue };
export default { createQueue };
