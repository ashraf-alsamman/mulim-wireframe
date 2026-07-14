"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarClock,
  ClipboardCheck,
  Download,
  FileText,
  Filter,
  GitCompare,
  LayoutDashboard,
  ListChecks,
  Menu,
  Milestone,
  Network,
  RotateCcw,
  Scale,
  Settings,
  Trophy,
  Upload,
  Users,
  X
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { LanguageSwitcher, RoleSwitcher } from "@/components/switchers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { navItems, roleLabels, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { DemoStateSnapshot } from "@/types/demo";
import { cn } from "@/utils/cn";

const iconMap = {
  LayoutDashboard,
  Milestone,
  Users,
  Network,
  ListChecks,
  FileText,
  Filter,
  ClipboardCheck,
  Scale,
  GitCompare,
  BadgeCheck,
  Trophy,
  CalendarClock,
  BarChart3,
  Settings
};

const restrictedForEvaluators = new Set(["competitions", "tracks", "evaluators", "committees", "criteria", "approvals", "settings"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const language = useDemoStore((state) => state.language);
  const role = useDemoStore((state) => state.role);
  const resetDemoData = useDemoStore((state) => state.resetDemoData);
  const importSnapshot = useDemoStore((state) => state.importSnapshot);
  const notifications = useDemoStore((state) => state.notifications);
  const markNotificationRead = useDemoStore((state) => state.markNotificationRead);
  const toasts = useDemoStore((state) => state.toasts);
  const dismissToast = useDemoStore((state) => state.dismissToast);
  const snapshot = useDemoStore((state) => state);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const activeItem = useMemo(() => {
    const cleanPath = pathname === "/" ? "/dashboard" : pathname;
    return [...navItems].reverse().find((item) => cleanPath.startsWith(item.href)) ?? navItems[0];
  }, [pathname]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  function exportJson() {
    const data: DemoStateSnapshot = {
      language: snapshot.language,
      role: snapshot.role,
      tracks: snapshot.tracks,
      evaluators: snapshot.evaluators,
      committees: snapshot.committees,
      criteria: snapshot.criteria,
      entries: snapshot.entries,
      evaluations: snapshot.evaluations,
      tieCases: snapshot.tieCases,
      timeline: snapshot.timeline,
      notifications: snapshot.notifications,
      activities: snapshot.activities,
      approvalHistory: snapshot.approvalHistory,
      settings: snapshot.settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gulf-evaluation-demo-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File | undefined) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as DemoStateSnapshot;
        importSnapshot(parsed);
      } catch {
        window.alert(language === "ar" ? "تعذر استيراد الملف." : "Unable to import this file.");
      }
    };
    reader.readAsText(file);
  }

  const sidebar = (
    <aside className="sketch-paper flex h-full w-72 flex-col border-e-2 border-[var(--line)] text-[var(--ink)]">
      <div className="sketch-doodle border-b-2 border-dashed border-[var(--muted-line)] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">{language === "ar" ? "لوحة اللجان" : "Committee Console"}</p>
        <h1 className="mt-2 text-lg font-bold leading-6">{t(language, "appName")}</h1>
        <p className="mt-3 text-xs text-[var(--graphite)]">{roleLabels[role][language]}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const dimmed =
            role === "viewer" ? false : role.includes("Evaluator") && restrictedForEvaluators.has(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-[12px_10px_14px_9px] border-2 border-transparent px-3 py-2.5 text-sm font-bold text-[var(--ink-soft)] transition hover:border-[var(--line)] hover:bg-[var(--paper-warm)] hover:text-[var(--ink)]",
                active && "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] shadow-[2px_2px_0_rgba(0,0,0,0.14)]",
                dimmed && "opacity-55"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(language, item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="sketch-app min-h-screen text-[var(--ink)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">{sidebar}</div>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-[rgba(0,0,0,0.34)]" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      ) : null}
      <div className="lg:ps-72">
        <header className="sketch-paper sticky top-0 z-30 border-b-2 border-dashed border-[var(--muted-line)] px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs font-bold text-[var(--graphite)]">
                  {t(language, "dashboard")} / {t(language, activeItem.key)}
                </p>
                <h2 className="text-xl font-bold text-[var(--ink)]">{t(language, activeItem.key)}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <RoleSwitcher />
              <div className="relative">
                <Button variant="secondary" size="icon" onClick={() => setNotificationsOpen(true)} aria-label={t(language, "notifications")}>
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-[999px_820px_940px_840px] border-2 border-[var(--line)] bg-[var(--ink)] text-[10px] text-[var(--paper-soft)]">
                      {unreadCount}
                    </span>
                  ) : null}
                </Button>
              </div>
              <Button variant="secondary" size="icon" onClick={exportJson} aria-label={t(language, "exportData")}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={() => fileInputRef.current?.click()} aria-label={t(language, "importData")}>
                <Upload className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => importJson(event.target.files?.[0])}
              />
              <Button
                variant="danger"
                size="icon"
                onClick={() => {
                  if (window.confirm(language === "ar" ? "هل تريد إعادة ضبط بيانات العرض؟" : "Reset demo data?")) {
                    resetDemoData();
                  }
                }}
                aria-label={t(language, "reset")}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen} title={t(language, "notifications")}>
        <div className="space-y-3">
          {notifications.map((item) => (
            <button
              key={item.id}
              className="sketch-note w-full p-4 text-start hover:bg-[var(--paper-warm)]"
              onClick={() => markNotificationRead(item.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[var(--ink)]">{item.title[language]}</p>
                <Badge tone={item.read ? "neutral" : item.tone === "danger" ? "danger" : item.tone === "success" ? "success" : "warning"}>
                  {item.read ? "Read" : "New"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--graphite)]">{item.body[language]}</p>
            </button>
          ))}
        </div>
      </Dialog>
      <div className="fixed bottom-4 end-4 z-50 w-[min(92vw,360px)] space-y-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className={cn(
              "sketch-note flex w-full items-center justify-between gap-3 p-4 text-start text-sm font-bold",
              toast.tone === "success" && "bg-[var(--paper-soft)] text-[var(--ink)]",
              toast.tone === "error" && "bg-[var(--paper-soft)] text-[var(--ink)]",
              toast.tone === "info" && "bg-[var(--paper-soft)] text-[var(--ink)]"
            )}
          >
            <span>{toast.message}</span>
            <X className="h-4 w-4 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
