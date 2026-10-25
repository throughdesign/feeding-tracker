import type { InsightPeriod } from "@isaac/shared";
import { Baby, Droplets, RotateCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Loader, Tabs, Text, ToggleButton, ToggleButtonGroup, View } from "reshaped";
import { ErrorAlert } from "../../components/ErrorAlert";
import { PageHeader } from "../../components/PageHeader";
import { useInsights } from "../../lib/queries";
import { FeedingInsights } from "./FeedingInsights";
import { PumpingInsights } from "./PumpingInsights";
import { formatRange } from "./format";

type View = "feeding" | "pumping";

const STORAGE_KEY = "isaac-feeding:insights";

function loadPrefs(): { view: View; days: InsightPeriod } {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<{
      view: View;
      days: number;
    }>;
    return {
      view: saved.view === "pumping" ? "pumping" : "feeding",
      days: saved.days === 14 ? 14 : 7,
    };
  } catch {
    return { view: "feeding", days: 7 };
  }
}

function savePrefs(prefs: { view: View; days: InsightPeriod }) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience only.
  }
}

export function InsightsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(loadPrefs);
  const query = useInsights(prefs.days);
  const update = (next: Partial<typeof prefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    savePrefs(merged);
  };

  const data = query.data;
  const isEmpty =
    data &&
    (prefs.view === "feeding"
      ? data.feeding.totals.sessionCount === 0
      : data.pumping.totals.sessionCount === 0);

  return (
    <View gap={5}>
      <PageHeader
        title="Insights"
        back={false}
        subtitle={
          data
            ? `${formatRange(data.period.startDate, data.period.endDate)} · Amsterdam time`
            : undefined
        }
      />

      <View gap={3}>
        <Tabs
          value={prefs.view}
          onChange={({ value }) => update({ view: value as View })}
          variant="pills-raised"
          itemWidth="equal"
        >
          <Tabs.List>
            <Tabs.Item value="feeding" icon={Baby}>
              Feeding
            </Tabs.Item>
            <Tabs.Item value="pumping" icon={Droplets}>
              Pumping
            </Tabs.Item>
          </Tabs.List>
        </Tabs>
        <View direction="row" align="center" justify="space-between" gap={3}>
          <Text variant="body-2" color="neutral-faded">
            Period
          </Text>
          <ToggleButtonGroup
            value={[String(prefs.days)]}
            selectionMode="single"
            selectedColor="primary"
            attributes={{ "aria-label": "Period", role: "radiogroup" }}
            onChange={({ value }) => {
              if (value[0]) update({ days: Number(value[0]) as InsightPeriod });
            }}
          >
            <ToggleButton value="7">7 days</ToggleButton>
            <ToggleButton value="14">14 days</ToggleButton>
          </ToggleButtonGroup>
        </View>
      </View>

      {query.isPending && (
        <View paddingBlock={10} align="center">
          <Loader ariaLabel="Loading insights" />
        </View>
      )}

      {query.isError && (
        <View gap={3}>
          <ErrorAlert error={query.error} title="Could not load insights" />
          <View direction="row">
            <Button
              icon={RotateCw}
              variant="outline"
              onClick={() => query.refetch()}
              loading={query.isFetching}
            >
              Try again
            </Button>
          </View>
        </View>
      )}

      {data && isEmpty && (
        <View padding={6} gap={3} borderRadius="medium" borderColor="neutral-faded" align="center">
          <Text align="center" weight="medium">
            {prefs.view === "feeding"
              ? `No feedings recorded in the last ${prefs.days} days.`
              : `No pumping sessions recorded in the last ${prefs.days} days.`}
          </Text>
          <Text align="center" variant="body-2" color="neutral-faded">
            Insights appear here once there are entries for this period.
          </Text>
          <Button
            variant="outline"
            icon={prefs.view === "feeding" ? Baby : Droplets}
            onClick={() => navigate(prefs.view === "feeding" ? "/feeding/new" : "/pumping/new")}
          >
            {prefs.view === "feeding" ? "Log feeding" : "Log pumping"}
          </Button>
        </View>
      )}

      {data &&
        !isEmpty &&
        (prefs.view === "feeding" ? (
          <FeedingInsights insights={data} />
        ) : (
          <PumpingInsights insights={data} />
        ))}
    </View>
  );
}
