import { randomUUID } from "node:crypto";
import { copyFile, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSchema, type Database } from "@isaac/shared";
import { DataFileError } from "./errors.js";
import { createInitialDatabase } from "./seed.js";

function formatIssues(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .slice(0, 5)
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

/**
 * Single-file JSON database.
 *
 * - Every operation runs through one in-process queue, so reads never observe a
 *   half-applied transaction and writes never overlap.
 * - Writes go to a temporary file which is fsynced and then renamed over the
 *   original (atomic on POSIX filesystems). An interrupted save therefore leaves
 *   either the old or the new file, never a truncated one.
 * - Before each overwrite the previous version is copied to `<file>.bak`.
 * - Invalid or unparsable files raise `DataFileError`; they are never reset.
 *
 * The queue protects against concurrent requests in this process only; run a
 * single API instance per data file.
 */
export class JsonFileStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly filePath: string,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  get backupPath(): string {
    return `${this.filePath}.bak`;
  }

  /** Returns a validated snapshot. Callers may not mutate it. */
  read(): Promise<Readonly<Database>> {
    return this.enqueue(() => this.load());
  }

  /**
   * Applies `mutate` to a copy of the database and persists the result. If
   * `mutate` throws, nothing is written and the error propagates.
   */
  transaction<T>(mutate: (draft: Database) => T | Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      const current = await this.load();
      const draft = structuredClone(current);
      const result = await mutate(draft);
      if (JSON.stringify(draft) === JSON.stringify(current)) return result;
      const parsed = DatabaseSchema.safeParse(draft);
      if (!parsed.success) {
        throw new DataFileError("invalid", this.filePath, formatIssues(parsed.error.issues));
      }
      await this.writeAtomically(parsed.data);
      return result;
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async load(): Promise<Database> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isNotFound(error)) return this.initialize();
      throw new DataFileError("read", this.filePath, String(error), { cause: error });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      throw new DataFileError("parse", this.filePath, (error as Error).message, { cause: error });
    }

    const parsed = DatabaseSchema.safeParse(json);
    if (!parsed.success) {
      throw new DataFileError("invalid", this.filePath, formatIssues(parsed.error.issues));
    }
    return parsed.data;
  }

  private async initialize(): Promise<Database> {
    const db = createInitialDatabase(this.clock());
    await this.writeAtomically(db);
    return db;
  }

  private async writeAtomically(db: Database): Promise<void> {
    const tempPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      const handle = await open(tempPath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(db, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await copyFile(this.filePath, this.backupPath);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      await rename(tempPath, this.filePath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw new DataFileError("write", this.filePath, String(error), { cause: error });
    }
  }
}
