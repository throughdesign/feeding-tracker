import {
  breastfeedingDurationMs,
  dateKeyInZone,
  isSegmentPaused,
  openBreastSegment,
  type Dashboard,
} from "@isaac/shared";
import { Baby, ChevronRight, Milk, Timer } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Grid, Icon, Loader, Text, View } from "reshaped";
import { ErrorAlert } from "../../components/ErrorAlert";
import { useNow } from "../../hooks/useNow";
import { breastLabel, formatClock, formatDateKey, formatMinutes, formatMl } from "../../lib/format";
import { useDashboard } from "../../lib/queries";
import { Timeline } from "../timeline/Timeline";
import { NextFeedingCard } from "../schedule/NextFeedingCard";
import { ScheduleSettingsModal } from "../schedule/ScheduleSettingsModal";

export function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: ReactNode;
}) {
  return (
    <View padding={4} borderRadius="medium" backgroundColor="neutral-faded" gap={1} height="100%">
      <Text variant="body-2" color="neutral-faded">
        {label}
      </Text>
      <Text variant="featured-2" weight="bold" numeric>
        {value}
      </Text>
      {caption && (
        <Text variant="caption-1" color="neutral-faded">
          {caption}
        </Text>
      )}
    </View>
  );
}

function ActiveFeedingCard({ dashboard, now }: { dashboard: Dashboard; now: number }) {
  const navigate = useNavigate();
  const active = dashboard.activeFeeding;
  if (!active) return null;
  const open = openBreastSegment(active.segments);
  const status = open
    ? `${breastLabel[open.breast]} breast · ${formatClock(breastfeedingDurationMs(open, now))}${isSegmentPaused(open) ? " · paused" : ""}`
    : "Timer stopped";
  return (
    <Card padding={4} onClick={() => navigate(`/feeding/${active.id}`)}>
      <View direction="row" gap={3} align="center">
        <Icon svg={Timer} size={6} color="positive" />
        <View.Item grow>
          <Text variant="body-1" weight="bold">
            Feeding in progress
          </Text>
          <Text variant="body-2" numeric>
            {status}
          </Text>
        </View.Item>
        <Icon svg={ChevronRight} size={5} />
      </View>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const query = useDashboard();
  const live = Boolean(query.data?.activeFeeding);
  const now = useNow(live ? 1000 : 30_000);
  const today = dateKeyInZone(now);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <View gap={6}>
      <View gap={0}>
        <Text as="h1" variant="featured-1" weight="bold">
          Isaac&rsquo;s Feeding
        </Text>
        <Text color="neutral-faded">{formatDateKey(query.data?.date ?? today)}</Text>
      </View>

      {query.isPending && <Loader ariaLabel="Loading today" />}
      <ErrorAlert error={query.error} title="Could not load today" />

      {query.data && (
        <>
          <NextFeedingCard
            nextFeeding={query.data.nextFeeding}
            onOpenSettings={() => setScheduleOpen(true)}
          />

          <ActiveFeedingCard dashboard={query.data} now={now} />

          <Button
            size="xlarge"
            color="primary"
            fullWidth
            icon={Baby}
            onClick={() => navigate("/feeding/new")}
          >
            {query.data.activeFeeding ? "Open feeding" : "New feeding"}
          </Button>

          <DaySummary dashboard={query.data} />

          <View gap={3}>
            <View direction="row" justify="space-between" align="center">
              <Text as="h2" variant="featured-3" weight="bold">
                Recent activity
              </Text>
              <Button variant="ghost" endIcon={ChevronRight} onClick={() => navigate("/history")}>
                History
              </Button>
            </View>
            <Timeline
              items={query.data.timeline}
              order="newest-first"
              emptyText="No feedings logged today yet."
            />
          </View>
        </>
      )}
      <ScheduleSettingsModal active={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </View>
  );
}

/** Isaac's feeding totals for the day. */
export function DaySummary({ dashboard }: { dashboard: Dashboard }) {
  const { feeding } = dashboard;
  return (
    <View gap={3}>
      <View direction="row" gap={2} align="center">
        <Icon svg={Milk} size={5} />
        <Text as="h2" variant="body-1" weight="bold">
          Isaac drank
        </Text>
      </View>
      <Grid columns={2} gap={3}>
        <Stat
          label="By bottle"
          value={formatMl(feeding.bottle.consumedMl)}
          caption={
            feeding.bottle.count
              ? `Expressed milk ${formatMl(feeding.bottle.expressedBreastMilkMl)} · formula ${formatMl(feeding.bottle.formulaMl)}`
              : "No bottles yet"
          }
        />
        <Stat
          label="At the breast"
          value={formatMinutes(feeding.breastfeeding.totalMs)}
          caption="Volume not measured"
        />
        <Stat
          label="Feedings"
          value={String(feeding.sessionCount)}
          caption={
            feeding.breastfeeding.sessionCount
              ? `${feeding.breastfeeding.sessionCount} with breastfeeding`
              : undefined
          }
        />
        <Stat
          label="Breast sides"
          value={`L ${Math.round(feeding.breastfeeding.leftMs / 60_000)} · R ${Math.round(feeding.breastfeeding.rightMs / 60_000)}`}
          caption="minutes per side"
        />
      </Grid>
    </View>
  );
}
