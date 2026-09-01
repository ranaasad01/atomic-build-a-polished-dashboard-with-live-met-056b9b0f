"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { TrendingUp, TrendingDown, Filter, Calendar, Download, RefreshCw, ArrowUpDown, ChevronDown, Activity, Users, DollarSign, MousePointer } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricRow {
  id: string;
  name: string;
  value: number;
  unit: string | null;
  category: string | null;
  recorded_at: string;
}

interface TimeSeriesRow {
  id: string;
  series_name: string;
  value: number;
  granularity: string | null;
  recorded_at: string;
}

interface ChannelRow {
  channel: string;
  sessions: number;
  revenue: number;
  conversion: number;
  bounceRate: number;
}

type SortKey = keyof ChannelRow;
type SortDir = "asc" | "desc";

// ─── Mock / seed data (non-Supabase) ─────────────────────────────────────────

const DATE_RANGES = ["Last 7 days", "Last 30 days", "Last 90 days", "Custom"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const CATEGORIES = ["All", "Revenue", "Engagement", "Acquisition", "Retention"] as const;
type Category = (typeof CATEGORIES)[number];

const SEED_AREA: { time: string; sessions: number; lower: number; upper: number }[] = [
  { time: "00:00", sessions: 1200, lower: 1050, upper: 1380 },
  { time: "02:00", sessions: 890,  lower: 760,  upper: 1020 },
  { time: "04:00", sessions: 640,  lower: 520,  upper: 760  },
  { time: "06:00", sessions: 980,  lower: 840,  upper: 1120 },
  { time: "08:00", sessions: 2340, lower: 2100, upper: 2580 },
  { time: "10:00", sessions: 3120, lower: 2880, upper: 3360 },
  { time: "12:00", sessions: 3780, lower: 3520, upper: 4040 },
  { time: "14:00", sessions: 4100, lower: 3840, upper: 4360 },
  { time: "16:00", sessions: 3650, lower: 3400, upper: 3900 },
  { time: "18:00", sessions: 2980, lower: 2740, upper: 3220 },
  { time: "20:00", sessions: 2210, lower: 1980, upper: 2440 },
  { time: "22:00", sessions: 1560, lower: 1380, upper: 1740 },
];

const SEED_REGION: { region: string; revenue: number; prevRevenue: number }[] = [
  { region: "North America", revenue: 142000, prevRevenue: 128000 },
  { region: "Europe",        revenue: 98000,  prevRevenue: 104000 },
  { region: "Asia Pacific",  revenue: 76000,  prevRevenue: 61000  },
  { region: "Latin America", revenue: 34000,  prevRevenue: 29000  },
  { region: "Middle East",   revenue: 21000,  prevRevenue: 18000  },
  { region: "Africa",        revenue: 12000,  prevRevenue: 9000   },
];

const SEED_PERIOD: { label: string; current: number; previous: number }[] = [
  { label: "Mon", current: 4200, previous: 3800 },
  { label: "Tue", current: 5100, previous: 4600 },
  { label: "Wed", current: 4800, previous: 5200 },
  { label: "Thu", current: 6200, previous: 5400 },
  { label: "Fri", current: 7100, previous: 6300 },
  { label: "Sat", current: 5400, previous: 4900 },
  { label: "Sun", current: 3900, previous: 3600 },
];

const SEED_CHANNELS: ChannelRow[] = [
  { channel: "Organic Search", sessions: 48200, revenue: 92400,  conversion: 3.8, bounceRate: 38.2 },
  { channel: "Paid Search",    sessions: 31500, revenue: 74100,  conversion: 5.1, bounceRate: 42.7 },
  { channel: "Direct",         sessions: 22800, revenue: 58300,  conversion: 4.4, bounceRate: 31.5 },
  { channel: "Social Media",   sessions: 19400, revenue: 31200,  conversion: 2.9, bounceRate: 54.1 },
  { channel: "Email",          sessions: 14700, revenue: 44800,  conversion: 6.2, bounceRate: 28.9 },
  { channel: "Referral",       sessions: 9200,  revenue: 22600,  conversion: 4.1, bounceRate: 45.3 },
  { channel: "Display Ads",    sessions: 7800,  revenue: 14300,  conversion: 1.8, bounceRate: 61.2 },
  { channel: "Affiliate",      sessions: 5100,  revenue: 18900,  conversion: 5.7, bounceRate: 33.8 },
];

function jitter(val: number, pct = 0.04): number {
  return Math.round(val * (1 + (Math.random() - 0.5) * pct));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterBar({
  dateRange,
  setDateRange,
  category,
  setCategory,
  isRefreshing,
  onRefresh,
}: {
  dateRange: DateRange;
  setDateRange: (v: DateRange) => void;
  category: Category;
  setCategory: (v: Category) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date range picker */}
      <div className="relative">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="appearance-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-8 py-2 text-sm font-medium text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 cursor-pointer transition-colors hover:border-[var(--accent)]/50"
        >
          {DATE_RANGES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
      </div>

      {/* Category dropdown */}
      <div className="relative">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="appearance-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-8 py-2 text-sm font-medium text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 cursor-pointer transition-colors hover:border-[var(--accent)]/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Filter className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}

function MetricSummaryCard({
  icon: Icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">{value}</div>
      <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
        {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        {change} vs last period
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

function AreaChartSection({ data }: { data: typeof SEED_AREA }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Sessions Over Time</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Hourly breakdown with confidence band</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.08} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#bandGrad)" name="Upper bound" />
          <Area type="monotone" dataKey="lower" stroke="transparent" fill="url(#bandGrad)" name="Lower bound" />
          <Area type="monotone" dataKey="sessions" stroke="var(--accent)" strokeWidth={2} fill="url(#sessGrad)" name="Sessions" dot={false} activeDot={{ r: 4, fill: "var(--accent)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RegionBarChart({ data }: { data: typeof SEED_REGION }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Revenue by Region</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Current vs previous period</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={90} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, ""]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="revenue" name="Current" fill="var(--accent)" radius={[0, 4, 4, 0]} />
          <Bar dataKey="prevRevenue" name="Previous" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PeriodLineChart({ data }: { data: typeof SEED_PERIOD }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Period Comparison</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Current week vs previous week</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="current" name="Current" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="previous" name="Previous" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataTable({
  rows,
}: {
  rows: ChannelRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.channel.toLowerCase().includes(filter.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sortKey, sortDir, filter]);

  const cols: { key: SortKey; label: string; fmt: (r: ChannelRow) => string }[] = [
    { key: "channel",    label: "Channel",       fmt: (r) => r.channel },
    { key: "sessions",   label: "Sessions",      fmt: (r) => r.sessions.toLocaleString("en-US") },
    { key: "revenue",    label: "Revenue",       fmt: (r) => `$${r.revenue.toLocaleString("en-US")}` },
    { key: "conversion", label: "Conversion %",  fmt: (r) => `${r.conversion.toFixed(1)}%` },
    { key: "bounceRate", label: "Bounce Rate",   fmt: (r) => `${r.bounceRate.toFixed(1)}%` },
  ];

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[hsl(var(--border))]">
        <div>
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Channel Breakdown</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Per-channel performance metrics</p>
        </div>
        <input
          type="text"
          placeholder="Filter channels..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 w-48"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] cursor-pointer select-none hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? "text-[var(--accent)]" : "opacity-40"}`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.channel}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))]/30 transition-colors"
              >
                {cols.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-3.5 ${col.key === "channel" ? "font-medium text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"} ${
                      col.key === "conversion"
                        ? "text-emerald-500 font-semibold"
                        : col.key === "bounceRate"
                        ? "text-rose-500 font-semibold"
                        : ""
                    }`}
                  >
                    {col.fmt(row)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const summaryCardVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("Last 30 days");
  const [category, setCategory] = useState<Category>("All");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Supabase live data
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRow[]>([]);

  // Mock data with live jitter
  const [areaData, setAreaData] = useState(SEED_AREA);
  const [regionData] = useState(SEED_REGION);
  const [periodData, setPeriodData] = useState(SEED_PERIOD);
  const [channelData, setChannelData] = useState(SEED_CHANNELS);

  // Fetch from Supabase
  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      const [{ data: m }, { data: ts }] = await Promise.all([
        supabase.from("metrics").select("*").order("recorded_at", { ascending: false }).limit(50),
        supabase.from("time_series_data").select("*").order("recorded_at", { ascending: false }).limit(100),
      ]);
      if (m) setMetrics(m as MetricRow[]);
      if (ts) setTimeSeries(ts as TimeSeriesRow[]);
    }

    loadData();

    // Realtime subscriptions
    const metricsSub = supabase
      .channel("analytics-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "metrics" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMetrics((prev) => [payload.new as MetricRow, ...prev].slice(0, 50));
        }
      })
      .subscribe();

    const tsSub = supabase
      .channel("analytics-timeseries")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_series_data" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTimeSeries((prev) => [payload.new as TimeSeriesRow, ...prev].slice(0, 100));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(metricsSub);
      supabase.removeChannel(tsSub);
    };
  }, []);

  // Live jitter every 3 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setAreaData((prev) =>
        prev.map((d) => ({
          ...d,
          sessions: jitter(d.sessions),
          lower: jitter(d.lower),
          upper: jitter(d.upper),
        }))
      );
      setPeriodData((prev) =>
        prev.map((d) => ({
          ...d,
          current: jitter(d.current),
          previous: jitter(d.previous),
        }))
      );
      setChannelData((prev) =>
        prev.map((d) => ({
          ...d,
          sessions: jitter(d.sessions),
          revenue: jitter(d.revenue),
          conversion: Math.round(jitter(d.conversion * 100) / 100 * 10) / 10,
          bounceRate: Math.round(jitter(d.bounceRate * 100) / 100 * 10) / 10,
        }))
      );
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  }, []);

  // Derive summary metrics from Supabase data or fall back to mock aggregates
  const summaryMetrics = useMemo(() => {
    const totalSessions = channelData.reduce((s, r) => s + r.sessions, 0);
    const totalRevenue = channelData.reduce((s, r) => s + r.revenue, 0);
    const avgConversion = channelData.reduce((s, r) => s + r.conversion, 0) / channelData.length;
    const avgBounce = channelData.reduce((s, r) => s + r.bounceRate, 0) / channelData.length;

    // Overlay real Supabase metric values if available
    const revenueMetric = metrics.find((m) => m.name.toLowerCase().includes("revenue"));
    const usersMetric = metrics.find((m) => m.name.toLowerCase().includes("user") || m.name.toLowerCase().includes("session"));

    return [
      {
        icon: Activity,
        label: "Total Sessions",
        value: usersMetric ? usersMetric.value.toLocaleString("en-US") : totalSessions.toLocaleString("en-US"),
        change: "+12.4%",
        trend: "up" as const,
      },
      {
        icon: DollarSign,
        label: "Total Revenue",
        value: revenueMetric ? `$${revenueMetric.value.toLocaleString("en-US")}` : `$${totalRevenue.toLocaleString("en-US")}`,
        change: "+8.7%",
        trend: "up" as const,
      },
      {
        icon: MousePointer,
        label: "Avg Conversion",
        value: `${avgConversion.toFixed(1)}%`,
        change: "+0.3%",
        trend: "up" as const,
      },
      {
        icon: Users,
        label: "Avg Bounce Rate",
        value: `${avgBounce.toFixed(1)}%`,
        change: "-2.1%",
        trend: "down" as const,
      },
    ];
  }, [channelData, metrics]);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-10 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <Reveal>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Analytics
              </h1>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Deep-dive into traffic, revenue, and conversion across every channel.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Updating every 3s
            </span>
          </div>
        </Reveal>

        {/* Filter bar */}
        <Reveal delay={0.05}>
          <FilterBar
            dateRange={dateRange}
            setDateRange={setDateRange}
            category={category}
            setCategory={setCategory}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        </Reveal>

        {/* Summary metrics row */}
        <motion.div
          variants={summaryCardVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {summaryMetrics.map((m) => (
            <motion.div key={m.label} variants={cardVariant}>
              <MetricSummaryCard {...m} />
            </motion.div>
          ))}
        </motion.div>

        {/* Full-width area chart */}
        <Reveal delay={0.1}>
          <AreaChartSection data={areaData} />
        </Reveal>

        {/* Side-by-side comparison charts */}
        <Reveal delay={0.12}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RegionBarChart data={regionData} />
            <PeriodLineChart data={periodData} />
          </div>
        </Reveal>

        {/* Data table */}
        <Reveal delay={0.14}>
          <DataTable rows={channelData} />
        </Reveal>

        {/* Footer note */}
        <Reveal delay={0.16}>
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] pb-4">
            Data refreshes automatically. Supabase realtime active for metrics and time series tables.
          </p>
        </Reveal>
      </div>
    </main>
  );
}