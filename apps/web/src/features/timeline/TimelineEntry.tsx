import type { TimelineItem } from "@isaac/shared";
import { Baby, Droplets, Milk, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge, Button, Card, Icon, Text, View } from "reshaped";
import { formatTimeRange } from "../../lib/format";
import { feedingDetails, feedingTitle, pumpingDetails } from "./describe";

type Props = {
  item: TimelineItem;
  now: number;
  onDelete?: (item: TimelineItem) => void;
};

export function TimelineEntry({ item, now, onDelete }: Props) {
  const navigate = useNavigate();
  const isFeeding = item.kind === "feeding";
  const feeding = isFeeding ? item.feeding : null;
  const pumping = isFeeding ? null : item.pumping;

  const title = feeding ? feedingTitle(feeding) : "Pumping";
  const category = feeding ? "Isaac fed" : "Milk expressed";
  const icon = feeding ? (feeding.summary.hasBreastfeeding ? Baby : Milk) : Droplets;
  const details = feeding ? feedingDetails(feeding, now) : pumpingDetails(pumping!);
  const endedAt = feeding ? feeding.endedAt : pumping!.endedAt;
  const href = feeding ? `/feeding/${item.id}` : `/pumping/${item.id}`;
  const active = feeding?.status === "active";

  return (
    <Card padding={4}>
      <View direction="row" gap={3} align="start">
        <View
          padding={2}
          borderRadius="medium"
          backgroundColor={feeding ? "primary-faded" : "neutral-faded"}
        >
          <Icon svg={icon} size={5} color={feeding ? "primary" : "neutral"} />
        </View>
        <View.Item grow>
          <View gap={1}>
            <View direction="row" gap={2} align="center" wrap>
              <Text variant="body-2" weight="medium" color="neutral-faded" numeric>
                {formatTimeRange(item.startedAt, endedAt)}
              </Text>
              <Text variant="caption-1" color="neutral-faded">
                {category}
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
            {details.map((line, i) => (
              <Text key={i} variant="body-2" numeric>
                {line}
              </Text>
            ))}
            {(feeding?.notes || pumping?.notes) && (
              <Text variant="body-2" color="neutral-faded">
                {feeding?.notes || pumping?.notes}
              </Text>
            )}
          </View>
        </View.Item>
        <View gap={1}>
          <Button
            variant="ghost"
            icon={Pencil}
            attributes={{
              "aria-label": `Edit ${title.toLowerCase()} at ${formatTimeRange(item.startedAt, endedAt)}`,
            }}
            onClick={() => navigate(href)}
          />
          {onDelete && (
            <Button
              variant="ghost"
              icon={Trash2}
              attributes={{
                "aria-label": `Delete ${title.toLowerCase()} at ${formatTimeRange(item.startedAt, endedAt)}`,
              }}
              onClick={() => onDelete(item)}
            />
          )}
        </View>
      </View>
    </Card>
  );
}
