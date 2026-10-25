import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  MilkBatchSchema,
  pumpingTotal,
  type CreateMilkBatchInputSchema,
  type MilkBatchWithUsage,
} from "@isaac/shared";
import type { z } from "zod";
import { ValidationError } from "../../common/errors.js";
import { parseEntity } from "../../common/zod-validation.pipe.js";
import { JsonFileStore } from "../../persistence/json-file-store.js";
import { MILK_BATCH_REPOSITORY, type MilkBatchRepository } from "../../persistence/repositories.js";

type CreateInput = z.output<typeof CreateMilkBatchInputSchema>;

/**
 * Milk batches are groundwork for future inventory accounting. Usage is derived
 * only from bottle segments that explicitly reference a batch.
 */
@Injectable()
export class MilkBatchesService {
  constructor(
    @Inject(MILK_BATCH_REPOSITORY) private readonly repository: MilkBatchRepository,
    @Inject(JsonFileStore) private readonly store: JsonFileStore,
  ) {}

  async list(): Promise<MilkBatchWithUsage[]> {
    const db = await this.store.read();
    return db.milkBatches
      .map((batch) => {
        let consumedMl = 0;
        let offeredMl = 0;
        for (const feeding of db.feedingSessions) {
          for (const segment of feeding.segments) {
            if (segment.type === "bottle" && segment.milkBatchId === batch.id) {
              consumedMl += segment.consumedMl;
              offeredMl += segment.offeredMl;
            }
          }
        }
        return { ...structuredClone(batch), consumedMl, offeredMl };
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async create(input: CreateInput): Promise<MilkBatchWithUsage> {
    const batch = parseEntity(MilkBatchSchema, {
      ...input,
      id: randomUUID(),
      createdAt: input.createdAt ?? new Date().toISOString(),
    });
    const created = await this.repository.create(batch, (db) => {
      if (!batch.pumpingSessionId) return;
      const session = db.pumpingSessions.find((s) => s.id === batch.pumpingSessionId);
      if (!session) {
        throw new ValidationError("Unknown pumping session", [
          { path: "pumpingSessionId", message: "Pumping session not found" },
        ]);
      }
      const total = pumpingTotal(session);
      if (total.kind === "complete" && batch.initialVolumeMl > total.totalMl) {
        throw new ValidationError("Batch is larger than the pumped volume", [
          { path: "initialVolumeMl", message: `At most ${total.totalMl} ml was pumped` },
        ]);
      }
    });
    return { ...created, consumedMl: 0, offeredMl: 0 };
  }
}
