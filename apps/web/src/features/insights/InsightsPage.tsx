import type { InsightPeriod } from "@isaac/shared";
import { Baby, RotateCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Loader, Text, ToggleButton, ToggleButtonGroup, View } from "reshaped";
import { ErrorAlert } from "../../components/ErrorAlert";
import { PageHeader } from "../../components/PageHeader";
import { useInsights } from "../../lib/queries";
import { FeedingInsights } from "./FeedingInsights";
import { formatRange } from "./format";

const STORAGE_KEY = "isaac-feeding:insights";

function loadDays(): InsightPeriod {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as { days?: number };
    return saved.days === 14 ? 14 : 7;
  } catch {
    return 7;
  }
}

function saveDays(days: InsightPeriod) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ days }));
  } catch {
    // Preferences are a convenience only.
  }
}

export function InsightsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(loadDays);
  const query = useInsights(days);
  const data = query.data;
  const isEmpty = data && data.feeding.totals.sessionCount === 0;

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

      <View direction="row" align="center" justify="space-between" gap={3}>
        <Text variant="body-2" color="neutral-faded">
          Period
        </Text>
        <ToggleButtonGroup
          value={[String(days)]}
          selectionMode="single"
          selectedColor="primary"
          attributes={{ "aria-label": "Period", role: "radiogroup" }}
          onChange={({ value }) => {
            if (!value[0]) return;
            const next = Number(value[0]) as InsightPeriod;
            setDays(next);
            saveDays(next);
          }}
        >
          <ToggleButton value="7">7 days</ToggleButton>
          <ToggleButton value="14">14 days</ToggleButton>
        </ToggleButtonGroup>
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
            No feedings recorded in the last {days} days.
          </Text>
          <Text align="center" variant="body-2" color="neutral-faded">
            Insights appear here once there are feedings in this period.
          </Text>
          <Button variant="outline" icon={Baby} onClick={() => navigate("/feeding/new")}>
            Log feeding
          </Button>
        </View>
      )}

      {data && !isEmpty && <FeedingInsights insights={data} />}
    </View>
  );
}
