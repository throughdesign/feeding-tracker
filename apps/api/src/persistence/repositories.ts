import type { Database, FeedingSession, MilkBatch, PumpingSession } from "@isaac/shared";

/**
 * Storage-agnostic repository contract. The JSON implementation can be swapped
 * for SQLite/PostgreSQL without touching services or controllers.
 *
 * `guard` and `updater` callbacks run inside the write transaction against a
 * consistent snapshot; throwing from them aborts the write.
 */
export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(entity: T, guard?: (snapshot: Readonly<Database>) => void): Promise<T>;
  update(id: string, updater: (current: T, snapshot: Readonly<Database>) => T): Promise<T | null>;
  delete(id: string, guard?: (snapshot: Readonly<Database>) => void): Promise<boolean>;
}

export type FeedingRepository = Repository<FeedingSession>;
export type PumpingRepository = Repository<PumpingSession>;
export type MilkBatchRepository = Repository<MilkBatch>;

export const FEEDING_REPOSITORY = Symbol("FeedingRepository");
export const PUMPING_REPOSITORY = Symbol("PumpingRepository");
export const MILK_BATCH_REPOSITORY = Symbol("MilkBatchRepository");
