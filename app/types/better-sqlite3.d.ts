declare module 'better-sqlite3' {
  interface Database {
    pragma(pragma: string): unknown;
    prepare(sql: string): Statement;
    exec(sql: string): Database;
    close(): void;
  }

  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate(...params: unknown[]): IterableIterator<unknown>;
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  function Database(filename: string, options?: DatabaseOptions): Database;

  interface DatabaseOptions {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message: unknown, ...additionalArgs: unknown[]) => void;
  }

  export default Database;
}