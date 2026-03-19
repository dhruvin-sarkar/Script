"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from "recharts";

interface StackTimelineProps {
  data: Array<{
    date: string;
    devlogs: number;
    articles: number;
    questions: number;
  }>;
}

export function StackTimeline({ data }: StackTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border rounded-xl bg-card/50 italic text-muted-foreground">
        No activity data available yet.
      </div>
    );
  }

  // Use CSS variables for colors to match theme
  const colors = {
    devlogs: "#7c6af7", // --accent
    articles: "#38bdf8", // --info
    questions: "#f59e0b", // --warning
    background: "#18181b", // --bg-surface
    border: "#2e2e35", // --border
  };

  return (
    <div className="h-[300px] w-full p-4 bg-card border rounded-xl shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Activity Timeline</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
            dy={10}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: "rgba(124, 106, 247, 0.05)" }}
            contentStyle={{ 
              backgroundColor: "#1f1f24", 
              borderColor: "#3f3f47",
              borderRadius: "8px",
              color: "#f4f4f5"
            }}
            itemStyle={{ fontSize: "12px", padding: "2px 0" }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: "20px", fontSize: "12px" }}
          />
          <Bar 
            dataKey="devlogs" 
            stackId="a" 
            fill={colors.devlogs} 
            radius={[0, 0, 0, 0]} 
            name="Devlogs"
          />
          <Bar 
            dataKey="articles" 
            stackId="a" 
            fill={colors.articles} 
            radius={[0, 0, 0, 0]} 
            name="Articles"
          />
          <Bar 
            dataKey="questions" 
            stackId="a" 
            fill={colors.questions} 
            radius={[4, 4, 0, 0]} 
            name="Questions"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
