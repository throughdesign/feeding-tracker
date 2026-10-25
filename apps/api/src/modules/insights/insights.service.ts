import { Inject, Injectable } from "@nestjs/common";
import { buildInsights, dateKeyInZone, type InsightPeriod, type Insights } from "@isaac/shared";
import {
  FEEDING_REPOSITORY,
  PUMPING_REPOSITORY,
  type FeedingRepository,
  type PumpingRepository,
} from "../../persistence/repositories.js";

@Injectable()
export class InsightsService {
  constructor(
    @Inject(FEEDING_REPOSITORY) private readonly feedings: FeedingRepository,
    @Inject(PUMPING_REPOSITORY) private readonly pumpings: PumpingRepository,
  ) {}

  async forPeriod(days: InsightPeriod, endDate?: string): Promise<Insights> {
    const now = Date.now();
    const [feedingSessions, pumpingSessions] = await Promise.all([
      this.feedings.list(),
      this.pumpings.list(),
    ]);
    return buildInsights(
      { feedingSessions, pumpingSessions },
      endDate ?? dateKeyInZone(now),
      days,
      now,
    );
  }
}
