"use client";

import Link from "next/link";
import { BiomarkerDetailData, BiomarkerHistoryPoint } from "@/lib/types";
import { FlagBadge } from "./FlagBadge";
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatValue(point: BiomarkerHistoryPoint): string {
  if (point.valueText) return point.valueText;
  if (point.value !== null) {
    const prefix = point.valueModifier ?? "";
    return `${prefix}${point.value}`;
  }
  return "\u2014";
}

const FLAG_COLORS: Record<string, string> = {
  NORMAL: "#16a34a",
  LOW: "#2563eb",
  HIGH: "#dc2626",
  ABNORMAL: "#ca8a04",
  CRITICAL_LOW: "#1e40af",
  CRITICAL_HIGH: "#991b1b",
};

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

function HistoryChart({
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

function HistoryTable({ history }: { history: BiomarkerHistoryPoint[] }) {
  // Show newest first in the table
  const sorted = [...history].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase border-b">
            <th className="text-left py-2 pr-4 font-medium">Date</th>
            <th className="text-right py-2 pr-4 font-medium">Value</th>
            <th className="text-right py-2 pr-4 font-medium">Unit</th>
            <th className="text-left py-2 pr-4 font-medium">Flag</th>
            <th className="text-left py-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h, i) => (
            <tr key={i} className="border-b border-gray-50 text-gray-700">
              <td className="py-2 pr-4">
                {formatDate(h.collectionDate)}
              </td>
              <td className="text-right py-2 pr-4 tabular-nums">
                {formatValue(h)}
              </td>
              <td className="text-right py-2 pr-4 text-gray-500">
                {h.unit || "\u2014"}
              </td>
              <td className="py-2 pr-4">
                <FlagBadge flag={h.flag} />
              </td>
              <td className="py-2 truncate max-w-[250px]">
                <span>{h.filename}</span>
                {h.labName && (
                  <span className="text-gray-400 ml-1">
                    ({h.labName})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReferenceRangeSection({ data }: { data: BiomarkerDetailData }) {
  // Collect unique lab-reported ranges from history
  const labRanges = data.history
    .filter((h) => h.referenceRangeLow !== null || h.referenceRangeHigh !== null)
    .map((h) => ({
      low: h.referenceRangeLow,
      high: h.referenceRangeHigh,
      filename: h.filename,
      labName: h.labName,
    }));

  // Deduplicate by low/high
  const uniqueLabRanges = labRanges.filter(
    (r, i, arr) =>
      arr.findIndex((o) => o.low === r.low && o.high === r.high) === i
  );

  return (
    <div className="space-y-3">
      {data.referenceRange ? (
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500">Low:</span>{" "}
            <span className="font-medium">
              {data.referenceRange.rangeLow ?? "\u2014"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">High:</span>{" "}
            <span className="font-medium">
              {data.referenceRange.rangeHigh ?? "\u2014"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Goal:</span>{" "}
            <span className="font-medium capitalize">
              {data.referenceRange.goalDirection}
            </span>
          </div>
          {data.referenceRange.unit && (
            <div>
              <span className="text-gray-500">Unit:</span>{" "}
              <span className="font-medium">{data.referenceRange.unit}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400">
            No custom reference range set
          </p>
          <button
            disabled
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-300 cursor-not-allowed"
          >
            Edit
          </button>
        </div>
      )}

      {uniqueLabRanges.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 uppercase mb-1.5">
            Lab-reported ranges
          </h4>
          <div className="space-y-1">
            {uniqueLabRanges.map((r, i) => (
              <div key={i} className="text-xs text-gray-500 flex gap-3">
                <span>
                  {r.low ?? "?"} – {r.high ?? "?"}
                </span>
                <span className="text-gray-400">
                  {r.labName || r.filename}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BiomarkerDetailPage({ data }: { data: BiomarkerDetailData }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white px-5 py-4">
        <Link
          href="/?tab=biomarkers"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Biomarkers
        </Link>
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {data.displayName}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              {data.category}
            </span>
            {data.defaultUnit && (
              <span className="text-sm text-gray-400">
                {data.defaultUnit}
              </span>
            )}
          </div>
          {data.fullName !== data.displayName && (
            <p className="text-sm text-gray-500 mt-0.5">{data.fullName}</p>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-8">
        {/* Chart section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            History
          </h2>
          <HistoryChart data={data} />
        </section>

        {/* History table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            All Results ({data.history.length})
          </h2>
          {data.history.length > 0 ? (
            <HistoryTable history={data.history} />
          ) : (
            <p className="text-sm text-gray-400">
              No results found for this biomarker across your reports.
            </p>
          )}
        </section>

        {/* Reference range section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Reference Range
          </h2>
          <ReferenceRangeSection data={data} />
        </section>
      </div>
    </div>
  );
}
