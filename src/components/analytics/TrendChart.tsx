"use client";

import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCount } from "@/lib/utils";

interface Point {
  date: string;
  value: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <p className="text-muted-2 mb-0.5">
        {new Date(label ?? "").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </p>
      <p className="text-white font-semibold">{formatCount(payload[0].value)}</p>
    </div>
  );
}

export function TrendAreaChart({ data, color, title }: { data: Point[]; color: string; title: string }) {
  const gradientId = `grad-${title.replace(/\s/g, "")}`;
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-white text-sm font-semibold mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            tick={{ fill: "#6b6b78", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis tick={{ fill: "#6b6b78", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCount(v)} width={36} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLineChart({ data, color, title }: { data: Point[]; color: string; title: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-white text-sm font-semibold mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            tick={{ fill: "#6b6b78", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis tick={{ fill: "#6b6b78", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCount(v)} width={36} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionChart({ data, color }: { data: { point: string; pct: number }[]; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-white text-sm font-semibold mb-3">Audience retention</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-retention" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="point" tick={{ fill: "#6b6b78", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b6b78", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="glass-strong rounded-lg px-3 py-2 text-xs">
                  <p className="text-muted-2 mb-0.5">{label} watched</p>
                  <p className="text-white font-semibold">{payload[0].value}% still watching</p>
                </div>
              ) : null
            }
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <Area type="monotone" dataKey="pct" stroke={color} strokeWidth={2} fill="url(#grad-retention)" activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
