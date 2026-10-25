import type { FeedingWithSummary, TimelineItem } from "@isaac/shared";
import { Text, View } from "reshaped";
import { useNow } from "../../hooks/useNow";
import { TimelineEntry } from "./TimelineEntry";

type Props = {
  items: TimelineItem[];
  order?: "oldest-first" | "newest-first";
  emptyText?: string;
  onDelete?: (feeding: FeedingWithSummary) => void;
};

/** Feedings in a day's timeline. Pumping items from the API are not shown. */
export function feedingsOf(items: TimelineItem[]): FeedingWithSummary[] {
  return items.flatMap((item) => (item.kind === "feeding" ? [item.feeding] : []));
}

export function Timeline({
  items,
  order = "oldest-first",
  emptyText = "Nothing logged yet.",
  onDelete,
}: Props) {
  const feedings = feedingsOf(items);
  const hasActive = feedings.some((f) => f.status === "active");
  const now = useNow(30_000, hasActive);
  const sorted = order === "newest-first" ? [...feedings].reverse() : feedings;

  if (sorted.length === 0) {
    return (
      <View padding={6} borderRadius="medium" borderColor="neutral-faded" align="center">
        <Text color="neutral-faded">{emptyText}</Text>
      </View>
    );
  }
  return (
    <View as="ol" gap={3} attributes={{ "aria-label": "Feedings" }}>
      {sorted.map((feeding) => (
        <View as="li" key={feeding.id}>
          <TimelineEntry feeding={feeding} now={now} onDelete={onDelete} />
        </View>
      ))}
    </View>
  );
}
