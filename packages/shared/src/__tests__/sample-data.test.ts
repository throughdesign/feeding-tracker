import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DatabaseSchema } from "../schemas/database.js";

describe("data/sample/feeding.sample.json", () => {
  it("matches the database schema", () => {
    const url = new URL("../../../../data/sample/feeding.sample.json", import.meta.url);
    const result = DatabaseSchema.safeParse(JSON.parse(readFileSync(url, "utf8")));
    expect(result.error?.issues ?? []).toEqual([]);
  });
});
