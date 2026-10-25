import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  PumpingSessionSchema,
  pumpingTotal,
  zonedDayBounds,
  type CreatePumpingSessionInputSchema,
  type PumpingSession,
  type PumpingWithTotal,
  type UpdatePumpingSessionInputSchema,
} from "@isaac/shared";
import type { z } from "zod";
import { ConflictError, NotFoundError } from "../../common/errors.js";
import { parseEntity } from "../../common/zod-validation.pipe.js";
import { PUMPING_REPOSITORY, type PumpingRepository } from "../../persistence/repositories.js";

type CreateInput = z.output<typeof CreatePumpingSessionInputSchema>;
type UpdateInput = z.output<typeof UpdatePumpingSessionInputSchema>;

@Injectable()
export class PumpingService {
  constructor(@Inject(PUMPING_REPOSITORY) private readonly repository: PumpingRepository) {}

  private present(session: PumpingSession): PumpingWithTotal {
    return { ...session, total: pumpingTotal(session) };
  }

  async list(filter: { date?: string } = {}) {
    const bounds = filter.date ? zonedDayBounds(filter.date) : null;
    return (await this.repository.list())
      .filter(
        (s) =>
          !bounds ||
          (Date.parse(s.startedAt) >= Date.parse(bounds.start) &&
            Date.parse(s.startedAt) < Date.parse(bounds.end)),
      )
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .map((s) => this.present(s));
  }

  async get(id: string): Promise<PumpingWithTotal> {
    const session = await this.repository.get(id);
    if (!session) throw new NotFoundError("Pumping session", id);
    return this.present(session);
  }

  async create(input: CreateInput): Promise<PumpingWithTotal> {
    const now = new Date().toISOString();
    const session = parseEntity(PumpingSessionSchema, {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    return this.present(await this.repository.create(session));
  }

  async update(id: string, patch: UpdateInput): Promise<PumpingWithTotal> {
    const updated = await this.repository.update(id, (current) =>
      parseEntity(PumpingSessionSchema, {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    );
    if (!updated) throw new NotFoundError("Pumping session", id);
    return this.present(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id, (db) => {
      if (db.milkBatches.some((b) => b.pumpingSessionId === id)) {
        throw new ConflictError(
          "This pumping session is linked to a milk batch and cannot be deleted",
        );
      }
    });
    if (!deleted) throw new NotFoundError("Pumping session", id);
  }
}
