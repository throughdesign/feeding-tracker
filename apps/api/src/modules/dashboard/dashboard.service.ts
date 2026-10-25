import { Inject, Injectable } from "@nestjs/common";
import { buildDashboard, dateKeyInZone, type Dashboard } from "@isaac/shared";
import {
  FEEDING_REPOSITORY,
  PUMPING_REPOSITORY,
  type FeedingRepository,
  type PumpingRepository,
} from "../../persistence/repositories.js";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(FEEDING_REPOSITORY) private readonly feedings: FeedingRepository,
    @Inject(PUMPING_REPOSITORY) private readonly pumpings: PumpingRepository,
  ) {}

  async forDate(date?: string): Promise<Dashboard> {
    const now = Date.now();
    const [feedingSessions, pumpingSessions] = await Promise.all([
      this.feedings.list(),
      this.pumpings.list(),
    ]);
    return buildDashboard({ feedingSessions, pumpingSessions }, date ?? dateKeyInZone(now), now);
  }
}
