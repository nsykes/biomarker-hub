"use client";

import { BiomarkerDetailData, BiomarkerHistoryPoint } from "@/lib/types";
import { FLAG_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { formatValue } from "./helpers";
import { convertToCanonical } from "@/lib/unit-conversions";
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
  value: number | null;
  flag: string;
  label: string;
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload || payload.value === null) return null;
  const color = FLAG_COLORS[payload.flag] ?? "#6b7280";
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />;
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-900">{p.label}</p>
      <p className="text-gray-500">{p.date}</p>
    </div>
  );
}

function buildRangeZones(
  referenceRange: { goalDirection: string; rangeLow: number | null; rangeHigh: number | null },
  yMin: number,
  yMax: number,
) {
  const zones: React.ReactNode[] = [];
  const green = "#16a34a";
  const red = "#dc2626";
  const greenOpacity = 0.06;
  const redOpacity = 0.05;
  const lineColor = "#9ca3af";

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

export function HistoryChart({
  data,
}: {
  data: BiomarkerDetailData;
}) {
  const numericPoints = data.history.filter((h) => h.value !== null);

  if (numericPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm text-gray-400">
          No numeric values to chart
        </p>
      </div>
    );
  }

  // Normalize values to canonical unit
  const convertedPoints = numericPoints.map((h) => {
    const c = convertToCanonical(data.slug, h.value!, h.unit);
    return { point: h, value: c.value, unit: c.unit };
  });

  const canonicalUnit =
    convertedPoints.find((c) => c.unit)?.unit || data.defaultUnit || "";

  const chartData: ChartPoint[] = convertedPoints.map(({ point, value }) => ({
    date: formatDate(point.collectionDate),
    value,
    flag: point.flag,
    label: `${point.valueModifier ?? ""}${parseFloat(value.toFixed(2))} ${canonicalUnit}`.trim(),
  }));

  const values = convertedPoints.map((c) => c.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = max === min ? Math.max(max * 0.1, 1) : (max - min) * 0.15;

  let yMin = min - padding;
  let yMax = max + padding;

  // Extend Y-axis to include reference range if present
  if (data.referenceRange) {
    if (data.referenceRange.rangeLow !== null) {
      yMin = Math.min(yMin, data.referenceRange.rangeLow - padding);
    }
    if (data.referenceRange.rangeHigh !== null) {
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

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        {data.referenceRange && buildRangeZones(data.referenceRange, yMin, yMax)}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#6b7280"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 7, stroke: "#6b7280", strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
