import type { Database } from "@isaac/shared";
import type { JsonFileStore } from "./json-file-store.js";
import type { Repository } from "./repositories.js";

type CollectionKey = "feedingSessions" | "pumpingSessions" | "milkBatches";
type EntityOf<K extends CollectionKey> = Database[K][number];

export class JsonRepository<K extends CollectionKey> implements Repository<EntityOf<K>> {
  constructor(
    private readonly store: JsonFileStore,
    private readonly key: K,
  ) {}

  private items(db: Readonly<Database>): EntityOf<K>[] {
    return db[this.key] as EntityOf<K>[];
  }

  async list(): Promise<EntityOf<K>[]> {
    return structuredClone(this.items(await this.store.read()));
  }

  async get(id: string): Promise<EntityOf<K> | null> {
    const found = this.items(await this.store.read()).find((item) => item.id === id);
    return found ? structuredClone(found) : null;
  }

  create(entity: EntityOf<K>, guard?: (snapshot: Readonly<Database>) => void) {
    return this.store.transaction((db) => {
      guard?.(db);
      this.items(db).push(entity);
      return structuredClone(entity);
    });
  }

  update(id: string, updater: (current: EntityOf<K>, snapshot: Readonly<Database>) => EntityOf<K>) {
    return this.store.transaction((db) => {
      const items = this.items(db);
      const index = items.findIndex((item) => item.id === id);
      const current = items[index];
      if (!current) return null;
      const next = updater(structuredClone(current), db);
      items[index] = { ...next, id };
      return structuredClone(items[index]);
    });
  }

  delete(id: string, guard?: (snapshot: Readonly<Database>) => void) {
    return this.store.transaction((db) => {
      const items = this.items(db);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return false;
      guard?.(db);
      items.splice(index, 1);
      return true;
    });
  }
}
