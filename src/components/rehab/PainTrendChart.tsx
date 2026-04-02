"use client";

import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import type { PainTrendData } from "@/lib/rehab/actions";

const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  data: PainTrendData[];
  height?: number;
  /** 7일: 요일 라벨, 14일: MM/DD */
  xAxisMode?: "weekday" | "md";
}

export default function PainTrendChart({
  data,
  height = 200,
  xAxisMode = "weekday",
}: Props) {
  const chartData = data.map((d) => {
    const label =
      xAxisMode === "md"
        ? `${d.date.slice(5, 7)}/${d.date.slice(8, 10)}`
        : dayNames[new Date(`${d.date}T12:00:00`).getDay()];
    return {
      label,
      avgPain: d.avgPain,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{
            fontSize: xAxisMode === "md" ? 9 : 10,
            fill: "#94a3b8",
          }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <ReferenceLine
          y={5}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <Area
          type="monotone"
          dataKey="avgPain"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#painFill)"
          dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#ef4444" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
