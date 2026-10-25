import type { Insights } from "@isaac/shared";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Grid, View } from "reshaped";
import { formatMl } from "../../lib/format";
import { Stat } from "../dashboard/DashboardPage";
import { ChartCard } from "./ChartCard";
import { TooltipBox, type TooltipLine } from "./ChartTooltip";
import { DayTick } from "./DayTick";
import { axisTick, token, useSeriesColors } from "./chart-theme";
import { formatDayLong, formatDayMedium } from "./format";

type Row = Insights["pumping"]["days"][number];

const NO_RECORDS = "No pumping recorded";

function sideValue(value: number | null, recorded: boolean): string {
  if (!recorded) return "—";
  return value === null ? "Not measured" : formatMl(value);
}

function unmeasuredNote(row: Row): string | undefined {
  if (row.sessionCount === 0) return NO_RECORDS;
  if (row.unmeasuredSides === 0) return undefined;
  return `${row.unmeasuredSides} side${row.unmeasuredSides > 1 ? "s" : ""} not measured — the real total is higher than shown.`;
}

export function PumpingInsights({ insights }: { insights: Insights }) {
  const colors = useSeriesColors();
  const { days, totals } = insights.pumping;
  const period = insights.period.days;
  const flagged = new Set(days.filter((d) => d.unmeasuredSides > 0).map((d) => d.date));
  const tick = (props: object) => <DayTick {...props} compact={period > 7} flagged={flagged} />;
  const anyUnmeasured = totals.unmeasuredSides > 0;

  const tooltipLines = (row: Row): TooltipLine[] =>
    row.sessionCount === 0
      ? []
      : [
          { label: "Left", value: sideValue(row.leftMl, true), color: colors.blue },
          { label: "Right", value: sideValue(row.rightMl, true), color: colors.orange },
          {
            label: row.complete ? "Total" : "Measured",
            value: row.measuredMl === null ? "Not measured" : formatMl(row.measuredMl),
          },
          { label: "Sessions", value: String(row.sessionCount) },
        ];

  return (
    <View gap={4}>
      <Grid columns={2} gap={3}>
        <Stat
          label={anyUnmeasured ? "Measured expressed milk" : "Expressed milk"}
          value={formatMl(totals.measuredMl)}
          caption={
            anyUnmeasured
              ? `${totals.unmeasuredSides} side${totals.unmeasuredSides > 1 ? "s" : ""} not measured`
              : `Left ${formatMl(totals.leftMl)} · right ${formatMl(totals.rightMl)}`
          }
        />
        <Stat
          label="Pumping sessions"
          value={String(totals.sessionCount)}
          caption={`On ${totals.daysWithRecords} of ${period} days`}
        />
      </Grid>

      <ChartCard
        title="Expressed milk per day by breast"
        description="Measured ml from the left and right breast."
        legend={[
          { label: "Left", color: colors.blue },
          { label: "Right", color: colors.orange },
        ]}
        summary={`Stacked bar chart of daily expressed milk over ${period} days: left ${formatMl(totals.leftMl)}, right ${formatMl(totals.rightMl)} measured.`}
        table={{
          columns: ["Day", "Left", "Right", "Measured", "Sessions"],
          rows: days.map((r) =>
            r.sessionCount === 0
              ? [formatDayMedium(r.date), "—", "—", NO_RECORDS, "0"]
              : [
                  formatDayMedium(r.date),
                  sideValue(r.leftMl, true),
                  sideValue(r.rightMl, true),
                  r.measuredMl === null
                    ? "Not measured"
                    : `${formatMl(r.measuredMl)}${r.complete ? "" : " (incomplete)"}`,
                  String(r.sessionCount),
                ],
          ),
        }}
        footnote={
          anyUnmeasured
            ? "? marks days with a breast that wasn't measured. Bars show measured volume only, not an estimate."
            : "Days without pumping show no bar."
        }
      >
        <BarChart
          responsive
          data={days}
          height={230}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke={token.grid} />
          <XAxis
            dataKey="date"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: token.grid }}
            interval={0}
            height={anyUnmeasured ? 48 : 34}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: token.cursor }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
              if (!row) return null;
              return (
                <TooltipBox
                  title={formatDayLong(row.date)}
                  lines={tooltipLines(row)}
                  note={unmeasuredNote(row)}
                />
              );
            }}
          />
          <Bar
            dataKey="leftMl"
            name="Left"
            stackId="side"
            fill={colors.blue}
            stroke={token.surface}
            strokeWidth={2}
            maxBarSize={36}
            isAnimationActive={false}
          />
          <Bar
            dataKey="rightMl"
            name="Right"
            stackId="side"
            fill={colors.orange}
            stroke={token.surface}
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Daily expression trend"
        description="Measured ml per day. Gaps are days without pumping."
        legend={
          anyUnmeasured
            ? [
                { label: "All sides measured", color: colors.blue, shape: "dot" },
                { label: "Incomplete day", color: colors.blue, shape: "hollow" },
              ]
            : undefined
        }
        summary={`Line chart of measured expressed milk per day over ${period} days.`}
        table={{
          columns: ["Day", "Measured", "Complete"],
          rows: days.map((r) => [
            formatDayMedium(r.date),
            r.sessionCount === 0
              ? NO_RECORDS
              : r.measuredMl === null
                ? "Not measured"
                : formatMl(r.measuredMl),
            r.sessionCount === 0 ? "—" : r.complete ? "Yes" : "No",
          ]),
        }}
      >
        <LineChart
          responsive
          data={days}
          height={200}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke={token.grid} />
          <XAxis
            dataKey="date"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: token.grid }}
            interval={0}
            height={anyUnmeasured ? 48 : 34}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: token.grid, strokeWidth: 2 }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
              if (!row) return null;
              return (
                <TooltipBox
                  title={formatDayLong(row.date)}
                  lines={tooltipLines(row)}
                  note={unmeasuredNote(row)}
                />
              );
            }}
          />
          <Line
            dataKey="measuredMl"
            name="Measured"
            stroke={colors.blue}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; payload?: Row; index?: number }) => {
              const { cx, cy, payload } = props;
              if (cx == null || cy == null || !payload || payload.measuredMl === null)
                return <g key={props.index} />;
              return (
                <circle
                  key={props.index}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  stroke={colors.blue}
                  strokeWidth={2}
                  fill={payload.complete ? colors.blue : token.surface}
                />
              );
            }}
            activeDot={{ r: 6, stroke: token.surface, strokeWidth: 2, fill: colors.blue }}
          />
        </LineChart>
      </ChartCard>
    </View>
  );
}
