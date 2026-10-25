import type { ReactNode } from "react";
import { Text, View } from "reshaped";

export type TooltipLine = { label: string; value: string; color?: string };

/** Tooltip body rendered by Recharts' `content`; ink uses text tokens, color only on the swatch. */
export function TooltipBox({
  title,
  lines,
  note,
}: {
  title: string;
  lines: TooltipLine[];
  note?: ReactNode;
}) {
  return (
    <View
      padding={3}
      gap={1}
      borderRadius="medium"
      backgroundColor="elevation-overlay"
      shadow="overlay"
      attributes={{ style: { minWidth: 160, pointerEvents: "none" } }}
    >
      <Text variant="caption-1" weight="bold">
        {title}
      </Text>
      {lines.map((line) => (
        <View key={line.label} direction="row" gap={2} align="center" justify="space-between">
          <View direction="row" gap={2} align="center">
            {line.color && (
              <svg width="10" height="10" aria-hidden="true">
                <rect width="10" height="10" rx="2" fill={line.color} />
              </svg>
            )}
            <Text variant="caption-1" color="neutral-faded">
              {line.label}
            </Text>
          </View>
          <Text variant="caption-1" weight="medium" numeric>
            {line.value}
          </Text>
        </View>
      ))}
      {note && (
        <Text variant="caption-1" color="neutral-faded">
          {note}
        </Text>
      )}
    </View>
  );
}
