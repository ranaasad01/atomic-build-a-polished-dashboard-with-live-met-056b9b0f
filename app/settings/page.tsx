"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Settings, Palette, Bell, Plug, Check, ChevronDown, Save, Sun, Moon, Monitor, BarChart2, CreditCard, Activity, AlertTriangle, TrendingUp, Users, DollarSign, Eye, EyeOff, Zap, RefreshCw } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "preferences" | "integrations" | "notifications";
type Theme = "light" | "dark" | "system";
type DateRange = "7d" | "30d" | "90d" | "1y";
type Density = 1 | 2 | 3;

interface KPIOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  category: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const KPI_OPTIONS: KPIOption[] = [
  { id: "revenue", label: "Revenue", icon: <DollarSign className="h-4 w-4" /> },
  { id: "users", label: "Active Users", icon: <Users className="h-4 w-4" /> },
  { id: "conversions", label: "Conversions", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "churn", label: "Churn Rate", icon: <Activity className="h-4 w-4" /> },
  { id: "mrr", label: "MRR", icon: <BarChart2 className="h-4 w-4" /> },
  { id: "sessions", label: "Sessions", icon: <Zap className="h-4 w-4" /> },
];

const INTEGRATIONS_DATA: Integration[] = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Real-time database and auth backend powering your live metrics.",
    icon: <Activity className="h-6 w-6" />,
    connected: true,
    category: "Database",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Pull revenue, MRR, and churn data directly from your Stripe account.",
    icon: <CreditCard className="h-6 w-6" />,
    connected: false,
    category: "Payments",
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    description: "Sync product analytics events and funnel data into Pulse.",
    icon: <BarChart2 className="h-6 w-6" />,
    connected: false,
    category: "Analytics",
  },
  {
    id: "segment",
    name: "Segment",
    description: "Unify customer data from every touchpoint into a single stream.",
    icon: <RefreshCw className="h-6 w-6" />,
    connected: true,
    category: "Data Pipeline",
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    description: "Route critical metric alerts to your on-call rotation automatically.",
    icon: <AlertTriangle className="h-6 w-6" />,
    connected: false,
    category: "Alerting",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Receive daily digests and threshold alerts in your Slack channels.",
    icon: <Bell className="h-6 w-6" />,
    connected: false,
    category: "Messaging",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300",
        saved
          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
          : "bg-[var(--accent)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] hover:opacity-90"
      )}
    >
      {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {saved ? "Saved" : "Save changes"}
    </motion.button>
  );
}

// ─── Preferences Panel ────────────────────────────────────────────────────────

function PreferencesPanel() {
  const t = useTranslations();
  const [theme, setTheme] = useState<Theme>("system");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [density, setDensity] = useState<Density>(2);
  const [visibleKPIs, setVisibleKPIs] = useState<string[]>(["revenue", "users", "conversions", "mrr"]);
  const [saved, setSaved] = useState(false);

  const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: t("settings.preferences.themeLight"), icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: t("settings.preferences.themeDark"), icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: t("settings.preferences.themeSystem"), icon: <Monitor className="h-4 w-4" /> },
  ];

  const DATE_RANGES: { value: DateRange; label: string }[] = [
    { value: "7d", label: t("settings.preferences.range7d") },
    { value: "30d", label: t("settings.preferences.range30d") },
    { value: "90d", label: t("settings.preferences.range90d") },
    { value: "1y", label: t("settings.preferences.range1y") },
  ];

  const DENSITY_LABELS: Record<Density, string> = {
    1: t("settings.preferences.densityCompact"),
    2: t("settings.preferences.densityDefault"),
    3: t("settings.preferences.densityComfortable"),
  };

  function toggleKPI(id: string) {
    setVisibleKPIs((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={fadeInUp}>
        <SectionCard
          title={t("settings.preferences.themeTitle")}
          description={t("settings.preferences.themeDesc")}
        >
          <div className="flex gap-3">
            {THEMES.map((th) => (
              <button
                key={th.value}
                onClick={() => setTheme(th.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-all duration-200",
                  theme === th.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/20 hover:text-[hsl(var(--foreground))]"
                )}
              >
                {th.icon}
                {th.label}
              </button>
            ))}
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <SectionCard
          title={t("settings.preferences.dateRangeTitle")}
          description={t("settings.preferences.dateRangeDesc")}
        >
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full appearance-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 pr-10 text-sm text-[hsl(var(--foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <SectionCard
          title={t("settings.preferences.kpiTitle")}
          description={t("settings.preferences.kpiDesc")}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {KPI_OPTIONS.map((kpi) => {
              const active = visibleKPIs.includes(kpi.id);
              return (
                <button
                  key={kpi.id}
                  onClick={() => toggleKPI(kpi.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/20 hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <span className={cn("transition-colors", active ? "text-[var(--accent)]" : "text-[hsl(var(--muted-foreground))]")}>
                    {kpi.icon}
                  </span>
                  {kpi.label}
                  {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                  {!active && <EyeOff className="ml-auto h-3.5 w-3.5 shrink-0 opacity-40" />}
                </button>
              );
            })}
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <SectionCard
          title={t("settings.preferences.densityTitle")}
          description={t("settings.preferences.densityDesc")}
        >
          <div className="space-y-3">
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value) as Density)}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span>{t("settings.preferences.densityCompact")}</span>
              <span className="font-medium text-[var(--accent)]">{DENSITY_LABELS[density]}</span>
              <span>{t("settings.preferences.densityComfortable")}</span>
            </div>
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeInUp} className="flex justify-end">
        <SaveButton onClick={handleSave} saved={saved} />
      </motion.div>
    </motion.div>
  );
}

// ─── Integrations Panel ───────────────────────────────────────────────────────

function IntegrationsPanel() {
  const t = useTranslations();
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_DATA);

  function toggleConnection(id: string) {
    setIntegrations((prev) =>
      prev.map((intg) =>
        intg.id === id ? { ...intg, connected: !intg.connected } : intg
      )
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.p variants={fadeInUp} className="text-sm text-[hsl(var(--muted-foreground))]">
        {t("settings.integrations.subtitle")}
      </motion.p>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((intg, i) => (
          <motion.div
            key={intg.id}
            variants={scaleIn}
            custom={i}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    intg.connected
                      ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  {intg.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {intg.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        intg.connected
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      )}
                    >
                      {intg.connected ? t("settings.integrations.connected") : t("settings.integrations.disconnected")}
                    </span>
                  </div>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {intg.category}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {intg.description}
            </p>

            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleConnection(intg.id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-200",
                  intg.connected
                    ? "border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10"
                    : "border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)] hover:bg-[var(--accent)]/10"
                )}
              >
                {intg.connected ? t("settings.integrations.disconnect") : t("settings.integrations.connect")}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

function NotificationsPanel() {
  const t = useTranslations();
  const [revenueThreshold, setRevenueThreshold] = useState("15");
  const [userSpikeThreshold, setUserSpikeThreshold] = useState("25");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={fadeInUp}>
        <SectionCard
          title={t("settings.notifications.thresholdsTitle")}
          description={t("settings.notifications.thresholdsDesc")}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                {t("settings.notifications.revenueDropLabel")}
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={revenueThreshold}
                    onChange={(e) => setRevenueThreshold(e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 pr-10 text-sm text-[hsl(var(--foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))]">
                    %
                  </span>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                {t("settings.notifications.revenueDropHint")}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                {t("settings.notifications.userSpikeLabel")}
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={userSpikeThreshold}
                    onChange={(e) => setUserSpikeThreshold(e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 pr-10 text-sm text-[hsl(var(--foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))]">
                    %
                  </span>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                {t("settings.notifications.userSpikeHint")}
              </p>
            </div>
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <SectionCard
          title={t("settings.notifications.deliveryTitle")}
          description={t("settings.notifications.deliveryDesc")}
        >
          <div className="space-y-4">
            {[
              {
                id: "email",
                label: t("settings.notifications.emailToggle"),
                hint: t("settings.notifications.emailHint"),
                value: emailAlerts,
                setter: setEmailAlerts,
              },
              {
                id: "inapp",
                label: t("settings.notifications.inAppToggle"),
                hint: t("settings.notifications.inAppHint"),
                value: inAppAlerts,
                setter: setInAppAlerts,
              },
              {
                id: "digest",
                label: t("settings.notifications.digestToggle"),
                hint: t("settings.notifications.digestHint"),
                value: weeklyDigest,
                setter: setWeeklyDigest,
              },
              {
                id: "critical",
                label: t("settings.notifications.criticalToggle"),
                hint: t("settings.notifications.criticalHint"),
                value: criticalOnly,
                setter: setCriticalOnly,
              },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {item.hint}
                  </div>
                </div>
                <button
                  onClick={() => item.setter((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border transition-all duration-300",
                    item.value
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--muted))]"
                  )}
                  role="switch"
                  aria-checked={item.value}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300",
                      item.value ? "left-[calc(100%-18px)]" : "left-0.5"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeInUp} className="flex justify-end">
        <SaveButton onClick={handleSave} saved={saved} />
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<Tab>("preferences");

  const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: "preferences", label: t("settings.tabs.preferences"), icon: <Palette className="h-4 w-4" /> },
    { value: "integrations", label: t("settings.tabs.integrations"), icon: <Plug className="h-4 w-4" /> },
    { value: "notifications", label: t("settings.tabs.notifications"), icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal>
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <Settings className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                {t("settings.heading")}
              </h1>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl">
              {t("settings.subheading")}
            </p>
          </div>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={0.05}>
          <div className="mb-8 flex gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {TABS.map((tab) => (
              <TabButton
                key={tab.value}
                active={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </div>
        </Reveal>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeTab === "preferences" && <PreferencesPanel />}
            {activeTab === "integrations" && <IntegrationsPanel />}
            {activeTab === "notifications" && <NotificationsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}