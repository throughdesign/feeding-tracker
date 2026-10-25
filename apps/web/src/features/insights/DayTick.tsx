import { token } from "./chart-theme";

const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });

type Props = {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  /** Compact single-letter weekday for long periods. */
  compact?: boolean;
  /** Dates to mark with "?" (e.g. a breast volume that wasn't measured). */
  flagged?: Set<string>;
};

/** Two-line day tick ("Mon" / "26") that stays legible at phone width. */
export function DayTick({ x, y, payload, compact, flagged }: Props) {
  const date = payload?.value ?? "";
  const day = weekday.format(new Date(`${date}T12:00:00Z`));
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fill={token.textMuted} fontSize={11}>
        {compact ? day.charAt(0) : day}
      </text>
      <text dy={26} textAnchor="middle" fill={token.textMuted} fontSize={12}>
        {Number(date.slice(8))}
      </text>
      {flagged?.has(date) && (
        <text dy={41} textAnchor="middle" fill={token.text} fontSize={12} fontWeight={700}>
          ?
        </text>
      )}
    </g>
  );
}
