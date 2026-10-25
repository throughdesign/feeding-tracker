import { Inject, Injectable } from "@nestjs/common";
import {
  FeedingScheduleSettingsSchema,
  computeNextFeeding,
  type FeedingScheduleSettings,
  type NextFeeding,
  type UpdateFeedingScheduleSettingsInputSchema,
} from "@isaac/shared";
import type { z } from "zod";
import { parseEntity } from "../../common/zod-validation.pipe.js";
import {
  FEEDING_REPOSITORY,
  SETTINGS_REPOSITORY,
  type FeedingRepository,
  type SettingsRepository,
} from "../../persistence/repositories.js";

export type FeedingScheduleView = { settings: FeedingScheduleSettings; nextFeeding: NextFeeding };

/**
 * Feeding schedule: persisted settings plus the derived next feeding. The next
 * feeding is never stored; it is recomputed from feeding history on each read.
 * This is the extension point for future (push) reminders.
 */
@Injectable()
export class FeedingScheduleService {
  constructor(
    @Inject(FEEDING_REPOSITORY) private readonly feedings: FeedingRepository,
    @Inject(SETTINGS_REPOSITORY) private readonly settings: SettingsRepository,
  ) {}

  async get(): Promise<FeedingScheduleView> {
    const [settings, feedings] = await Promise.all([
      this.settings.getFeedingSchedule(),
      this.feedings.list(),
    ]);
    return { settings, nextFeeding: computeNextFeeding(feedings, settings) };
  }

  async updateSettings(
    patch: z.output<typeof UpdateFeedingScheduleSettingsInputSchema>,
  ): Promise<FeedingScheduleView> {
    await this.settings.updateFeedingSchedule((current) =>
      parseEntity(FeedingScheduleSettingsSchema, { ...current, ...patch }),
    );
    return this.get();
  }
}
