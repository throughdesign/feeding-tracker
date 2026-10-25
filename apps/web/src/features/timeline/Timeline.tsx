import type { TimelineItem } from "@isaac/shared";
import { Text, View } from "reshaped";
import { useNow } from "../../hooks/useNow";
import { TimelineEntry } from "./TimelineEntry";

type Props = {
  items: TimelineItem[];
  order?: "oldest-first" | "newest-first";
  emptyText?: string;
  onDelete?: (item: TimelineItem) => void;
};

export function Timeline({
  items,
  order = "oldest-first",
  emptyText = "Nothing logged yet.",
  onDelete,
}: Props) {
  const hasActive = items.some((i) => i.kind === "feeding" && i.feeding.status === "active");
  const now = useNow(30_000, hasActive);
  const sorted = order === "newest-first" ? [...items].reverse() : items;

  if (sorted.length === 0) {
    return (
      <View padding={6} borderRadius="medium" borderColor="neutral-faded" align="center">
        <Text color="neutral-faded">{emptyText}</Text>
      </View>
    );
  }
  return (
    <View as="ol" gap={3} attributes={{ "aria-label": "Activity timeline" }}>
      {sorted.map((item) => (
        <View as="li" key={`${item.kind}-${item.id}`}>
          <TimelineEntry item={item} now={now} onDelete={onDelete} />
        </View>
      ))}
    </View>
  );
}
