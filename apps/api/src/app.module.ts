import { Module, type DynamicModule } from "@nestjs/common";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { FeedingModule } from "./modules/feeding/feeding.module.js";
import { HealthController } from "./modules/health/health.controller.js";
import { InsightsModule } from "./modules/insights/insights.module.js";
import { MilkBatchesModule } from "./modules/milk-batches/milk-batches.module.js";
import { PumpingModule } from "./modules/pumping/pumping.module.js";
import { PersistenceModule } from "./persistence/persistence.module.js";

@Module({})
export class AppModule {
  static forRoot(options: { dataFile: string }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        PersistenceModule.forRoot(options),
        FeedingModule,
        PumpingModule,
        MilkBatchesModule,
        DashboardModule,
        InsightsModule,
      ],
      controllers: [HealthController],
    };
  }
}
