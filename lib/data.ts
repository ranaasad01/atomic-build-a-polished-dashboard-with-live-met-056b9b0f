export const APP_NAME = "Pulse Analytics";
export const APP_TAGLINE = "Live metrics. Real decisions.";

export interface NavLink {
  label: string;
  href: string;
  key: string;
}

export const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/", key: "dashboard" },
  { label: "Analytics", href: "/analytics", key: "analytics" },
  { label: "Settings", href: "/settings", key: "settings" },
];

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change: string;
  changeType: "up" | "down";
  unit: string;
  isLive: boolean;
  trend: "up" | "down";
  icon: string;
}

export interface ActivityItem {
  id: string;
  emoji: string;
  text: string;
  time: string;
  type: "upgrade" | "alert" | "signup" | "churn" | "error";
}

export const BRAND = {
  primary: "var(--primary)",
  accent: "var(--accent)",
  background: "var(--background)",
  card: "var(--card)",
  border: "var(--border)",
  foreground: "var(--foreground)",
  mutedForeground: "var(--muted-foreground)",
} as const;