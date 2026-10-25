import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_BABY_ID,
  DEFAULT_MOTHER_ID,
  type Database,
} from "@isaac/shared";

export function createInitialDatabase(now: string): Database {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    people: [
      { id: DEFAULT_MOTHER_ID, name: "Mother", role: "mother", createdAt: now },
      { id: DEFAULT_BABY_ID, name: "Isaac", role: "baby", createdAt: now },
    ],
    feedingSessions: [],
    pumpingSessions: [],
    milkBatches: [],
  };
}
