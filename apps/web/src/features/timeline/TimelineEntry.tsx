import type { FeedingWithSummary } from "@isaac/shared";
import { Baby, Milk, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge, Button, Card, Icon, Text, View } from "reshaped";
import { formatTimeRange } from "../../lib/format";
import { feedingDetails, feedingTitle } from "./describe";

type Props = {
  feeding: FeedingWithSummary;
  now: number;
  onDelete?: (feeding: FeedingWithSummary) => void;
};

export function TimelineEntry({ feeding, now, onDelete }: Props) {
  const navigate = useNavigate();
  const title = feedingTitle(feeding);
  const time = formatTimeRange(feeding.startedAt, feeding.endedAt);
  const active = feeding.status === "active";

  return (
    <Card padding={4}>
      <View direction="row" gap={3} align="start">
        <View padding={2} borderRadius="medium" backgroundColor="primary-faded">
          <Icon svg={feeding.summary.hasBreastfeeding ? Baby : Milk} size={5} color="primary" />
        </View>
        <View.Item grow>
          <View gap={1}>
            <View direction="row" gap={2} align="center" wrap>
              <Text variant="body-2" weight="medium" color="neutral-faded" numeric>
                {time}
              </Text>
              {active && (
                <Badge color="positive" variant="faded" size="small">
                  In progress
                </Badge>
              )}
            </View>
            <Text variant="body-1" weight="bold">
              {title}
            </Text>
            {feedingDetails(feeding, now).map((line, i) => (
              <Text key={i} variant="body-2" numeric>
                {line}
              </Text>
            ))}
            {feeding.notes && (
              <Text variant="body-2" color="neutral-faded">
                {feeding.notes}
              </Text>
            )}
          </View>
        </View.Item>
        <View gap={1}>
          <Button
            variant="ghost"
            icon={Pencil}
            attributes={{ "aria-label": `Edit ${title.toLowerCase()} at ${time}` }}
            onClick={() => navigate(`/feeding/${feeding.id}`)}
          />
          {onDelete && (
            <Button
              variant="ghost"
              icon={Trash2}
              attributes={{ "aria-label": `Delete ${title.toLowerCase()} at ${time}` }}
              onClick={() => onDelete(feeding)}
            />
          )}
        </View>
      </View>
    </Card>
  );
}
