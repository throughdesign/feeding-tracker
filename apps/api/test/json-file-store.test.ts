import { randomUUID } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PumpingSession } from "@isaac/shared";
import { DataFileError } from "../src/persistence/errors.js";
import { JsonFileStore } from "../src/persistence/json-file-store.js";
import { JsonRepository } from "../src/persistence/json-repository.js";
import { tempDataFile } from "./helpers.js";

function pumpingSession(overrides: Partial<PumpingSession> = {}): PumpingSession {
  return {
    id: randomUUID(),
    motherId: "mother",
    startedAt: "2026-10-25T08:00:00.000Z",
    endedAt: "2026-10-25T08:15:00.000Z",
    leftVolumeMl: 30,
    rightVolumeMl: 0,
    createdAt: "2026-10-25T08:15:00.000Z",
    updatedAt: "2026-10-25T08:15:00.000Z",
    ...overrides,
  };
}

describe("JsonFileStore", () => {
  let tmp: Awaited<ReturnType<typeof tempDataFile>>;
  beforeEach(async () => {
    tmp = await tempDataFile();
  });
  afterEach(() => tmp.cleanup());

  it("initializes a missing file with Mother and Isaac", async () => {
    const store = new JsonFileStore(tmp.file);
    const db = await store.read();
    expect(db.schemaVersion).toBe(1);
    expect(db.people.map((p) => [p.id, p.role])).toEqual([
      ["mother", "mother"],
      ["isaac", "baby"],
    ]);
    const onDisk = JSON.parse(await readFile(tmp.file, "utf8"));
    expect(onDisk.people).toHaveLength(2);
  });

  it("refuses to load unparsable JSON and leaves the file untouched", async () => {
    await writeFile(tmp.file, "{ not json");
    const store = new JsonFileStore(tmp.file);
    await expect(store.read()).rejects.toBeInstanceOf(DataFileError);
    await expect(store.transaction(() => undefined)).rejects.toMatchObject({ reason: "parse" });
    expect(await readFile(tmp.file, "utf8")).toBe("{ not json");
  });

  it("refuses to load schema-invalid data", async () => {
    await writeFile(tmp.file, JSON.stringify({ schemaVersion: 1, people: "nope" }));
    await expect(new JsonFileStore(tmp.file).read()).rejects.toMatchObject({ reason: "invalid" });
  });

  it("does not write when the mutation produces invalid data", async () => {
    const store = new JsonFileStore(tmp.file);
    await store.read();
    const before = await readFile(tmp.file, "utf8");
    await expect(
      store.transaction((db) => {
        db.pumpingSessions.push(pumpingSession({ leftVolumeMl: -5 }));
      }),
    ).rejects.toBeInstanceOf(DataFileError);
    expect(await readFile(tmp.file, "utf8")).toBe(before);
  });

  it("does not write when the mutation throws", async () => {
    const store = new JsonFileStore(tmp.file);
    await store.read();
    const before = await readFile(tmp.file, "utf8");
    await expect(
      store.transaction((db) => {
        db.pumpingSessions.push(pumpingSession());
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await readFile(tmp.file, "utf8")).toBe(before);
  });

  it("keeps a backup of the previous version and cleans up temp files", async () => {
    const store = new JsonFileStore(tmp.file);
    const repo = new JsonRepository(store, "pumpingSessions");
    const first = await repo.create(pumpingSession());
    await repo.create(pumpingSession());

    const backup = JSON.parse(await readFile(store.backupPath, "utf8"));
    expect(backup.pumpingSessions.map((s: PumpingSession) => s.id)).toEqual([first.id]);
    const files = await readdir(tmp.dir);
    expect(files.filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("ignores leftover temp files from an interrupted save", async () => {
    const store = new JsonFileStore(tmp.file);
    await new JsonRepository(store, "pumpingSessions").create(pumpingSession());
    await writeFile(`${tmp.file}.999.crashed.tmp`, '{"half": ');
    const reopened = new JsonFileStore(tmp.file);
    expect((await reopened.read()).pumpingSessions).toHaveLength(1);
  });

  it("serializes concurrent writes without losing updates", async () => {
    const store = new JsonFileStore(tmp.file);
    const repo = new JsonRepository(store, "pumpingSessions");
    const sessions = Array.from({ length: 40 }, () => pumpingSession());
    await Promise.all(sessions.map((s) => repo.create(s)));

    const target = sessions[0]!;
    await Promise.all(
      Array.from({ length: 20 }, () =>
        repo.update(target.id, (current) => ({
          ...current,
          leftVolumeMl: (current.leftVolumeMl ?? 0) + 1,
        })),
      ),
    );

    const reread = await new JsonFileStore(tmp.file).read();
    expect(reread.pumpingSessions).toHaveLength(40);
    expect(reread.pumpingSessions.find((s) => s.id === target.id)?.leftVolumeMl).toBe(50);
  });
});
