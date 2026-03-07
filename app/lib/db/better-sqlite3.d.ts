declare module 'better-sqlite3' {
  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): Database;
    close(): void;
    pragma(pragma: string): unknown;
    transaction(fn: () => void): () => void;
  }

  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate(...params: unknown[]): IterableIterator<unknown>;
    pluck(toggle?: boolean): Statement;
    expand(toggle?: boolean): Statement;
    raw(toggle?: boolean): Statement;
    bind(...params: unknown[]): Statement;
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: () => void;
  }

  function Database(filename: string, options?: Options): Database;

  export default Database;
  export { Database, Options, Statement, RunResult };
}
