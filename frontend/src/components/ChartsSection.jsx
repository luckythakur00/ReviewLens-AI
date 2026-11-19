import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { ALLOWED_TOPICS } from "../data/mockReviews";

const SENTIMENT_COLORS = { positive: "#10b981", neutral: "#f59e0b", negative: "#f43f5e" };

export default function ChartsSection({ reviews, onTopicClick }) {
  const sentimentData = ["positive", "neutral", "negative"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: reviews.filter((r) => r.sentiment === s).length,
  }));

  const topicsData = ALLOWED_TOPICS.map((topic) => ({
    name: topic.replace("_", " "),
    rawTopic: topic,
    count: reviews.filter((r) => r.topics.includes(topic)).length,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-1">Sentiment Breakdown</p>
        <p className="text-xs text-slate-400 mb-2">Distribution across all analysed reviews</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
            <Pie
              data={sentimentData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => percent > 0 ? `${Math.round(percent * 100)}%` : ""}
              labelLine={false}
            >
              {sentimentData.map((entry) => (
                <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name.toLowerCase()]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v} reviews`, n]} />
            <Legend iconType="circle" iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-1">Top Extracted Topics</p>
        <p className="text-xs text-slate-400 mb-2">Click a bar to filter reviews below</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={topicsData}
            layout="vertical"
            margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip formatter={(v) => [`${v} mentions`, "Count"]} />
            <Bar
              dataKey="count"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(data) => onTopicClick(data.rawTopic)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
