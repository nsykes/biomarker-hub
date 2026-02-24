"use client";

import { BiomarkerDetailData, BiomarkerHistoryPoint } from "@/lib/types";
import { FLAG_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { formatValue } from "./helpers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
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

  const chartData: ChartPoint[] = numericPoints.map((h) => ({
    date: formatDate(h.collectionDate),
    value: h.value,
    flag: h.flag,
    label: `${formatValue(h)} ${h.unit || data.defaultUnit || ""}`.trim(),
  }));

  const values = numericPoints.map((h) => h.value!);
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
        {data.referenceRange &&
          data.referenceRange.rangeLow !== null &&
          data.referenceRange.rangeHigh !== null && (
            <ReferenceArea
              y1={data.referenceRange.rangeLow}
              y2={data.referenceRange.rangeHigh}
              fill="#16a34a"
              fillOpacity={0.08}
              stroke="#16a34a"
              strokeOpacity={0.2}
              strokeDasharray="3 3"
            />
          )}
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
