import { dateKeyInZone, nextFeedingPhase, type NextFeeding } from "@isaac/shared";
import { AlarmClock, Clock, Settings2, Timer } from "lucide-react";
import { Badge, Button, Card, Icon, Text, View } from "reshaped";
import { useNow } from "../../hooks/useNow";
import { formatHoursMinutes, formatTime } from "../../lib/format";

export function formatInterval(minutes: number): string {
  return formatHoursMinutes(minutes * 60_000);
}

function dayQualifier(iso: string, now: number): string {
  const target = dateKeyInZone(iso);
  const today = dateKeyInZone(now);
  if (target === today) return "";
  return Date.parse(iso) > now ? "tomorrow" : "yesterday";
}

const PHASE = {
  upcoming: { label: "Upcoming", color: "neutral", icon: Clock },
  overdue: { label: "Overdue", color: "warning", icon: AlarmClock },
  "in-progress": { label: "Feeding now", color: "positive", icon: Timer },
} as const;

/**
 * Next feeding, derived on the server from feeding history and settings. The
 * remaining time is recomputed from the clock on every tick and when the page
 * becomes visible again; there is no in-memory countdown.
 */
export function NextFeedingCard({
  nextFeeding,
  onOpenSettings,
}: {
  nextFeeding: NextFeeding;
  onOpenSettings: () => void;
}) {
  const now = useNow(1000);

  const settingsButton = (
    <Button
      variant="ghost"
      icon={Settings2}
      attributes={{ "aria-label": "Feeding schedule settings" }}
      onClick={onOpenSettings}
    />
  );

  if (nextFeeding.state === "no-history") {
    return (
      <Card padding={4}>
        <View direction="row" gap={3} align="start">
          <Icon svg={Clock} size={5} color="neutral-faded" />
          <View.Item grow>
            <View gap={1}>
              <Text variant="body-1" weight="bold">
                Next feeding
              </Text>
              <Text variant="body-2" color="neutral-faded">
                No feedings yet. The next feeding time appears once you log the first feeding (every{" "}
                {formatInterval(nextFeeding.settings.dayIntervalMinutes)}, start to start).
              </Text>
            </View>
          </View.Item>
          {settingsButton}
        </View>
      </Card>
    );
  }

  const { phase, msRemaining } = nextFeedingPhase(nextFeeding, now);
  const meta = PHASE[phase];
  const qualifier = dayQualifier(nextFeeding.nextFeedingAt, now);
  const relative =
    msRemaining >= 0
      ? `in ${formatHoursMinutes(msRemaining)}`
      : `${formatHoursMinutes(msRemaining)} ago`;
  const modeLabel = nextFeeding.settings.nightModeEnabled ? ` (${nextFeeding.mode})` : "";

  return (
    <Card padding={4}>
      <View gap={3} attributes={{ "aria-live": "polite", "aria-atomic": true }}>
        <View direction="row" align="center" gap={2}>
          <View.Item grow>
            <Text variant="body-2" weight="medium" color="neutral-faded">
              Next feeding
            </Text>
          </View.Item>
          <Badge color={meta.color} variant="faded" icon={meta.icon}>
            {meta.label}
          </Badge>
          {settingsButton}
        </View>

        <View direction="row" align="end" gap={3} wrap>
          <Text variant="headline-2" weight="bold" numeric>
            {formatTime(nextFeeding.nextFeedingAt)}
          </Text>
          <View paddingBottom={1}>
            <Text
              variant="body-1"
              weight="medium"
              color={phase === "overdue" ? "warning" : undefined}
            >
              {qualifier && `${qualifier} · `}
              {phase === "overdue" ? `Overdue by ${formatHoursMinutes(msRemaining)}` : relative}
            </Text>
          </View>
        </View>

        <Text variant="body-2" color="neutral-faded" numeric>
          {phase === "in-progress" ? "Feeding started" : "Last feeding started"}{" "}
          {formatTime(nextFeeding.lastFeeding.startedAt)}
          {dayQualifier(nextFeeding.lastFeeding.startedAt, now) === "yesterday"
            ? " yesterday"
            : ""}{" "}
          · every {formatInterval(nextFeeding.intervalMinutes)}
          {modeLabel}, start to start
        </Text>
      </View>
    </Card>
  );
}
