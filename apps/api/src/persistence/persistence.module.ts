import { Global, Module, type DynamicModule } from "@nestjs/common";
import { JsonFileStore } from "./json-file-store.js";
import { JsonRepository } from "./json-repository.js";
import { JsonSettingsRepository } from "./json-settings-repository.js";
import {
  FEEDING_REPOSITORY,
  MILK_BATCH_REPOSITORY,
  PUMPING_REPOSITORY,
  SETTINGS_REPOSITORY,
} from "./repositories.js";

@Global()
@Module({})
export class PersistenceModule {
  static forRoot(options: { dataFile: string }): DynamicModule {
    return {
      module: PersistenceModule,
      providers: [
        { provide: JsonFileStore, useValue: new JsonFileStore(options.dataFile) },
        {
          provide: FEEDING_REPOSITORY,
          inject: [JsonFileStore],
          useFactory: (store: JsonFileStore) => new JsonRepository(store, "feedingSessions"),
        },
        {
          provide: PUMPING_REPOSITORY,
          inject: [JsonFileStore],
          useFactory: (store: JsonFileStore) => new JsonRepository(store, "pumpingSessions"),
        },
        {
          provide: MILK_BATCH_REPOSITORY,
          inject: [JsonFileStore],
          useFactory: (store: JsonFileStore) => new JsonRepository(store, "milkBatches"),
        },
        {
          provide: SETTINGS_REPOSITORY,
          inject: [JsonFileStore],
          useFactory: (store: JsonFileStore) => new JsonSettingsRepository(store),
        },
      ],
      exports: [
        JsonFileStore,
        FEEDING_REPOSITORY,
        PUMPING_REPOSITORY,
        MILK_BATCH_REPOSITORY,
        SETTINGS_REPOSITORY,
      ],
    };
  }
}
