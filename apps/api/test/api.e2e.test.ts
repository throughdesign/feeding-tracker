import type { INestApplication } from "@nestjs/common";
import type { Dashboard, FeedingWithSummary, Insights, PumpingWithTotal } from "@isaac/shared";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { tempDataFile } from "./helpers.js";

const at = (hhmm: string) => `2026-10-25T${hhmm}:00.000Z`;

describe("API integration", () => {
  let tmp: Awaited<ReturnType<typeof tempDataFile>>;
  let app: INestApplication;

  async function start() {
    app = await createApp({ dataFile: tmp.file, logger: false });
    await app.init();
    return request(app.getHttpServer());
  }

  beforeEach(async () => {
    tmp = await tempDataFile();
  });
  afterEach(async () => {
    await app?.close();
    await tmp.cleanup();
  });

  it("persists records across an application restart", async () => {
    let api = await start();
    const created = await api
      .post("/api/pumping-sessions")
      .send({ startedAt: at("07:00"), endedAt: at("07:20"), leftVolumeMl: 45, rightVolumeMl: 0 })
      .expect(201);
    const pumping = created.body as PumpingWithTotal;
    expect(pumping.total).toEqual({ kind: "complete", totalMl: 45, knownMl: 45 });

    const feeding = await api
      .post("/api/feedings")
      .send({
        status: "completed",
        segments: [
          {
            type: "breastfeeding",
            breast: "left",
            startedAt: at("09:00"),
            endedAt: at("09:10"),
            pauses: [],
          },
          {
            type: "bottle",
            milkType: "formula",
            offeredMl: 60,
            consumedMl: 40,
            startedAt: at("09:15"),
            endedAt: at("09:20"),
          },
        ],
      })
      .expect(201);

    await app.close();
    api = await start();

    const reloaded = await api.get(`/api/pumping-sessions/${pumping.id}`).expect(200);
    expect(reloaded.body.leftVolumeMl).toBe(45);
    const feedingBack = await api.get(`/api/feedings/${feeding.body.id}`).expect(200);
    expect(feedingBack.body.segments).toHaveLength(2);
  });

  it("runs a live breastfeeding session through pause, switch, supplement and finish", async () => {
    const api = await start();
    const started = await api
      .post("/api/feedings")
      .send({
        status: "active",
        segments: [
          {
            type: "breastfeeding",
            breast: "left",
            startedAt: at("10:00"),
            endedAt: null,
            pauses: [],
          },
        ],
      })
      .expect(201);
    const id = started.body.id as string;
    expect(started.body.endedAt).toBeNull();

    // A second simultaneous feeding is rejected.
    await api
      .post("/api/feedings")
      .send({
        status: "active",
        segments: [
          {
            type: "breastfeeding",
            breast: "right",
            startedAt: at("10:01"),
            endedAt: null,
            pauses: [],
          },
        ],
      })
      .expect(409);

    // Active sessions can be recovered after a reload.
    const active = await api.get("/api/feedings?status=active").expect(200);
    expect(active.body.map((f: FeedingWithSummary) => f.id)).toEqual([id]);

    const segmentId = started.body.segments[0].id as string;
    const finished = await api
      .patch(`/api/feedings/${id}`)
      .send({
        status: "completed",
        segments: [
          {
            id: segmentId,
            type: "breastfeeding",
            breast: "left",
            startedAt: at("10:00"),
            endedAt: at("10:12"),
            pauses: [{ startedAt: at("10:04"), endedAt: at("10:06") }],
          },
          {
            type: "breastfeeding",
            breast: "right",
            startedAt: at("10:12"),
            endedAt: at("10:20"),
            pauses: [],
          },
          {
            type: "bottle",
            milkType: "expressed_breast_milk",
            offeredMl: 50,
            consumedMl: 30,
            startedAt: at("10:22"),
            endedAt: at("10:25"),
          },
        ],
      })
      .expect(200);

    const body = finished.body as FeedingWithSummary;
    expect(body.status).toBe("completed");
    expect(body.startedAt).toBe(at("10:00"));
    expect(body.endedAt).toBe(at("10:25"));
    expect(body.segments[0]!.id).toBe(segmentId);
    expect(body.summary.breastfeeding).toEqual({
      leftMs: 10 * 60_000,
      rightMs: 8 * 60_000,
      totalMs: 18 * 60_000,
    });
    expect(body.summary.bottle.expressedBreastMilkMl).toBe(30);
  });

  it("validates requests with consistent error responses", async () => {
    const api = await start();
    const tooMuch = await api
      .post("/api/feedings")
      .send({
        status: "completed",
        segments: [
          {
            type: "bottle",
            milkType: "formula",
            offeredMl: 60,
            consumedMl: 90,
            startedAt: at("11:00"),
            endedAt: at("11:05"),
          },
        ],
      })
      .expect(400);
    expect(tooMuch.body.error.code).toBe("VALIDATION_ERROR");
    expect(tooMuch.body.error.issues[0].path).toBe("segments.0.consumedMl");

    const breastVolume = await api
      .post("/api/feedings")
      .send({
        status: "completed",
        segments: [
          {
            type: "breastfeeding",
            breast: "left",
            startedAt: at("11:00"),
            endedAt: at("11:05"),
            pauses: [],
            consumedMl: 40,
          },
        ],
      })
      .expect(400);
    expect(breastVolume.body.error.code).toBe("VALIDATION_ERROR");

    await api.get("/api/dashboard?date=2026-13-40").expect(400);
    await api.get("/api/feedings/00000000-0000-4000-8000-000000000000").expect(404);
    const malformed = await api
      .post("/api/pumping-sessions")
      .set("content-type", "application/json")
      .send("{oops")
      .expect(400);
    expect(malformed.body.error).toBeDefined();
    expect(JSON.stringify(malformed.body)).not.toMatch(/at .*\.js/);
  });

  it("updates and deletes pumping sessions, distinguishing unknown from zero", async () => {
    const api = await start();
    const created = await api
      .post("/api/pumping-sessions")
      .send({ startedAt: at("06:00"), endedAt: at("06:15"), leftVolumeMl: 20 })
      .expect(201);
    expect(created.body.rightVolumeMl).toBeNull();
    expect(created.body.total.kind).toBe("partial");

    const updated = await api
      .patch(`/api/pumping-sessions/${created.body.id}`)
      .send({ rightVolumeMl: 0, notes: "Right side was empty" })
      .expect(200);
    expect(updated.body.total).toEqual({ kind: "complete", totalMl: 20, knownMl: 20 });
    expect(updated.body.updatedAt >= created.body.updatedAt).toBe(true);

    await api.patch(`/api/pumping-sessions/${created.body.id}`).send({ totalMl: 99 }).expect(400);
    await api.delete(`/api/pumping-sessions/${created.body.id}`).expect(204);
    await api.get(`/api/pumping-sessions/${created.body.id}`).expect(404);
  });

  it("aggregates the dashboard for a calendar day", async () => {
    const api = await start();
    await api
      .post("/api/pumping-sessions")
      .send({ startedAt: at("07:00"), endedAt: at("07:20"), leftVolumeMl: 40, rightVolumeMl: 35 })
      .expect(201);
    await api
      .post("/api/feedings")
      .send({
        status: "completed",
        segments: [
          {
            type: "breastfeeding",
            breast: "right",
            startedAt: at("08:00"),
            endedAt: at("08:15"),
            pauses: [],
          },
          {
            type: "bottle",
            milkType: "formula",
            offeredMl: 40,
            consumedMl: 25,
            startedAt: at("08:20"),
            endedAt: at("08:20"),
          },
        ],
      })
      .expect(201);

    const res = await api.get("/api/dashboard?date=2026-10-25").expect(200);
    const dashboard = res.body as Dashboard;
    expect(dashboard.feeding.sessionCount).toBe(1);
    expect(dashboard.feeding.bottle.formulaMl).toBe(25);
    expect(dashboard.feeding.breastfeeding.rightMs).toBe(15 * 60_000);
    expect(dashboard.pumping.knownVolumeMl).toBe(75);
    expect(dashboard.timeline.map((t) => t.kind)).toEqual(["pumping", "feeding"]);
  });

  it("links bottles to milk batches only when explicitly referenced", async () => {
    const api = await start();
    const pumping = await api
      .post("/api/pumping-sessions")
      .send({ startedAt: at("05:00"), endedAt: at("05:20"), leftVolumeMl: 60, rightVolumeMl: 60 })
      .expect(201);
    await api
      .post("/api/milk-batches")
      .send({ source: "pumping", pumpingSessionId: pumping.body.id, initialVolumeMl: 200 })
      .expect(400);
    const batch = await api
      .post("/api/milk-batches")
      .send({ source: "pumping", pumpingSessionId: pumping.body.id, initialVolumeMl: 100 })
      .expect(201);

    const bottle = (milkBatchId?: string) => ({
      status: "completed",
      segments: [
        {
          type: "bottle",
          milkType: "expressed_breast_milk",
          offeredMl: 60,
          consumedMl: 50,
          startedAt: at("12:00"),
          endedAt: at("12:10"),
          ...(milkBatchId ? { milkBatchId } : {}),
        },
      ],
    });
    await api.post("/api/feedings").send(bottle()).expect(201);
    await api.post("/api/feedings").send(bottle(batch.body.id)).expect(201);

    const batches = await api.get("/api/milk-batches").expect(200);
    expect(batches.body[0]).toMatchObject({ initialVolumeMl: 100, consumedMl: 50, offeredMl: 60 });
    await api.delete(`/api/pumping-sessions/${pumping.body.id}`).expect(409);
  });

  it("serves insights for a period and validates the query", async () => {
    const api = await start();
    await api
      .post("/api/pumping-sessions")
      .send({ startedAt: at("07:00"), endedAt: at("07:20"), leftVolumeMl: 30, rightVolumeMl: null })
      .expect(201);
    await api
      .post("/api/feedings")
      .send({
        status: "completed",
        segments: [
          {
            type: "bottle",
            milkType: "expressed_breast_milk",
            offeredMl: 60,
            consumedMl: 55,
            startedAt: at("09:00"),
            endedAt: at("09:10"),
          },
        ],
      })
      .expect(201);

    const res = await api.get("/api/insights?days=14&end=2026-10-25").expect(200);
    const insights = res.body as Insights;
    expect(insights.period).toEqual({ days: 14, startDate: "2026-10-12", endDate: "2026-10-25" });
    const day = insights.feeding.days.at(-1)!;
    expect(day).toMatchObject({ date: "2026-10-25", expressedBreastMilkMl: 55, formulaMl: 0 });
    expect(insights.pumping.days.at(-1)).toMatchObject({
      leftMl: 30,
      rightMl: null,
      unmeasuredSides: 1,
    });
    expect(insights.feeding.days[0]!.expressedBreastMilkMl).toBeNull();

    await api.get("/api/insights?days=30").expect(400);
    await api.get("/api/insights?end=2026-02-30").expect(400);
    const defaults = await api.get("/api/insights").expect(200);
    expect(defaults.body.period.days).toBe(7);
  });
});
