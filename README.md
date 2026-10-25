# Isaac's Feeding Tracker

A calm, mobile-first web app for two parents to track Isaac's feedings and Mother's breast milk expression. It runs locally and stores everything in a single JSON file on your machine.

It keeps **extraction** (pumping) separate from **consumption** (feeding):

- Mother and Isaac are people. Feeding and pumping are events. Milk is a resource.
- Pumping records left and right volumes separately. The total is always derived, and "not measured" (`null`) is distinct from `0 ml`.
- Direct breastfeeding is recorded as **time per breast only**. Its volume is unknown and is never estimated from duration or from pumped volumes.
- Bottle feeds record offered and consumed volume, for expressed milk or formula.
- A feeding session can combine segments, e.g. left → right → formula supplement.

## Requirements

- Node.js 22.12+ (developed on Node 24)
- pnpm 11 (`corepack enable` or `npm i -g pnpm`)

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

This starts:

| Process      | URL                       | Notes                              |
| ------------ | ------------------------- | ---------------------------------- |
| Web (Vite)   | http://127.0.0.1:5173     | Proxies `/api` to the API          |
| API (NestJS) | http://127.0.0.1:3001/api | Bound to localhost only            |
| Shared       | —                         | `tsc --watch` of `packages/shared` |

Open http://127.0.0.1:5173 on your computer. For a phone-sized view, use your browser's device toolbar.

To try the app with fictional data, run `pnpm data:sample` before the first start. It copies `data/sample/feeding.sample.json` to `data/feeding.json` and refuses to overwrite an existing file.

### All scripts

| Command            | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `pnpm dev`         | Shared package watcher, API and web together                   |
| `pnpm build`       | Builds shared, API (`apps/api/dist`) and web (`apps/web/dist`) |
| `pnpm start`       | Runs the built API (`node apps/api/dist/main.js`)              |
| `pnpm test`        | Vitest unit and integration tests in all packages              |
| `pnpm lint`        | ESLint across the monorepo                                     |
| `pnpm typecheck`   | `tsc --noEmit` in all packages                                 |
| `pnpm format`      | Prettier                                                       |
| `pnpm data:sample` | Loads the sample data (only if no data file exists)            |

### Environment variables (API)

| Variable    | Default                    | Purpose                                                |
| ----------- | -------------------------- | ------------------------------------------------------ |
| `HOST`      | `127.0.0.1`                | Interface to bind. Keep it on loopback (see Security). |
| `PORT`      | `3001`                     | API port                                               |
| `DATA_FILE` | `<repo>/data/feeding.json` | Location of the JSON database                          |

The web dev server reads `API_URL` (default `http://127.0.0.1:3001`) for its proxy.

## Project structure

```text
isaac-feeding/
├── apps/
│   ├── web/                     React + Vite + Reshaped
│   │   └── src/
│   │       ├── app/             App shell, router, providers, color mode
│   │       ├── components/      Small shared UI pieces (fields, confirm modal, …)
│   │       ├── features/
│   │       │   ├── dashboard/   Today screen and day summary
│   │       │   ├── feeding/     New feeding, live timer, segment forms
│   │       │   ├── insights/    Insights charts (Recharts), rhythm view, table views
│   │       │   ├── pumping/     Pumping form (create/edit)
│   │       │   └── timeline/    Timeline and history screen
│   │       ├── hooks/           useNow (timer ticks), useDraft (unsaved input)
│   │       ├── lib/             API client, TanStack Query hooks, formatting
│   │       └── main.tsx
│   └── api/                     NestJS REST API
│       ├── src/
│       │   ├── common/          Zod pipe, error types, exception filter
│       │   ├── modules/         feeding, pumping, milk-batches, dashboard, insights
│       │   ├── persistence/     JSON file store + repository abstraction
│       │   └── main.ts
│       └── test/                Persistence and API integration tests
├── packages/
│   └── shared/                  Domain types, Zod schemas, pure domain logic
│       └── src/
│           ├── schemas/         Person, PumpingSession, FeedingSession, MilkBatch, Database
│           ├── types/           Inferred types + derived/response types
│           ├── domain/          Totals, durations, timer transitions, dashboard + insights aggregation
│           └── time.ts          Europe/Amsterdam calendar-day helpers
├── data/
│   ├── feeding.json             Runtime data (created on first start, git-ignored)
│   └── sample/                  Fictional sample data (committed)
└── scripts/
```

Domain logic (`packages/shared/src/domain`) has no knowledge of HTTP, React or storage. The API and the web app both use the same schemas and calculations; for example, the live timer uses the same duration function as the dashboard.

## API

All routes are under `/api`. Request bodies are validated with the shared Zod schemas. Errors have one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "…",
    "issues": [{ "path": "segments.0.consumedMl", "message": "…" }]
  }
}
```

Codes: `VALIDATION_ERROR` (400), `BAD_REQUEST` (400), `NOT_FOUND` (404), `CONFLICT` (409), `DATA_FILE_ERROR` (503), `INTERNAL_ERROR` (500). Stack traces are logged on the server and never returned.

### Feedings

```text
GET    /api/feedings                  ?date=YYYY-MM-DD&status=active|completed
GET    /api/feedings/:id
POST   /api/feedings
PATCH  /api/feedings/:id              partial; `segments` replaces the whole list
DELETE /api/feedings/:id
```

```json
{
  "status": "completed",
  "segments": [
    {
      "type": "breastfeeding",
      "breast": "left",
      "startedAt": "2026-10-25T05:10:00.000Z",
      "endedAt": "2026-10-25T05:24:00.000Z",
      "pauses": []
    },
    {
      "type": "bottle",
      "milkType": "formula",
      "offeredMl": 40,
      "consumedMl": 30,
      "startedAt": "2026-10-25T05:37:00.000Z",
      "endedAt": "2026-10-25T05:42:00.000Z"
    }
  ]
}
```

Rules:

- At least one segment. Breastfeeding segments have no volume field (extra fields are rejected).
- `consumedMl ≤ offeredMl`.
- Only one breast can be timed at a time, and only one feeding can be `active` at a time (409 otherwise).
- A `completed` feeding has no open segments or pauses.
- Session `startedAt`/`endedAt` are derived from the segments.
- `milkBatchId` must reference an existing batch whose source matches the milk type.

### Pumping sessions

```text
GET    /api/pumping-sessions          ?date=YYYY-MM-DD
GET    /api/pumping-sessions/:id
POST   /api/pumping-sessions
PATCH  /api/pumping-sessions/:id
DELETE /api/pumping-sessions/:id      409 if a milk batch references it
```

`leftVolumeMl`/`rightVolumeMl` are numbers or `null` (not measured). Responses include a derived `total`:
`{ kind: "complete", totalMl }`, `{ kind: "partial", knownMl, unknownSide }` or `{ kind: "unknown" }`. A partial subtotal is never presented as the total.

### Dashboard

```text
GET /api/dashboard?date=YYYY-MM-DD    defaults to today in Europe/Amsterdam
```

Returns the feeding count, measured bottle consumption (split into expressed milk and formula), breastfeeding time (left, right and total), known pumped volume plus the number of sessions with an unmeasured side, the active feeding, the most recent feeding, and a chronological timeline.

### Insights

```text
GET /api/insights?days=7|14&end=YYYY-MM-DD    end defaults to today in Europe/Amsterdam
```

Daily aggregates for the period (one entry per Amsterdam calendar day, DST-aware), used by the Insights screen:

- `feeding.days[]`: `expressedBreastMilkMl`, `formulaMl` (measured bottle consumption, kept separate) and `breastfeedingMs` (time only). All are `null` on days with no recorded feeding, so "nothing recorded" never shows as a measured 0.
- `feeding.rhythm[]`: each feeding's start and end in local minutes since midnight, its type (breast, bottle or mixed), and whether it runs past midnight.
- `pumping.days[]`: `leftMl` and `rightMl` sum only _measured_ volumes and are `null` when that side wasn't measured that day. `unmeasuredSides` counts unknown sides, and `complete` says whether every side was measured. Unknown volumes are never counted as zero, and no supply is inferred.

### Milk batches

```text
GET  /api/milk-batches
POST /api/milk-batches
```

This is groundwork for future inventory tracking; there is no UI for it yet. A batch's usage (`consumedMl`, `offeredMl`) only counts bottle segments that explicitly reference it through `milkBatchId`. Nothing is subtracted automatically.

## Insights screen

The third tab shows charts for the last 7 or 14 days, split into **Feeding** and **Pumping** views:

- **Feeding:** total measured bottle consumption and breastfeeding minutes; a stacked daily chart of expressed milk vs. formula; daily breastfeeding minutes; and a 24-hour rhythm showing when each feeding happened.
- **Pumping:** total measured volume and session count; a stacked daily chart of left vs. right; and a daily trend line. Days with an unmeasured side are marked with **?** in the bar chart and a hollow point on the trend line; the bars and line show measured volume only.

Every chart has a **Table** toggle with the exact numbers, for accessibility and for checking values. Tooltips work by tap on mobile. Chart colors are the validated categorical slots (blue, orange, aqua), with separate light and dark steps. Text, grid and surfaces use Reshaped tokens.

## Time and calendar days

- All timestamps are stored as UTC ISO strings.
- Days are grouped in **Europe/Amsterdam**, including across DST changes. Times are shown in 24-hour Amsterdam time.
- An activity belongs to the day it **started** on. A feed from 23:50 to 00:20 counts fully towards the earlier day.

## Data storage and backups

- Data lives in `data/feeding.json` (or `DATA_FILE`). It is outside the web app's public directory and is never served by Vite. The Vite dev server also denies `**/data/**`.
- The file is created automatically on first start with Mother and Isaac.
- Every read and write is validated against the schema.
- Writes are serialized in-process, written to a temporary file, `fsync`ed, then atomically renamed over the original. An interrupted save leaves either the old or the new file, never a partial one.
- Before each write, the previous version is copied to `data/feeding.json.bak`.
- If the file can't be parsed or fails validation, the API **refuses to start or write** and returns `DATA_FILE_ERROR`. It never resets your data. Fix the file, or restore `feeding.json.bak`.
- `data/*` (except the sample folder) and `*.bak` are git-ignored. Don't commit real family data.

**Backups:** the `.bak` file only protects against the last write. Copy `data/feeding.json` somewhere safe regularly, for example with Time Machine or a periodic copy to an encrypted drive.

## Security

This is a local, single-machine MVP with **no authentication**.

- The API binds to `127.0.0.1` by default. Don't set `HOST=0.0.0.0` and don't expose it to a network or the internet.
- If both parents need access from their phones later, first add authentication, HTTPS, and a proper deployment and threat model.

## Testing

```bash
pnpm test
```

- `packages/shared`: pumping totals (unknown vs. zero), breastfeeding durations excluding pauses (finished, active, open pause, clipped pauses, crossing midnight), feeding validation (bottle volumes, simultaneous breasts, overlapping pauses), timer transitions, dashboard aggregation (DST day bounds, midnight crossing, by-type totals), Amsterdam time helpers, and validity of the sample data.
- `apps/api/test/json-file-store.test.ts`: file initialization, refusing corrupt or invalid files without modifying them, no write on failed or invalid mutations, backups, leftover temp files, 40 concurrent creates + 20 concurrent updates without lost updates.
- `apps/api/test/api.e2e.test.ts` (Supertest): restarting the app on the same file keeps the data, a full live-session lifecycle with 409 on a second active feed, error format, updating pumping sessions (unknown → zero), dashboard aggregation, explicit milk-batch linkage.

## Design decisions

- **Reshaped (slate theme)** is the only UI library. Light and dark mode follow the system preference and can be toggled; the choice is remembered on the device.
- **Live timers** are stored as timestamps on the server (segments with pauses). The UI derives elapsed time from those timestamps every second, so timers stay correct after a reload, sleep, or on the other parent's device. An in-progress feeding is restored from `GET /api/feedings?status=active`.
- **Timer transitions** (start, pause, resume, switch, stop, finish) are pure functions in `packages/shared`. The client applies them at the moment of the tap and PATCHes the resulting segment list; the server validates every invariant.
- **Unsaved input** for new pumping and bottle entries is kept in `localStorage` for up to 3 hours, so an accidental reload doesn't lose it.
- **Repository abstraction:** services depend on `Repository<T>` interfaces (`apps/api/src/persistence/repositories.ts`), so the JSON store can be replaced with SQLite or PostgreSQL without touching services or controllers.
- **Charts** use Recharts 3 (React 19 compatible, `responsive` sizing, built-in keyboard layer). The 24-hour rhythm is plain HTML so each feeding is a tappable, labelled button.
- **ESM throughout the backend:** NestJS 12 is ESM-only, so the API and shared package are native ES modules. Nest dependencies are injected with explicit `@Inject(...)` tokens, so the code works under `tsx` and Vitest (esbuild) as well as `tsc`.
- **TypeScript 6.0** is used instead of 7.x because typescript-eslint doesn't support TypeScript 7 yet.

## Known MVP limitations

- No authentication or multi-device sync. Concurrent edits to the same feeding from two browsers are last-write-wins.
- Only one API process per data file is safe (the write queue is in-process).
- No milk inventory UI (batches can only be created through the API), no expiry, storage or mixing logic.
- Editing individual pause times is not supported in the UI. Pauses are clipped to corrected segment times, or can be removed.
- `datetime-local` inputs have minute precision. Unchanged fields keep their original seconds.
- No production static hosting: `pnpm build` produces `apps/web/dist`, but the API doesn't serve it. For daily use, run `pnpm dev`, or `pnpm --filter @isaac/web preview` next to `pnpm start`.
- English UI only; no data export or import yet beyond copying the JSON file.
