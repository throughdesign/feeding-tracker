import { resolveScheduleSettings, type FeedingScheduleSettings } from "@isaac/shared";
import type { JsonFileStore } from "./json-file-store.js";
import type { SettingsRepository } from "./repositories.js";

export class JsonSettingsRepository implements SettingsRepository {
  constructor(private readonly store: JsonFileStore) {}

  async getFeedingSchedule(): Promise<FeedingScheduleSettings> {
    const db = await this.store.read();
    return structuredClone(resolveScheduleSettings(db.settings?.feedingSchedule));
  }

  updateFeedingSchedule(updater: (current: FeedingScheduleSettings) => FeedingScheduleSettings) {
    return this.store.transaction((db) => {
      const next = updater(structuredClone(resolveScheduleSettings(db.settings?.feedingSchedule)));
      db.settings = { ...db.settings, feedingSchedule: next };
      return structuredClone(next);
    });
  }
}
