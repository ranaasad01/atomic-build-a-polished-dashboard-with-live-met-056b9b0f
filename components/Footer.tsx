"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { navLinks, APP_NAME, APP_TAGLINE } from "@/lib/data";
import { Activity, Code2 as Github, MessageCircle as Twitter, Briefcase as Linkedin } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();
  const t = useTranslations();
  const navT = t.raw("nav") as Record<string, string>;

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                <Activity className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-bold text-[var(--foreground)] text-sm tracking-tight">
                {APP_NAME}
              </span>
            </div>
            <p className="text-[var(--muted-foreground)] text-xs leading-relaxed max-w-xs">
              {APP_TAGLINE}. Real-time SaaS analytics built for product teams who move fast.
            </p>
            <div className="flex items-center gap-2">
              <motion.a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-7 h-7 rounded-lg bg-white/5 border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                aria-label="GitHub"
              >
                <Github className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.a>
              <motion.a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-7 h-7 rounded-lg bg-white/5 border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.a>
              <motion.a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-7 h-7 rounded-lg bg-white/5 border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.a>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-[var(--foreground)] text-xs font-semibold uppercase tracking-widest">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Footer navigation">
              {navLinks.map((link) => {
                const isSection = link.href.startsWith("#");
                const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (isSection && pathname === "/") {
                    e.preventDefault();
                    document
                      .querySelector(link.href)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }
                };
                const resolvedHref = isSection
                  ? pathname === "/"
                    ? link.href
                    : "/" + link.href
                  : link.href;

                return (
                  <Link
                    key={link.key}
                    href={resolvedHref}
                    onClick={handleClick}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs transition-colors duration-200 w-fit"
                  >
                    {navT[link.key] ?? link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-[var(--foreground)] text-xs font-semibold uppercase tracking-widest">
              System Status
            </h3>
            <div className="space-y-2">
              {[
                { label: "API", status: "Operational" },
                { label: "Realtime", status: "Operational" },
                { label: "Data Ingestion", status: "Operational" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)] text-xs">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400 text-xs">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[var(--muted-foreground)] text-xs">
            &copy; 2024 {APP_NAME}. Built for product teams.
          </p>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[var(--accent)] text-xs font-medium">All systems live</span>
          </div>
        </div>
      </div>
    </footer>
  );
}