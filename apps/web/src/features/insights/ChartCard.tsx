import { Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button, Card, Table, Text, View } from "reshaped";

export type LegendItem = {
  label: string;
  color: string;
  shape?: "square" | "line" | "dot" | "hollow";
};

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <View direction="row" gap={4} wrap as="ul" attributes={{ "aria-label": "Legend" }}>
      {items.map((item) => (
        <View as="li" key={item.label} direction="row" gap={2} align="center">
          <svg width="14" height="14" aria-hidden="true">
            {item.shape === "line" ? (
              <line x1="0" x2="14" y1="7" y2="7" stroke={item.color} strokeWidth="2" />
            ) : item.shape === "dot" ? (
              <circle cx="7" cy="7" r="5.5" fill={item.color} />
            ) : item.shape === "hollow" ? (
              <circle cx="7" cy="7" r="4.5" fill="none" stroke={item.color} strokeWidth="2" />
            ) : (
              <rect width="14" height="14" rx="3" fill={item.color} />
            )}
          </svg>
          <Text variant="caption-1" color="neutral-faded">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

type Props = {
  title: string;
  description?: ReactNode;
  legend?: LegendItem[];
  footnote?: ReactNode;
  /** Plain-language summary for screen readers. */
  summary: string;
  table: { columns: string[]; rows: Array<Array<ReactNode>> };
  children: ReactNode;
};

/** Chart container with a concise legend and an accessible data-table view. */
export function ChartCard({
  title,
  description,
  legend,
  footnote,
  summary,
  table,
  children,
}: Props) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  return (
    <Card padding={4}>
      <View gap={3} as="section" attributes={{ "aria-labelledby": titleId }}>
        <View direction="row" align="start" gap={2}>
          <View.Item grow>
            <View gap={1}>
              <Text as="h3" variant="body-1" weight="bold" attributes={{ id: titleId }}>
                {title}
              </Text>
              {description && (
                <Text variant="caption-1" color="neutral-faded">
                  {description}
                </Text>
              )}
            </View>
          </View.Item>
          <Button
            size="small"
            variant="ghost"
            icon={Table2}
            highlighted={showTable}
            attributes={{ "aria-pressed": showTable }}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? "Chart" : "Table"}
          </Button>
        </View>
        {legend && legend.length > 1 && !showTable && <Legend items={legend} />}
        {showTable ? (
          <View overflow="auto">
            <Table>
              <Table.Head>
                <Table.Row>
                  {table.columns.map((c, i) => (
                    <Table.Heading key={c} align={i === 0 ? "start" : "end"}>
                      {c}
                    </Table.Heading>
                  ))}
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {table.rows.map((row, r) => (
                  <Table.Row key={r}>
                    {row.map((cell, i) => (
                      <Table.Cell key={i} align={i === 0 ? "start" : "end"}>
                        {cell}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </View>
        ) : (
          <div role="group" aria-label={summary}>
            {children}
          </div>
        )}
        {footnote && (
          <Text variant="caption-1" color="neutral-faded">
            {footnote}
          </Text>
        )}
      </View>
    </Card>
  );
}
