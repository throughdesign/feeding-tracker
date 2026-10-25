import type { Insights } from "@isaac/shared";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Grid, View } from "reshaped";
import { Stat } from "../dashboard/DashboardPage";
import { formatMinutes, formatMl } from "../../lib/format";
import { ChartCard } from "./ChartCard";
import { TooltipBox } from "./ChartTooltip";
import { FeedingRhythm } from "./FeedingRhythm";
import { axisTick, token, useSeriesColors } from "./chart-theme";
import { DayTick } from "./DayTick";
import { formatDayLong, formatDayMedium, msToMinutes } from "./format";

type Row = {
  date: string;
  sessionCount: number;
  expressed: number | null;
  formula: number | null;
  breastMin: number | null;
};

const NO_RECORDS = "No feedings recorded";

export function FeedingInsights({ insights }: { insights: Insights }) {
  const colors = useSeriesColors();
  const { days, totals, rhythm } = insights.feeding;
  const period = insights.period.days;
  const rows: Row[] = days.map((d) => ({
    date: d.date,
    sessionCount: d.sessionCount,
    expressed: d.expressedBreastMilkMl,
    formula: d.formulaMl,
    breastMin: d.breastfeedingMs === null ? null : msToMinutes(d.breastfeedingMs),
  }));
  const tick = (props: object) => <DayTick {...props} compact={period > 7} />;
  const avgDays = Math.max(1, totals.daysWithRecords);

  return (
    <View gap={4}>
      <Grid columns={2} gap={3}>
        <Stat
          label="Bottle consumption"
          value={formatMl(totals.bottleConsumedMl)}
          caption={`Expressed milk ${formatMl(totals.expressedBreastMilkMl)} · formula ${formatMl(totals.formulaMl)}`}
        />
        <Stat
          label="Direct breastfeeding"
          value={formatMinutes(totals.breastfeedingMs)}
          caption="Time only · volume not measured"
        />
        <Stat
          label="Feedings"
          value={String(totals.sessionCount)}
          caption={`${(totals.sessionCount / avgDays).toFixed(1)} per day with records`}
        />
        <Stat label="Days with records" value={`${totals.daysWithRecords} of ${period}`} />
      </Grid>

      <ChartCard
        title="Bottle consumption per day"
        description="Measured ml by milk type. Breastfeeding isn't included: its volume is unknown."
        legend={[
          { label: "Expressed milk", color: colors.blue },
          { label: "Formula", color: colors.orange },
        ]}
        summary={`Stacked bar chart of daily bottle consumption over ${period} days: ${formatMl(totals.expressedBreastMilkMl)} expressed milk and ${formatMl(totals.formulaMl)} formula in total.`}
        table={{
          columns: ["Day", "Expressed", "Formula", "Total"],
          rows: rows.map((r) =>
            r.sessionCount === 0
              ? [formatDayMedium(r.date), "—", "—", NO_RECORDS]
              : [
                  formatDayMedium(r.date),
                  formatMl(r.expressed ?? 0),
                  formatMl(r.formula ?? 0),
                  formatMl((r.expressed ?? 0) + (r.formula ?? 0)),
                ],
          ),
        }}
        footnote="Days without any recorded feeding show no bar."
      >
        <BarChart
          responsive
          data={rows}
          height={220}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke={token.grid} />
          <XAxis
            dataKey="date"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: token.grid }}
            interval={0}
            height={34}
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
              if (row.sessionCount === 0)
                return <TooltipBox title={formatDayLong(row.date)} lines={[]} note={NO_RECORDS} />;
              return (
                <TooltipBox
                  title={formatDayLong(row.date)}
                  lines={[
                    {
                      label: "Expressed milk",
                      value: formatMl(row.expressed ?? 0),
                      color: colors.blue,
                    },
                    { label: "Formula", value: formatMl(row.formula ?? 0), color: colors.orange },
                    {
                      label: "Total by bottle",
                      value: formatMl((row.expressed ?? 0) + (row.formula ?? 0)),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="expressed"
            name="Expressed milk"
            stackId="bottle"
            fill={colors.blue}
            stroke={token.surface}
            strokeWidth={2}
            maxBarSize={36}
            isAnimationActive={false}
          />
          <Bar
            dataKey="formula"
            name="Formula"
            stackId="bottle"
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
        title="Direct breastfeeding per day"
        description="Minutes at the breast, excluding pauses."
        summary={`Bar chart of daily direct breastfeeding time over ${period} days, ${formatMinutes(totals.breastfeedingMs)} in total.`}
        table={{
          columns: ["Day", "Breastfeeding"],
          rows: rows.map((r) => [
            formatDayMedium(r.date),
            r.breastMin === null ? NO_RECORDS : `${r.breastMin} min`,
          ]),
        }}
      >
        <BarChart
          responsive
          data={rows}
          height={200}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke={token.grid} />
          <XAxis
            dataKey="date"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: token.grid }}
            interval={0}
            height={34}
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
                  lines={
                    row.breastMin === null
                      ? []
                      : [
                          {
                            label: "At the breast",
                            value: `${row.breastMin} min`,
                            color: colors.blue,
                          },
                        ]
                  }
                  note={row.breastMin === null ? NO_RECORDS : undefined}
                />
              );
            }}
          />
          <Bar
            dataKey="breastMin"
            name="Breastfeeding"
            fill={colors.blue}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartCard>

      <FeedingRhythm
        entries={rhythm}
        dates={days.map((d) => d.date)}
        recordedDates={new Set(rows.filter((r) => r.sessionCount > 0).map((r) => r.date))}
      />
    </View>
  );
}
