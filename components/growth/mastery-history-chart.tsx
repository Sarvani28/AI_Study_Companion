"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryItem = {
  conceptName: string;
  newMastery: number;
  createdAt: string;
};

type Props = {
  history: HistoryItem[];
};

export function MasteryHistoryChart({
  history,
}: Props) {
  const data =
    history.map(
      (
        item,
        index
      ) => ({
        index:
          index + 1,

        mastery:
          Math.round(
            item.newMastery
          ),

        concept:
          item.conceptName,

        date:
          new Date(
            item.createdAt
          ).toLocaleDateString(),
      })
    );

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed">
        <p className="text-sm text-muted-foreground">
          Complete assessments to build
          your mastery history.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 20,
            left: 0,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="index"
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            domain={[
              0,
              100,
            ]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              `${value}%`
            }
          />

          <Tooltip
            formatter={(
              value
            ) => [
              `${value}%`,
              "Mastery",
            ]}
            labelFormatter={(
              value
            ) => {
              const item =
                data[
                  Number(value) -
                    1
                ];

              if (!item) {
                return "";
              }

              return `${item.concept} · ${item.date}`;
            }}
          />

          <Line
            type="monotone"
            dataKey="mastery"
            stroke="currentColor"
            strokeWidth={2}
            dot={{
              r: 4,
            }}
            activeDot={{
              r: 6,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}