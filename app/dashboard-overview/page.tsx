"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Users, DollarSign, Zap, Bell, RefreshCw, AlertCircle, CheckCircle, Info, BarChart2 } from 'lucide-react';
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
import { createClient } from "@/lib/supabase/client";
import { staggerContainer, fadeInUp } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metric {
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

interface ComparisonRow {
  id: string;
  category: string;
  label: string;
  value: number;
  period: string | null;
  recorded_at: string;
}

interface Notification {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  severity: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: number, unit: string | null): string {
  if (unit === "$" || unit === "USD") {
    return "$" + (value >= 1000 ? (value / 1000).toFixed(1) + "k" : value.toFixed(0));
  }
  if (unit === "%") return value.toFixed(1) + "%";
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "k";
  return value.toFixed(0);
}

function severityIcon(severity: string | null) {
  if (severity === "error") return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (severity === "warning") return <AlertCircle className="w-4 h-4 text-yellow-400" />;
  if (severity === "success") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  return <Info className="w-4 h-4 text-blue-400" />;
}

function metricIcon(name: string) {
  const n = name?.toLowerCase() ?? "";
  if (n.includes("revenue") || n.includes("mrr") || n.includes("arr"))
    return <DollarSign className="w-5 h-5" />;
  if (n.includes("user") || n.includes("signup") || n.includes("customer"))
    return <Users className="w-5 h-5" />;
  if (n.includes("conversion") || n.includes("rate"))
    return <Zap className="w-5 h-5" />;
  return <Activity className="w-5 h-5" />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

const pulseDot: Variants = {
  hidden: { scale: 1, opacity: 1 },
  visible: {
    scale: [1, 1.6, 1],
    opacity: [1, 0.4, 1],
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
};

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
        variants={pulseDot}
        initial="hidden"
        animate="visible"
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ metric, prev }: { metric: Metric; prev?: Metric }) {
  const change = prev ? ((metric.value - prev.value) / Math.max(prev.value, 1)) * 100 : 0;
  const up = change >= 0;

  return (
    <motion.div
      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-3 overflow-hidden"
      whileHover={{ y: -3, boxShadow: "0 12px 40px -8px rgba(0,0,0,0.4)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* accent glow */}
      <span className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[var(--brand-accent)]/10 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <span className="p-2 rounded-xl bg-white/8 text-[var(--brand-accent)]">
          {metricIcon(metric.name)}
        </span>
        <LiveDot />
      </div>

      <div>
        <p className="text-xs text-white/50 uppercase tracking-widest font-medium mb-1">
          {metric.name}
        </p>
        <p className="text-3xl font-bold text-white tracking-tight">
          {formatValue(metric.value, metric.unit)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-medium">
        {up ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={up ? "text-emerald-400" : "text-red-400"}>
          {up ? "+" : ""}
          {change.toFixed(1)}%
        </span>
        <span className="text-white/30">vs prev</span>
      </div>
    </motion.div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({ n }: { n: Notification }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
        n.read ? "opacity-50" : "bg-white/5"
      }`}
    >
      <span className="mt-0.5 shrink-0">{severityIcon(n.severity)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{n.title}</p>
        {n.body && (
          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.body}</p>
        )}
      </div>
      <span className="text-xs text-white/30 shrink-0 mt-0.5">
        {timeAgo(n.created_at)}
      </span>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1117]/90 backdrop-blur-md px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-semibold">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("en-US") : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardOverviewPage() {
  const supabase = createClient();

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRow[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchAll = useCallback(async () => {
    const [mRes, tsRes, cRes, nRes] = await Promise.all([
      supabase.from("metrics").select("*").order("recorded_at", { ascending: false }).limit(40),
      supabase.from("time_series_data").select("*").order("recorded_at", { ascending: true }).limit(120),
      supabase.from("comparison_data").select("*").order("recorded_at", { ascending: false }).limit(40),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (mRes.data) setMetrics(mRes.data);
    if (tsRes.data) setTimeSeries(tsRes.data);
    if (cRes.data) setComparison(cRes.data);
    if (nRes.data) setNotifications(nRes.data);
    setLastRefresh(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const metricsSub = supabase
      .channel("metrics-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "metrics" }, () => fetchAll())
      .subscribe();

    const tsSub = supabase
      .channel("ts-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_series_data" }, () => fetchAll())
      .subscribe();

    const notifSub = supabase
      .channel("notif-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(metricsSub);
      supabase.removeChannel(tsSub);
      supabase.removeChannel(notifSub);
    };
  }, [fetchAll, supabase]);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Latest unique metric per name
  const latestMetrics = Object.values(
    metrics.reduce<Record<string, Metric>>((acc, m) => {
      if (!acc[m.name] || m.recorded_at > acc[m.name].recorded_at) acc[m.name] = m;
      return acc;
    }, {})
  ).slice(0, 6);

  // Previous snapshot per metric name (second-latest)
  const prevMetrics = metrics.reduce<Record<string, Metric>>((acc, m) => {
    const latest = latestMetrics.find((l) => l.name === m.name);
    if (!latest || m.id === latest.id) return acc;
    if (!acc[m.name] || m.recorded_at > acc[m.name].recorded_at) acc[m.name] = m;
    return acc;
  }, {});

  // Time-series chart data: group by recorded_at label, pivot series
  const seriesNames = [...new Set(timeSeries.map((r) => r.series_name))].slice(0, 3);
  const tsGrouped = timeSeries.reduce<Record<string, Record<string, number>>>((acc, r) => {
    const label = new Date(r.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!acc[label]) acc[label] = {};
    acc[label][r.series_name] = r.value;
    return acc;
  }, {});
  const tsChartData = Object.entries(tsGrouped)
    .slice(-14)
    .map(([label, vals]) => ({ label, ...vals }));

  // Comparison bar chart: latest per category+label
  const compGrouped = comparison.reduce<Record<string, ComparisonRow>>((acc, r) => {
    const key = `${r.category}__${r.label}`;
    if (!acc[key] || r.recorded_at > acc[key].recorded_at) acc[key] = r;
    return acc;
  }, {});
  const compChartData = Object.values(compGrouped).slice(0, 8).map((r) => ({
    label: r.label,
    value: r.value,
    category: r.category,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const SERIES_COLORS = ["#6ee7b7", "#818cf8", "#f9a8d4"];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--brand-dark)] text-white">
      {/* ── Page header ── */}
      <Reveal>
        <div className="border-b border-white/8 px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Dashboard Overview
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              Live metrics and performance at a glance
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Last refresh */}
            {lastRefresh && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/30">
                <RefreshCw className="w-3 h-3" />
                {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}

            {/* Notifications bell */}
            <div className="relative">
              <motion.button
                className="relative p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                whileTap={{ scale: 0.93 }}
                onClick={() => setShowNotifs((v) => !v)}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-white/70" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-accent)] text-[10px] font-bold text-black">
                    {unreadCount}
                  </span>
                )}
              </motion.button>

              {showNotifs && (
                <motion.div
                  className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    <span className="text-xs text-white/40">{unreadCount} unread</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5 py-1">
                    {notifications.length === 0 && (
                      <p className="text-center text-xs text-white/30 py-6">No notifications</p>
                    )}
                    {notifications.map((n) => (
                      <NotifRow key={n.id} n={n} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-400">
              <LiveDot />
              Live
            </div>
          </div>
        </div>
      </Reveal>

      <div className="px-6 py-8 space-y-10 max-w-screen-xl mx-auto">

        {/* ── KPI Cards ── */}
        <Reveal>
          <section aria-label="KPI metrics">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/8 bg-white/5 h-36 animate-pulse"
                  />
                ))}
              </div>
            ) : latestMetrics.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/5 p-10 text-center text-white/30 text-sm">
                No metrics data yet. Data will appear here once recorded.
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {latestMetrics.map((m, i) => (
                  <motion.div key={m.id} variants={fadeInUp}>
                    <KPICard metric={m} prev={prevMetrics[m.name]} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        </Reveal>

        {/* ── Charts row ── */}
        <Reveal>
          <section
            aria-label="Charts"
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Area chart — time series */}
            <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-white">Trend Overview</h2>
                  <p className="text-xs text-white/40 mt-0.5">Last 14 data points per series</p>
                </div>
                <Activity className="w-4 h-4 text-white/30" />
              </div>

              {loading ? (
                <div className="h-52 rounded-xl bg-white/5 animate-pulse" />
              ) : tsChartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-white/30 text-sm">
                  No time-series data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={tsChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      {seriesNames.map((s, i) => (
                        <linearGradient key={s} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={SERIES_COLORS[i] ?? "#6ee7b7"} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={SERIES_COLORS[i] ?? "#6ee7b7"} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
                    {seriesNames.map((s, i) => (
                      <Area
                        key={s}
                        type="monotone"
                        dataKey={s}
                        stroke={SERIES_COLORS[i] ?? "#6ee7b7"}
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

            {/* Bar chart — comparison */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-white">By Category</h2>
                  <p className="text-xs text-white/40 mt-0.5">Comparison breakdown</p>
                </div>
                <BarChart2 className="w-4 h-4 text-white/30" />
              </div>

              {loading ? (
                <div className="h-52 rounded-xl bg-white/5 animate-pulse" />
              ) : compChartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-white/30 text-sm">
                  No comparison data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={compChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="var(--brand-accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </Reveal>

        {/* ── Metrics table + Notifications ── */}
        <Reveal>
          <section
            aria-label="Metrics detail and notifications"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Metrics table */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">All Metrics</h2>
                <span className="text-xs text-white/30">{metrics.length} snapshots</span>
              </div>

              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/8">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Metric</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Category</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Recorded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {metrics.slice(0, 12).map((m) => (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3 font-medium text-white flex items-center gap-2">
                            <span className="text-[var(--brand-accent)]">{metricIcon(m.name)}</span>
                            {m.name}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-white/80">
                            {formatValue(m.value, m.unit)}
                          </td>
                          <td className="px-6 py-3 text-white/40 hidden sm:table-cell">
                            {m.category ?? "—"}
                          </td>
                          <td className="px-6 py-3 text-right text-white/30 text-xs hidden md:table-cell">
                            {timeAgo(m.recorded_at)}
                          </td>
                        </tr>
                      ))}
                      {metrics.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-white/30 text-sm">
                            No metrics recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notifications panel */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] text-xs font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5 py-1">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/20 text-sm gap-2">
                    <Bell className="w-6 h-6" />
                    All clear
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <NotifRow key={n.id} n={n} />
                  ))
                )}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── Footer note ── */}
        <Reveal>
          <p className="text-center text-xs text-white/20 pb-4">
            Pulse streams live data via Supabase Realtime. Metrics update automatically as new snapshots arrive.
          </p>
        </Reveal>
      </div>
    </div>
  );
}