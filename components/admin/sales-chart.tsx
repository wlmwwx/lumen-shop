"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type SalesPoint = { date: string; amount: number };

export function SalesChart({ data }: { data: SalesPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#8a8a86" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8a8a86" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value) => [`¥${Number(value ?? 0).toLocaleString()}`, "销售额"]}
            labelStyle={{ fontSize: 12, color: "#1a1a1a" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #eee",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#1a1a1a"
            strokeWidth={2}
            fill="url(#sales)"
            dot={false}
            activeDot={{ r: 4, fill: "#1a1a1a" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
