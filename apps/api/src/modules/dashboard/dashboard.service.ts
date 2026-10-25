import { Inject, Injectable } from "@nestjs/common";
import { buildDashboard, dateKeyInZone, type Dashboard } from "@isaac/shared";
import {
  FEEDING_REPOSITORY,
  PUMPING_REPOSITORY,
  SETTINGS_REPOSITORY,
  type FeedingRepository,
  type PumpingRepository,
  type SettingsRepository,
} from "../../persistence/repositories.js";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(FEEDING_REPOSITORY) private readonly feedings: FeedingRepository,
    @Inject(PUMPING_REPOSITORY) private readonly pumpings: PumpingRepository,
    @Inject(SETTINGS_REPOSITORY) private readonly settings: SettingsRepository,
  ) {}

  async forDate(date?: string): Promise<Dashboard> {
    const now = Date.now();
    const [feedingSessions, pumpingSessions, schedule] = await Promise.all([
      this.feedings.list(),
      this.pumpings.list(),
      this.settings.getFeedingSchedule(),
    ]);
    return buildDashboard(
      { feedingSessions, pumpingSessions },
      date ?? dateKeyInZone(now),
      now,
      schedule,
    );
  }
}
