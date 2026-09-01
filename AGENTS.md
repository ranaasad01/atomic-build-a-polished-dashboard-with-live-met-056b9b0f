# AGENTS.md

Project conventions for AI agents and humans editing this codebase.

## Original request
Build a polished dashboard
with live metrics.

## Goal
Build a polished glass-futuristic analytics dashboard with live mock metrics, KPI cards, Recharts visualizations, sidebar navigation, and three fully working pages: Dashboard Overview, Analytics, and Settings.

## Project type
dashboard

## Design system — match this exactly
- Color tokens: `--background: #0F172A`, `--card: #1E293B`, `--border: #334155`, `--foreground: #F8FAFC`, `--muted-foreground: #94A3B8`, `--muted: #1E293B`, `--primary: #6366F1`, `--accent: #22D3EE`, `--primary-rgb: 99, 102, 241`, `--accent-rgb: 34, 211, 238`, `--brand-accent: #22D3EE`

## Existing components — reuse these, don't create near-duplicates
- LanguageToggle (components/LanguageToggle.tsx)
- LocaleProvider (components/LocaleProvider.tsx)

## Existing i18n namespaces
Every translation key must be namespaced (`hero.title`, never a bare `title`) so two components never collide on the same catalog slot. Reuse one of these, or pick a new, distinct name:
`analytics`, `footer`, `nav`, `settings`

When editing or adding pages: preserve the design system above, reuse existing components and the shared nav data file, and keep the established structure and tone.
