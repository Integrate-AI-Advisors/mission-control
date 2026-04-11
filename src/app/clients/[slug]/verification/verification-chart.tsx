"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { VerificationHistoryPoint } from "@/lib/queries/verification";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: VerificationHistoryPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md">
      <p className="font-mono text-xs text-muted-foreground">{d.date}</p>
      <p className="font-mono text-sm text-foreground">
        {(d.avgScore * 100).toFixed(1)}%
      </p>
      <p className="text-xs text-muted-foreground">
        {d.sessionCount} session{d.sessionCount !== 1 ? "s" : ""}
        {d.claimsFailed > 0 && (
          <span className="text-brand-red">
            {" "}
            &middot; {d.claimsFailed} failed
          </span>
        )}
      </p>
    </div>
  );
}

export function VerificationChart({
  data,
}: {
  data: VerificationHistoryPoint[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    scorePct: d.avgScore * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(d: string) =>
            new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          }
          stroke="hsl(var(--border))"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: number) => `${v}%`}
          stroke="hsl(var(--border))"
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={98}
          stroke="var(--green)"
          strokeDasharray="6 3"
          label={{
            value: "98% gate",
            position: "right",
            fontSize: 10,
            fill: "var(--green)",
          }}
        />
        <Line
          type="monotone"
          dataKey="scorePct"
          stroke="var(--terra)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--terra)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
