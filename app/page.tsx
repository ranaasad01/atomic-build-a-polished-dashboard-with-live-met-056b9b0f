"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Users, DollarSign, Bell, ArrowUpRight, ArrowDownRight, Circle, Sparkles, AlertCircle, Check, Info } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type MetricRow = Database["public"]["Tables"]["metrics"]["Row"];
type TimeSeriesRow = Database["public"]["Tables"]["time_series_data"]["Row"];
type ComparisonRow = Database["public"]["Tables"]["comparison_data"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// ─── helpers ────────────────────────────────────────────────────────────────

function formatValue(value: number, unit?: string | null): string {
  if (unit === "$" || unit === "USD") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function severityIcon(severity: string | null) {
  if (severity === "error") return <AlertCircle className="h-4 w-4 text-red-400" />;
  if (severity === "warning") return <Info className="h-4 w-4 text-yellow-400" />;
  return <Check className="h-4 w-4 text-emerald-400" />;
}

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

interface KPICardProps {
  metric: MetricRow;
  index: number;
}

const METRIC_ICONS: Record<string, React.ReactNode> = {
  revenue: <DollarSign className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  conversions: <Activity className="h-5 w-5" />,
  default: <Sparkles className="h-5 w-5" />,
};

function KPICard({ metric, index }: KPICardProps) {
  const [prev, setPrev] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prev !== null && prev !== metric.value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(t);
    }
    setPrev(metric.value);
  }, [metric.value, prev]);

  const iconKey = Object.keys(METRIC_ICONS).find((k) =>
    metric.name?.toLowerCase().includes(k)
  ) ?? "default";
  const icon = METRIC_ICONS[iconKey];

  return (
    <Reveal delay={index * 0.07}>
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 ${
          flash ? "ring-2 ring-[var(--brand-accent)]/60" : ""
        }`}
      >
        {/* top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]">
              {icon}
            </span>
            <span className="text-sm font-medium text-white/60 capitalize">
              {metric.name}
            </span>
          </div>
          <LiveDot />
        </div>

        {/* value */}
        <div className="mt-4">
          <motion.span
            key={metric.value}
            initial={{ opacity: 0.4, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-3xl font-bold tracking-tight text-white"
          >
            {formatValue(metric.value, metric.unit)}
          </motion.span>
        </div>

        {/* category badge */}
        {metric.category && (
          <div className="mt-3">
            <span className="inline-block rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/50">
              {metric.category}
            </span>
          </div>
        )}

        {/* subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand-accent)]/5 to-transparent" />
      </motion.div>
    </Reveal>
  );
}

// ─── chart helpers ───────────────────────────────────────────────────────────

function buildTimeSeriesChartData(rows: TimeSeriesRow[]) {
  const byTime: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const label = new Date(row.recorded_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!byTime[label]) byTime[label] = {};
    byTime[label][row.series_name] = row.value;
  }
  return Object.entries(byTime)
    .slice(-20)
    .map(([time, vals]) => ({ time, ...vals }));
}

function buildComparisonChartData(rows: ComparisonRow[]) {
  const byLabel: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byLabel[row.label]) byLabel[row.label] = {};
    byLabel[row.label][row.category] = row.value;
  }
  return Object.entries(byLabel).map(([label, vals]) => ({ label, ...vals }));
}

const CHART_COLORS = [
  "var(--brand-accent)",
  "#818cf8",
  "#34d399",
  "#fb923c",
];

// ─── main page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const supabase = createClient();

  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRow[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // initial fetch
  useEffect(() => {
    async function load() {
      const [m, ts, comp, notif] = await Promise.all([
        supabase.from("metrics").select("*").order("recorded_at", { ascending: false }).limit(8),
        supabase.from("time_series_data").select("*").order("recorded_at", { ascending: true }).limit(200),
        supabase.from("comparison_data").select("*").order("recorded_at", { ascending: false }).limit(100),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (m.data) setMetrics(m.data);
      if (ts.data) setTimeSeries(ts.data);
      if (comp.data) setComparison(comp.data);
      if (notif.data) setNotifications(notif.data);
      setLoading(false);
    }
    load();
  }, []);

  // realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "metrics" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMetrics((prev) => {
              const exists = prev.find((m) => m.id === (payload.new as MetricRow).id);
              if (exists) return prev.map((m) => m.id === (payload.new as MetricRow).id ? payload.new as MetricRow : m);
              return [payload.new as MetricRow, ...prev].slice(0, 8);
            });
          } else if (payload.eventType === "UPDATE") {
            setMetrics((prev) =>
              prev.map((m) => m.id === (payload.new as MetricRow).id ? payload.new as MetricRow : m)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_series_data" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTimeSeries((prev) => [...prev, payload.new as TimeSeriesRow].slice(-200));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => n.id === (payload.new as NotificationRow).id ? payload.new as NotificationRow : n)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // close notif dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const seriesNames = [...new Set(timeSeries.map((r) => r.series_name))];
  const compCategories = [...new Set(comparison.map((r) => r.category))];
  const timeChartData = buildTimeSeriesChartData(timeSeries);
  const compChartData = buildComparisonChartData(comparison);

  // ─── hero / header bar ───────────────────────────────────────────────────

  const heroVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const heroItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <main className="min-h-screen bg-[var(--brand-dark)] text-white">
      {/* ── Hero bar ─────────────────────────────────────────────────────── */}
      <section id="overview" className="border-b border-white/8 px-6 py-10 md:px-10 lg:px-16">
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <motion.div variants={heroItem} className="flex items-center gap-2 mb-3">
                <LiveDot />
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-accent)]">
                  Live Dashboard
                </span>
              </motion.div>
              <motion.h1
                variants={heroItem}
                className="text-4xl font-bold tracking-tight text-white md:text-5xl"
              >
                Product Pulse
              </motion.h1>
              <motion.p
                variants={heroItem}
                className="mt-2 max-w-md text-base text-white/50 leading-relaxed"
              >
                Real-time metrics, trend analysis, and team activity — all in one place.
              </motion.p>
            </div>

            {/* notification bell */}
            <motion.div variants={heroItem} className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-accent)] text-[10px] font-bold text-black">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-[var(--brand-surface)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  <div className="border-b border-white/8 px-4 py-3">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                  </div>
                  <ul className="max-h-72 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 && (
                      <li className="px-4 py-6 text-center text-sm text-white/40">No notifications yet.</li>
                    )}
                    {notifications.map((n) => (
                      <li key={n.id} className={`flex gap-3 px-4 py-3 ${!n.read ? "bg-white/3" : ""}`}>
                        <span className="mt-0.5 shrink-0">{severityIcon(n.severity)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{n.title}</p>
                          {n.body && <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-xs text-white/30 mt-1">{relativeTime(n.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <section id="kpis" className="px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Key Metrics</h2>
              <span className="rounded-full bg-[var(--brand-accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--brand-accent)]">
                Live
              </span>
            </div>
          </Reveal>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-white/8 bg-white/4"
                />
              ))}
            </div>
          ) : metrics.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/4 p-10 text-center text-white/40">
              No metrics data yet. Data will appear here once recorded.
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {metrics.map((m, i) => (
                <KPICard key={m.id} metric={m} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Time-Series Area Chart ────────────────────────────────────────── */}
      <section id="trends" className="px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Trend Overview</h2>
              <p className="mt-1 text-sm text-white/40">
                Time-series data across all active series, updated in real time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              {loading ? (
                <div className="h-64 animate-pulse rounded-xl bg-white/5" />
              ) : timeChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-white/30">
                  No time-series data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      {seriesNames.map((name, i) => (
                        <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,15,25,0.92)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)", paddingTop: 12 }}
                    />
                    {seriesNames.map((name, i) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        fill={`url(#grad-${i})`}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Comparison Bar Chart + Notifications ─────────────────────────── */}
      <section id="breakdown" className="px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Bar chart — 3 cols */}
            <div className="lg:col-span-3">
              <Reveal>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">Category Breakdown</h2>
                  <p className="mt-1 text-sm text-white/40">
                    Comparative values across labels and categories.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  {loading ? (
                    <div className="h-64 animate-pulse rounded-xl bg-white/5" />
                  ) : compChartData.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-white/30">
                      No comparison data available yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={compChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(15,15,25,0.92)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)", paddingTop: 12 }}
                        />
                        {compCategories.map((cat, i) => (
                          <Bar
                            key={cat}
                            dataKey={cat}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Reveal>
            </div>

            {/* Notifications feed — 2 cols */}
            <div className="lg:col-span-2">
              <Reveal>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Activity Feed</h2>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[var(--brand-accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--brand-accent)]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                  {loading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-white/30">
                      No activity yet.
                    </div>
                  ) : (
                    <ul className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
                      {notifications.map((n, i) => (
                        <Reveal key={n.id} delay={i * 0.04}>
                          <li className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-white/5 ${!n.read ? "bg-white/3" : ""}`}>
                            <span className="mt-0.5 shrink-0">{severityIcon(n.severity)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white leading-snug truncate">
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="mt-0.5 text-xs text-white/45 line-clamp-2">{n.body}</p>
                              )}
                              <p className="mt-1 text-xs text-white/25">{relativeTime(n.created_at)}</p>
                            </div>
                            {!n.read && (
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-accent)]" />
                            )}
                          </li>
                        </Reveal>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics Table ─────────────────────────────────────────────────── */}
      <section id="metrics-table" className="px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">All Metrics</h2>
              <p className="mt-1 text-sm text-white/40">
                Full snapshot of every tracked metric with category and last recorded time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-white/8">
                  <tr>
                    {["Metric", "Value", "Unit", "Category", "Last Updated"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 w-24 animate-pulse rounded bg-white/8" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : metrics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-white/30">
                        No metrics recorded yet.
                      </td>
                    </tr>
                  ) : (
                    metrics.map((m, i) => (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="group transition-colors hover:bg-white/4"
                      >
                        <td className="px-5 py-4 font-medium text-white capitalize">{m.name}</td>
                        <td className="px-5 py-4 font-mono text-[var(--brand-accent)]">
                          {formatValue(m.value, m.unit)}
                        </td>
                        <td className="px-5 py-4 text-white/50">{m.unit ?? "—"}</td>
                        <td className="px-5 py-4">
                          {m.category ? (
                            <span className="inline-block rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/60">
                              {m.category}
                            </span>
                          ) : (
                            <span className="text-white/25">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-white/35">
                          {relativeTime(m.recorded_at)}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <section className="border-t border-white/8 px-6 py-6 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-white/30">
            <LiveDot />
            <span>Realtime subscriptions active</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <span>{metrics.length} metrics tracked</span>
            <span className="h-3 w-px bg-white/10" />
            <span>{notifications.length} notifications</span>
            <span className="h-3 w-px bg-white/10" />
            <span>{timeSeries.length} data points</span>
          </div>
        </div>
      </section>
    </main>
  );
}