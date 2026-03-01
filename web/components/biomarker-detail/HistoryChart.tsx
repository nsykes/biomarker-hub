"use client";

import { BiomarkerDetailData, BiomarkerFlag, BiomarkerHistoryPoint } from "@/lib/types";
import { FLAG_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { formatValue } from "./helpers";
import { convertToCanonical } from "@/lib/unit-conversions";
import { useChartColors } from "@/hooks/useChartColors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface ChartPoint {
  date: string;
  timestamp: number;
  value: number | null;
  flag: BiomarkerFlag;
  label: string;
  isCalculated?: boolean;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload || payload.value === null) return null;
  const color = FLAG_COLORS[payload.flag] ?? "#AEAEB2";
  if (payload.isCalculated) {
    return <circle cx={cx} cy={cy} r={6} fill="var(--color-surface)" stroke={color} strokeWidth={2.5} strokeDasharray="3 2" />;
  }
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="var(--color-surface)" strokeWidth={2.5} />;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-[var(--color-text-primary)]">{p.label}</p>
      <p className="text-[var(--color-text-secondary)]">{p.date}</p>
      {p.isCalculated && (
        <p className="text-[var(--color-calculated)] text-xs mt-0.5">Calculated value</p>
      )}
    </div>
  );
}

function buildRangeZones(
  referenceRange: { goalDirection: string; rangeLow: number | null; rangeHigh: number | null },
  yMin: number,
  yMax: number,
) {
  const zones: React.ReactNode[] = [];
  const green = "#34C759";
  const red = "#FF3B30";
  const greenOpacity = 0.06;
  const redOpacity = 0.05;
  const lineColor = "var(--color-text-tertiary)";

  const { goalDirection, rangeLow, rangeHigh } = referenceRange;

  if (goalDirection === "below" && rangeHigh !== null) {
    zones.push(
      <ReferenceArea key="green-below" y1={yMin} y2={rangeHigh} fill={green} fillOpacity={greenOpacity} stroke="none" />,
      <ReferenceArea key="red-above" y1={rangeHigh} y2={yMax} fill={red} fillOpacity={redOpacity} stroke="none" />,
      <ReferenceLine key="line-high" y={rangeHigh} stroke={lineColor} strokeDasharray="6 3" strokeOpacity={0.5} />,
    );
  } else if (goalDirection === "above" && rangeLow !== null) {
    zones.push(
      <ReferenceArea key="red-below" y1={yMin} y2={rangeLow} fill={red} fillOpacity={redOpacity} stroke="none" />,
      <ReferenceArea key="green-above" y1={rangeLow} y2={yMax} fill={green} fillOpacity={greenOpacity} stroke="none" />,
      <ReferenceLine key="line-low" y={rangeLow} stroke={lineColor} strokeDasharray="6 3" strokeOpacity={0.5} />,
    );
  } else if (goalDirection === "within" && rangeLow !== null && rangeHigh !== null) {
    zones.push(
      <ReferenceArea key="red-below" y1={yMin} y2={rangeLow} fill={red} fillOpacity={redOpacity} stroke="none" />,
      <ReferenceArea key="green-within" y1={rangeLow} y2={rangeHigh} fill={green} fillOpacity={greenOpacity} stroke="none" />,
      <ReferenceArea key="red-above" y1={rangeHigh} y2={yMax} fill={red} fillOpacity={redOpacity} stroke="none" />,
      <ReferenceLine key="line-low" y={rangeLow} stroke={lineColor} strokeDasharray="6 3" strokeOpacity={0.5} />,
      <ReferenceLine key="line-high" y={rangeHigh} stroke={lineColor} strokeDasharray="6 3" strokeOpacity={0.5} />,
    );
  }

  return zones;
}

function computeFlag(
  value: number,
  ref: { goalDirection: string; rangeLow: number | null; rangeHigh: number | null } | null
): BiomarkerFlag {
  if (!ref) return "NORMAL";
  const { goalDirection, rangeLow, rangeHigh } = ref;
  if (goalDirection === "below" && rangeHigh !== null) {
    return value <= rangeHigh ? "NORMAL" : "HIGH";
  }
  if (goalDirection === "above" && rangeLow !== null) {
    return value >= rangeLow ? "NORMAL" : "LOW";
  }
  if (goalDirection === "within" && rangeLow !== null && rangeHigh !== null) {
    if (value < rangeLow) return "LOW";
    if (value > rangeHigh) return "HIGH";
    return "NORMAL";
  }
  return "NORMAL";
}

export function HistoryChart({
  data,
}: {
  data: BiomarkerDetailData;
}) {
  const numericPoints = data.history.filter((h) => h.value !== null);
  const chartColors = useChartColors();

  if (numericPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[var(--color-surface-tertiary)] rounded-xl border border-dashed border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No numeric values to chart
        </p>
      </div>
    );
  }

  // Normalize values to canonical unit (filter out points without dates — can't place on time axis)
  const convertedPoints = numericPoints
    .filter((h) => h.collectionDate !== null)
    .map((h) => {
      const c = convertToCanonical(data.slug, h.value!, h.unit);
      return { point: h, value: c.value, unit: c.unit };
    });

  if (convertedPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[var(--color-surface-tertiary)] rounded-xl border border-dashed border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No numeric values to chart
        </p>
      </div>
    );
  }

  const canonicalUnit =
    convertedPoints.find((c) => c.unit)?.unit || data.defaultUnit || "";

  const chartData: ChartPoint[] = convertedPoints.map(({ point, value }) => ({
    date: formatDate(point.collectionDate),
    timestamp: new Date(point.collectionDate + "T00:00:00").getTime(),
    value,
    flag: computeFlag(value, data.referenceRange),
    label: `${point.valueModifier ?? ""}${parseFloat(value.toFixed(2))} ${canonicalUnit}`.trim(),
    isCalculated: point.isCalculated,
  }));

  const values = convertedPoints.map((c) => c.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = max === min ? Math.max(max * 0.1, 1) : (max - min) * 0.15;

  let yMin = min - padding;
  let yMax = max + padding;

  // Extend Y-axis to always include reference range bounds
  if (data.referenceRange) {
    if (data.referenceRange.rangeLow !== null) {
      yMin = Math.min(yMin, data.referenceRange.rangeLow - padding);
      yMax = Math.max(yMax, data.referenceRange.rangeLow + padding);
    }
    if (data.referenceRange.rangeHigh !== null) {
      yMin = Math.min(yMin, data.referenceRange.rangeHigh - padding);
      yMax = Math.max(yMax, data.referenceRange.rangeHigh + padding);
    }
  }

  // Extend Y-axis to include lab-reported reference ranges (normalized)
  for (const { point } of convertedPoints) {
    if (point.referenceRangeLow !== null) {
      const c = convertToCanonical(data.slug, point.referenceRangeLow, point.unit);
      yMin = Math.min(yMin, c.value - padding);
    }
    if (point.referenceRangeHigh !== null) {
      const c = convertToCanonical(data.slug, point.referenceRangeHigh, point.unit);
      yMax = Math.max(yMax, c.value + padding);
    }
  }

  // Smart tick formatting: choose decimal places based on axis range
  const tickStep = (yMax - yMin) / 5;
  const yDecimals = tickStep >= 50 ? 0 : tickStep >= 0.5 ? 1 : tickStep >= 0.05 ? 2 : 3;

  // Time-proportional X-axis domain
  const timestamps = chartData.map((p) => p.timestamp);
  const tsMin = Math.min(...timestamps);
  const tsMax = Math.max(...timestamps);
  const DAY_MS = 86_400_000;
  const xDomain: [number, number] =
    tsMin === tsMax
      ? [tsMin - 30 * DAY_MS, tsMax + 30 * DAY_MS]
      : [tsMin, tsMax];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={xDomain}
          tickFormatter={formatTimestamp}
          tick={{ fontSize: 12, fill: chartColors.tick }}
          tickLine={false}
          axisLine={{ stroke: chartColors.axis }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 12, fill: chartColors.tick }}
          tickLine={false}
          axisLine={{ stroke: chartColors.axis }}
          tickFormatter={(v: number) => v.toFixed(yDecimals)}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        {data.referenceRange && buildRangeZones(data.referenceRange, yMin, yMax)}
        <Line
          type="monotone"
          dataKey="value"
          stroke={chartColors.primary}
          strokeWidth={2.5}
          dot={<CustomDot />}
          activeDot={{ r: 8, stroke: chartColors.primary, strokeWidth: 2.5, fill: chartColors.surface }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
