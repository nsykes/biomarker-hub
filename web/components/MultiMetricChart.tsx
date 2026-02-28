"use client";

import { BiomarkerDetailData } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { convertToCanonical } from "@/lib/unit-conversions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface MultiMetricTooltipProps {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ payload: Record<string, unknown> }>;
  dataList: BiomarkerDetailData[];
  unitMap: Map<string, string>;
}

function MultiMetricTooltip({
  active,
  payload,
  dataList,
  unitMap,
}: MultiMetricTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const ts = row.timestamp as number;
  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-xl shadow-lg px-3 py-2 text-sm space-y-1">
      <p className="text-[var(--color-text-secondary)] text-xs">
        {formatDate(new Date(ts).toISOString().split("T")[0])}
      </p>
      {dataList.map((d, i) => {
        const val = row[d.slug] as number | null | undefined;
        if (val == null) return null;
        return (
          <p key={d.slug} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <span className="font-medium">{d.displayName}:</span>
            <span>
              {parseFloat(val.toFixed(2))} {unitMap.get(d.slug) ?? ""}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function MultiMetricChart({
  dataList,
}: {
  dataList: BiomarkerDetailData[];
}) {
  if (dataList.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[var(--color-surface-tertiary)] rounded-xl border border-dashed border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No data to chart
        </p>
      </div>
    );
  }

  // Merge all history arrays into one dataset keyed by timestamp
  const allTimestamps = new Set<number>();
  const seriesMap = new Map<string, Map<number, number>>();
  const unitMap = new Map<string, string>();

  for (const bd of dataList) {
    const points = bd.history
      .filter((h) => h.value !== null && h.collectionDate !== null)
      .map((h) => {
        const c = convertToCanonical(bd.slug, h.value!, h.unit);
        return {
          ts: new Date(h.collectionDate + "T00:00:00").getTime(),
          val: c.value,
          unit: c.unit,
        };
      });

    const m = new Map<number, number>();
    for (const p of points) {
      allTimestamps.add(p.ts);
      m.set(p.ts, p.val);
      if (p.unit && !unitMap.has(bd.slug)) unitMap.set(bd.slug, p.unit);
    }
    seriesMap.set(bd.slug, m);

    if (!unitMap.has(bd.slug) && bd.defaultUnit) {
      unitMap.set(bd.slug, bd.defaultUnit);
    }
  }

  if (allTimestamps.size === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[var(--color-surface-tertiary)] rounded-xl border border-dashed border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No numeric values to chart
        </p>
      </div>
    );
  }

  const timestamps = Array.from(allTimestamps).sort((a, b) => a - b);
  const chartData = timestamps.map((ts) => {
    const row: Record<string, unknown> = { timestamp: ts };
    for (const [slug, m] of seriesMap) {
      row[slug] = m.get(ts) ?? null;
    }
    return row;
  });

  // Determine if we need dual Y-axes
  const units = [...new Set(dataList.map((d) => unitMap.get(d.slug) ?? d.defaultUnit ?? ""))];
  const useDualAxis = units.length >= 2;

  // Assign each biomarker to a Y-axis
  const slugToAxisId = new Map<string, string>();
  if (useDualAxis) {
    for (const d of dataList) {
      const unit = unitMap.get(d.slug) ?? d.defaultUnit ?? "";
      slugToAxisId.set(d.slug, unit === units[0] ? "left" : "right");
    }
  }

  // Compute Y-axis domains
  function computeDomain(slugs: string[]) {
    const vals: number[] = [];
    for (const slug of slugs) {
      const m = seriesMap.get(slug);
      if (m) for (const v of m.values()) vals.push(v);
    }
    if (vals.length === 0) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = max === min ? Math.max(max * 0.1, 1) : (max - min) * 0.15;
    return [min - padding, max + padding];
  }

  let leftDomain: [number, number];
  let rightDomain: [number, number] | undefined;

  if (useDualAxis) {
    const leftSlugs = dataList.filter((d) => slugToAxisId.get(d.slug) === "left").map((d) => d.slug);
    const rightSlugs = dataList.filter((d) => slugToAxisId.get(d.slug) === "right").map((d) => d.slug);
    leftDomain = computeDomain(leftSlugs) as [number, number];
    rightDomain = computeDomain(rightSlugs) as [number, number];
  } else {
    leftDomain = computeDomain(dataList.map((d) => d.slug)) as [number, number];
  }

  const tickStep = (leftDomain[1] - leftDomain[0]) / 5;
  const yDecimals = tickStep >= 50 ? 0 : tickStep >= 0.5 ? 1 : tickStep >= 0.05 ? 2 : 3;

  const DAY_MS = 86_400_000;
  const tsMin = Math.min(...timestamps);
  const tsMax = Math.max(...timestamps);
  const xDomain: [number, number] =
    tsMin === tsMax
      ? [tsMin - 30 * DAY_MS, tsMax + 30 * DAY_MS]
      : [tsMin, tsMax];

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: useDualAxis ? 20 : 20, bottom: 10, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={xDomain}
            tickFormatter={formatTimestamp}
            tick={{ fontSize: 12, fill: "#AEAEB2" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E5EA" }}
          />
          <YAxis
            yAxisId="left"
            domain={leftDomain}
            tick={{ fontSize: 12, fill: "#AEAEB2" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E5EA" }}
            tickFormatter={(v: number) => v.toFixed(yDecimals)}
            width={60}
          />
          {useDualAxis && rightDomain && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              tick={{ fontSize: 12, fill: "#AEAEB2" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E5EA" }}
              tickFormatter={(v: number) => {
                const step = (rightDomain[1] - rightDomain[0]) / 5;
                const dec = step >= 50 ? 0 : step >= 0.5 ? 1 : step >= 0.05 ? 2 : 3;
                return v.toFixed(dec);
              }}
              width={60}
            />
          )}
          <Tooltip
            content={
              <MultiMetricTooltip dataList={dataList} unitMap={unitMap} />
            }
          />
          {dataList.map((d, i) => (
            <Line
              key={d.slug}
              type="monotone"
              dataKey={d.slug}
              yAxisId={useDualAxis ? (slugToAxisId.get(d.slug) ?? "left") : "left"}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length], stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 2, fill: "#fff" }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-3 pb-2">
        {dataList.map((d, i) => (
          <div key={d.slug} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-0.5 rounded-full inline-block"
              style={{
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <span className="text-[var(--color-text-secondary)]">
              {d.displayName}
              {unitMap.get(d.slug) ? ` (${unitMap.get(d.slug)})` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
