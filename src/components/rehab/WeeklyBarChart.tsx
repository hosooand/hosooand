"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { WeeklyChartData } from "@/lib/rehab/actions";

interface Props {
  data: WeeklyChartData[];
  height?: number;
}

export default function WeeklyBarChart({ data, height = 160 }: Props) {
  const maxCount = Math.max(...data.map((d) => d.totalCount), 1);

  const chartData = data.map((d) => ({
    day: d.day,
    /** 막대 높이 (0일은 최소 막대만) */
    barHeight: d.totalCount > 0 ? d.totalCount : maxCount * 0.05,
    /** 실제 운동 횟수 — 라벨용 */
    count: d.totalCount,
    hasData: d.totalCount > 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        barCategoryGap="20%"
        margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="day"
          tick={{
            fontSize: data.length > 10 ? 9 : 11,
            fill: "#94a3b8",
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Bar dataKey="barHeight" radius={[6, 6, 0, 0]}>
          <LabelList
            dataKey="count"
            position="top"
            style={{ fontSize: 11, fontWeight: 700, fill: "#0EA5E9" }}
            formatter={(value) => {
              const n = Number(value);
              return n > 0 && Number.isFinite(n) ? String(n) : "";
            }}
          />
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.hasData ? "#38bdf8" : "#e0f2fe"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
