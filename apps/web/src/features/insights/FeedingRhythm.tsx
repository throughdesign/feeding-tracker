import type { FeedingRhythmEntry } from "@isaac/shared";
import { useState } from "react";
import { Actionable, Text, View } from "reshaped";
import { ChartCard } from "./ChartCard";
import { token, useSeriesColors } from "./chart-theme";
import { formatClockMinute, formatDayLong, formatDayMedium, formatDayShort } from "./format";

const KIND_LABEL: Record<FeedingRhythmEntry["kind"], string> = {
  breastfeeding: "Breast",
  bottle: "Bottle",
  mixed: "Breast + bottle",
};

const HOURS = [0, 6, 12, 18, 24];
const pct = (minute: number) => `${(minute / 1440) * 100}%`;

function describe(entry: FeedingRhythmEntry): string {
  const end = entry.active
    ? "now"
    : entry.continuesNextDay
      ? "after midnight"
      : formatClockMinute(entry.endMinute);
  return `${formatDayLong(entry.date)}, ${formatClockMinute(entry.startMinute)} – ${end}: ${KIND_LABEL[entry.kind]}`;
}

/**
 * 24-hour feeding rhythm: one row per day, each feeding drawn at its local
 * (Europe/Amsterdam) clock time. Plain HTML so marks are tappable buttons.
 */
export function FeedingRhythm({
  entries,
  dates,
  recordedDates,
}: {
  entries: FeedingRhythmEntry[];
  dates: string[];
  recordedDates: Set<string>;
}) {
  const colors = useSeriesColors();
  const kindColor: Record<FeedingRhythmEntry["kind"], string> = {
    breastfeeding: colors.blue,
    bottle: colors.orange,
    mixed: colors.aqua,
  };
  const [selected, setSelected] = useState<FeedingRhythmEntry | null>(null);

  return (
    <ChartCard
      title="24-hour feeding rhythm"
      description="When each feeding started and how long it lasted, by local time."
      legend={[
        { label: KIND_LABEL.breastfeeding, color: kindColor.breastfeeding },
        { label: KIND_LABEL.bottle, color: kindColor.bottle },
        { label: KIND_LABEL.mixed, color: kindColor.mixed },
      ]}
      summary={`Feeding times for ${dates.length} days: ${entries.length} feedings. Use the table view for exact times.`}
      table={{
        columns: ["Day", "Time", "Type"],
        rows: entries.map((e) => [
          formatDayMedium(e.date),
          `${formatClockMinute(e.startMinute)}–${e.active ? "now" : formatClockMinute(e.endMinute)}${e.continuesNextDay ? " (next day)" : ""}`,
          KIND_LABEL[e.kind],
        ]),
      }}
      footnote={
        selected ? (
          <Text as="span" variant="caption-1" weight="medium" color="neutral">
            {describe(selected)}
          </Text>
        ) : (
          "Tap a feeding for details."
        )
      }
    >
      <View gap={1}>
        {dates.map((date) => {
          const dayEntries = entries.filter((e) => e.date === date);
          return (
            <View key={date} direction="row" align="center" gap={2}>
              <View width="52px">
                <Text variant="caption-1" color="neutral-faded" numeric>
                  {formatDayShort(date)}
                </Text>
              </View>
              <View.Item grow>
                <div
                  style={{
                    position: "relative",
                    height: 22,
                    borderRadius: 4,
                    background: recordedDates.has(date) ? token.cursor : "transparent",
                    backgroundImage: `linear-gradient(to right, ${token.grid} 1px, transparent 1px)`,
                    backgroundSize: "25% 100%",
                  }}
                >
                  {dayEntries.map((entry) => {
                    const isSelected = selected?.id === entry.id;
                    return (
                      <Actionable
                        key={entry.id}
                        onClick={() => setSelected(isSelected ? null : entry)}
                        attributes={{
                          "aria-label": describe(entry),
                          "aria-pressed": isSelected,
                          style: {
                            position: "absolute",
                            left: pct(entry.startMinute),
                            width: `max(6px, ${pct(entry.endMinute - entry.startMinute)})`,
                            top: 3,
                            bottom: 3,
                            borderRadius: 3,
                            background: kindColor[entry.kind],
                            boxShadow: isSelected
                              ? `0 0 0 2px ${token.surface}, 0 0 0 4px ${token.text}`
                              : `0 0 0 1px ${token.surface}`,
                          },
                        }}
                      />
                    );
                  })}
                </div>
              </View.Item>
            </View>
          );
        })}
        <View direction="row" gap={2}>
          <View width="52px" />
          <View.Item grow>
            <div style={{ position: "relative", height: 16 }}>
              {HOURS.map((h) => (
                <span
                  key={h}
                  style={{
                    position: "absolute",
                    left: pct(h * 60),
                    transform:
                      h === 0 ? "none" : h === 24 ? "translateX(-100%)" : "translateX(-50%)",
                    fontSize: 12,
                    color: token.textMuted,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </View.Item>
        </View>
      </View>
    </ChartCard>
  );
}
