import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  FeedingSessionSchema,
  deriveSessionBounds,
  sortSegments,
  summarizeFeeding,
  zonedDayBounds,
  type CreateFeedingSessionInputSchema,
  type Database,
  type FeedingSegment,
  type FeedingSegmentInput,
  type FeedingSession,
  type FeedingWithSummary,
  type UpdateFeedingSessionInputSchema,
} from "@isaac/shared";
import type { z } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors.js";
import { parseEntity } from "../../common/zod-validation.pipe.js";
import { FEEDING_REPOSITORY, type FeedingRepository } from "../../persistence/repositories.js";

type CreateInput = z.output<typeof CreateFeedingSessionInputSchema>;
type UpdateInput = z.output<typeof UpdateFeedingSessionInputSchema>;

function withIds(segments: FeedingSegmentInput[]): FeedingSegment[] {
  return sortSegments(segments).map((s) => ({ ...s, id: s.id ?? randomUUID() }) as FeedingSegment);
}

/** Validates segment references to milk batches against the current snapshot. */
function checkBatchReferences(session: FeedingSession, db: Readonly<Database>): void {
  session.segments.forEach((segment, i) => {
    if (segment.type !== "bottle" || !segment.milkBatchId) return;
    const batch = db.milkBatches.find((b) => b.id === segment.milkBatchId);
    const path = `segments.${i}.milkBatchId`;
    if (!batch) {
      throw new ValidationError("Unknown milk batch", [{ path, message: "Milk batch not found" }]);
    }
    const expected = batch.source === "pumping" ? "expressed_breast_milk" : "formula";
    if (segment.milkType !== expected) {
      throw new ValidationError("Milk batch does not match the bottle's milk type", [
        { path, message: `This batch contains ${expected.replaceAll("_", " ")}` },
      ]);
    }
  });
}

function checkSingleActive(session: FeedingSession, db: Readonly<Database>): void {
  if (session.status !== "active") return;
  const other = db.feedingSessions.find((s) => s.status === "active" && s.id !== session.id);
  if (other) {
    throw new ConflictError("Another feeding is still in progress. Finish it first.");
  }
}

@Injectable()
export class FeedingService {
  constructor(@Inject(FEEDING_REPOSITORY) private readonly repository: FeedingRepository) {}

  private present(session: FeedingSession): FeedingWithSummary {
    return { ...session, summary: summarizeFeeding(session) };
  }

  private build(
    fields: Omit<FeedingSession, "segments" | "startedAt" | "endedAt"> & {
      segments: FeedingSegmentInput[];
      startedAt?: string;
      endedAt?: string | null;
    },
  ): FeedingSession {
    const segments = withIds(fields.segments);
    const bounds = deriveSessionBounds(segments, fields.status);
    return parseEntity(FeedingSessionSchema, {
      ...fields,
      segments,
      startedAt: bounds?.startedAt ?? fields.startedAt,
      endedAt: bounds ? bounds.endedAt : (fields.endedAt ?? null),
    });
  }

  async list(filter: { date?: string; status?: FeedingSession["status"] } = {}) {
    const bounds = filter.date ? zonedDayBounds(filter.date) : null;
    return (await this.repository.list())
      .filter((s) => !filter.status || s.status === filter.status)
      .filter(
        (s) =>
          !bounds ||
          (Date.parse(s.startedAt) >= Date.parse(bounds.start) &&
            Date.parse(s.startedAt) < Date.parse(bounds.end)),
      )
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .map((s) => this.present(s));
  }

  async get(id: string): Promise<FeedingWithSummary> {
    const session = await this.repository.get(id);
    if (!session) throw new NotFoundError("Feeding", id);
    return this.present(session);
  }

  async create(input: CreateInput): Promise<FeedingWithSummary> {
    const now = new Date().toISOString();
    const session = this.build({ ...input, id: randomUUID(), createdAt: now, updatedAt: now });
    const created = await this.repository.create(session, (db) => {
      checkSingleActive(session, db);
      checkBatchReferences(session, db);
    });
    return this.present(created);
  }

  async update(id: string, patch: UpdateInput): Promise<FeedingWithSummary> {
    const updated = await this.repository.update(id, (current, db) => {
      const next = this.build({
        ...current,
        ...patch,
        segments: patch.segments ?? current.segments,
        updatedAt: new Date().toISOString(),
      });
      checkSingleActive(next, db);
      checkBatchReferences(next, db);
      return next;
    });
    if (!updated) throw new NotFoundError("Feeding", id);
    return this.present(updated);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.repository.delete(id))) throw new NotFoundError("Feeding", id);
  }
}
