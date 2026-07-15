"use client";

import Link from "next/link";
import { BarChart3, Download, FileJson, List, Scale, Sparkles, Trophy, Upload, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { TimelineStrip } from "@/components/timeline-view";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/forms";
import { localized, t } from "@/i18n/translations";
import { useDemoStore } from "@/store/demo-store";
import type { DemoStateSnapshot, Entry, TimelineItem } from "@/types/demo";
import { rankEntries } from "@/utils/calculations";

export function WinnersView() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const tieCases = useDemoStore((state) => state.tieCases);
  const updateWinnerStatus = useDemoStore((state) => state.updateWinnerStatus);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const winnerGroups = useMemo(
    () =>
      tracks.map((track) => {
        const trackEntries = entries.filter((entry) => entry.trackId === track.id && entry.finalScore > 0);
        const schoolRankedEntries = rankEntries(trackEntries.filter((entry) => entry.subcategory === "schools"), tieCases);
        const universityRankedEntries = rankEntries(trackEntries.filter((entry) => entry.subcategory === "universities"), tieCases);

        return {
          track,
          groups: [
            {
              id: `${track.id}-schools`,
              label: t(language, "schools"),
              rankedEntries: schoolRankedEntries,
              winners: schoolRankedEntries.slice(0, 3)
            },
            {
              id: `${track.id}-universities`,
              label: t(language, "universities"),
              rankedEntries: universityRankedEntries,
              winners: universityRankedEntries.slice(0, 3)
            }
          ]
        };
      }),
    [entries, language, tracks, tieCases]
  );
  const winnerCount = winnerGroups.reduce(
    (total, trackGroup) => total + trackGroup.groups.reduce((groupTotal, group) => groupTotal + group.winners.length, 0),
    0
  );
  const selectedWinnerGroup = winnerGroups
    .flatMap((trackGroup) => trackGroup.groups.map((group) => ({ ...group, track: trackGroup.track })))
    .find((group) => group.id === selectedGroupId);

  const renderWinnerActions = (winner: Entry) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => updateWinnerStatus(winner.id, { contactStatus: "contacted" })}>
        {t(language, "contact")}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => updateWinnerStatus(winner.id, { travelStatus: "coordinated" })}>
        {t(language, "coordinateTravel")}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => updateWinnerStatus(winner.id, { ceremonyStatus: "confirmed" })}>
        {t(language, "confirmCeremony")}
      </Button>
      <Button size="sm" onClick={() => updateWinnerStatus(winner.id, { published: !winner.published })}>
        {winner.published ? t(language, "unpublish") : t(language, "publish")}
      </Button>
    </div>
  );
  const renderWinnerSlot = (winner: Entry | undefined, index: number) => {
    const place = index + 1;

    if (!winner) {
      return (
        <div key={`pending-${place}`} className="sketch-note border-dashed p-4">
          <div className="grid gap-3 lg:grid-cols-[4rem_1fr] lg:items-center">
            <span className="text-2xl font-bold text-[var(--ink)]">#{place}</span>
            <div>
              <p className="font-bold text-[var(--ink)]">{language === "ar" ? `في انتظار الفائز رقم ${place}` : `Waiting for winner #${place}`}</p>
              <p className="text-sm text-[var(--graphite)]">
                {language === "ar" ? "سيظهر هنا بمجرد اكتمال نتائج هذا النوع" : "This slot fills when this type has enough scored entries"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={winner.id} className="border-b border-dashed border-[var(--muted-line)] pb-3 last:border-b-0 last:pb-0">
        <div className="grid gap-3 lg:grid-cols-[4rem_1fr_auto] lg:items-start">
          <span className="text-2xl font-bold text-[var(--ink)]">#{place}</span>
          <div>
            <p className="font-bold text-[var(--ink)]">{winner.participantName}</p>
            <p className="text-sm text-[var(--graphite)]">{winner.title}</p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{winner.id}</p>
          </div>
          <div className="flex flex-wrap gap-1 lg:justify-end">
            <Badge tone="neutral">{winner.finalScore.toFixed(2)}</Badge>
            <Badge tone="neutral">{language === "ar" ? `أثر ${winner.awarenessScore.toFixed(2)}` : `Impact ${winner.awarenessScore.toFixed(2)}`}</Badge>
            <Badge tone={winner.contactStatus === "responded" ? "success" : winner.contactStatus === "contacted" ? "info" : "neutral"}>{winner.contactStatus}</Badge>
            <Badge tone={winner.travelStatus === "coordinated" ? "success" : "neutral"}>{winner.travelStatus}</Badge>
            <Badge tone={winner.ceremonyStatus === "confirmed" ? "success" : "warning"}>{winner.ceremonyStatus}</Badge>
          </div>
        </div>
        <div className="mt-3">{renderWinnerActions(winner)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="sketch-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{language === "ar" ? "الفائزون حسب كل نوع" : "Winners by category type"}</p>
          <p className="text-3xl font-bold text-navy-900">{winnerCount}</p>
        </div>
        <Button asChild variant="burgundy">
          <Link href="/winners/announcement">
            <Sparkles className="h-4 w-4" />
            {t(language, "announcement")}
          </Link>
        </Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {winnerGroups.map((trackGroup) =>
          trackGroup.groups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{`${localized(language, trackGroup.track.name)} - ${group.label}`}</CardTitle>
                  <p className="mt-1 text-sm font-semibold text-[var(--graphite)]">
                    {language === "ar" ? "أول 3 فائزين في هذا النوع" : "Top 3 winners in this type"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{group.winners.length}/3</Badge>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedGroupId(group.id)}>
                    <List className="h-4 w-4" />
                    {language === "ar" ? "القائمة كاملة" : "Full list"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => renderWinnerSlot(group.winners[index], index))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Dialog
        open={Boolean(selectedWinnerGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGroupId("");
          }
        }}
        title={
          selectedWinnerGroup
            ? `${localized(language, selectedWinnerGroup.track.name)} - ${selectedWinnerGroup.label} - ${
                language === "ar" ? "القائمة النهائية الكاملة" : "Full final list"
              }`
            : ""
        }
        className="w-[min(96vw,1160px)]"
      >
        {selectedWinnerGroup ? (
          <div className="space-y-4">
            <div className="sketch-note flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-[var(--ink)]">
                  {language === "ar" ? "كل الأعمال مرتبة داخل هذا النوع" : "All entries ranked inside this type"}
                </p>
                <p className="mt-1 text-sm text-[var(--graphite)]">
                  {language === "ar"
                    ? `الفائزون هم أول 3 من أصل ${selectedWinnerGroup.rankedEntries.length}`
                    : `Winners are the top 3 of ${selectedWinnerGroup.rankedEntries.length}`}
                </p>
              </div>
              <Badge tone="neutral">{selectedWinnerGroup.rankedEntries.length}</Badge>
            </div>

            <div className="max-h-[62vh] overflow-auto">
              <div className="space-y-2">
                {selectedWinnerGroup.rankedEntries.length ? (
                  selectedWinnerGroup.rankedEntries.map((entry) => (
                    <div key={entry.id} className="sketch-note p-4">
                      <div className="grid gap-3 lg:grid-cols-[4rem_1fr_auto] lg:items-center">
                        <span className="text-2xl font-bold text-[var(--ink)]">#{entry.rank}</span>
                        <div>
                          <p className="font-bold text-[var(--ink)]">{entry.participantName}</p>
                          <p className="text-sm text-[var(--graphite)]">{entry.title}</p>
                          <p className="mt-1 text-xs text-[var(--ink-soft)]">{entry.id}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Badge tone={entry.rank <= 3 ? "success" : "neutral"}>
                            {entry.rank <= 3 ? (language === "ar" ? "فائز" : "Winner") : language === "ar" ? "خارج أول 3" : "Outside top 3"}
                          </Badge>
                          <Badge tone="neutral">{entry.finalScore.toFixed(2)}</Badge>
                          <Badge tone="neutral">{language === "ar" ? `أثر ${entry.awarenessScore.toFixed(2)}` : `Impact ${entry.awarenessScore.toFixed(2)}`}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title={language === "ar" ? "لا توجد نتائج محسوبة لهذا النوع" : "No scored entries for this type"} />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function AnnouncementView() {
  const language = useDemoStore((state) => state.language);
  const entries = useDemoStore((state) => state.entries);
  const tracks = useDemoStore((state) => state.tracks);
  const tieCases = useDemoStore((state) => state.tieCases);
  const winners = rankEntries(entries.filter((entry) => entry.finalScore > 0), tieCases).slice(0, 6);
  const [index, setIndex] = useState(0);
  const winner = winners[index];
  const track = winner ? tracks.find((item) => item.id === winner.trackId) : undefined;

  if (!winner) {
    return <EmptyState title={language === "ar" ? "لا توجد نتائج للعرض" : "No winners to announce"} />;
  }

  return (
    <div className="sketch-card relative min-h-[calc(100vh-140px)] overflow-hidden p-8 text-[var(--ink)]">
      <div className="absolute inset-0 sketch-paper" />
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 40 }, (_, dot) => (
          <span
            key={dot}
            className="absolute h-2 w-2 animate-bounce rounded-[4px_2px_5px_3px] border border-[var(--line)] bg-[var(--ink)]"
            style={{
              insetInlineStart: `${(dot * 17) % 100}%`,
              top: `${(dot * 23) % 100}%`,
              animationDelay: `${(dot % 9) * 120}ms`
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center text-center">
        <Trophy className="h-16 w-16 text-[var(--ink)]" />
        <p className="mt-6 text-lg font-bold text-[var(--ink)]">{track ? localized(language, track.name) : winner.trackId}</p>
        <h1 className="mt-4 text-5xl font-bold md:text-7xl">{winner.participantName}</h1>
        <p className="mt-4 text-2xl text-[var(--ink-soft)]">{winner.title}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Badge tone="burgundy">#{winner.rank}</Badge>
          <Badge tone="success">{winner.participantCountry}</Badge>
          <Badge tone="info">{winner.finalScore.toFixed(2)}</Badge>
        </div>
        <div className="mt-10 flex gap-3">
          <Button variant="secondary" onClick={() => setIndex((current) => Math.max(0, current - 1))}>Previous</Button>
          <Button variant="secondary" onClick={() => setIndex((current) => Math.min(winners.length - 1, current + 1))}>Next</Button>
          <Button onClick={() => document.documentElement.requestFullscreen?.()}>{t(language, "fullScreen")}</Button>
        </div>
      </div>
    </div>
  );
}

export function TimelinePageView() {
  const language = useDemoStore((state) => state.language);
  const timeline = useDemoStore((state) => state.timeline);
  const updateTimelineItem = useDemoStore((state) => state.updateTimelineItem);

  const columns: Array<Column<TimelineItem>> = [
    {
      key: "title",
      header: t(language, "timeline"),
      cell: (row) => (
        <div>
          <p className="font-bold text-navy-900">{localized(language, row.title)}</p>
          <p className="text-xs text-slate-500">{row.owner}</p>
        </div>
      )
    },
    {
      key: "start",
      header: language === "ar" ? "البداية" : "Start",
      cell: (row) => <Input type="date" value={row.startDate} onChange={(event) => updateTimelineItem(row.id, { startDate: event.target.value })} />
    },
    {
      key: "due",
      header: language === "ar" ? "الاستحقاق" : "Due",
      cell: (row) => <Input type="date" value={row.dueDate} onChange={(event) => updateTimelineItem(row.id, { dueDate: event.target.value })} />
    },
    {
      key: "progress",
      header: t(language, "progress"),
      cell: (row) => (
        <Input type="number" min={0} max={100} value={row.progress} onChange={(event) => updateTimelineItem(row.id, { progress: Number(event.target.value) })} />
      )
    },
    {
      key: "status",
      header: t(language, "status"),
      cell: (row) => (
        <Select value={row.status} onChange={(event) => updateTimelineItem(row.id, { status: event.target.value as TimelineItem["status"] })}>
          <option value="notStarted">{language === "ar" ? "لم يبدأ" : "Not started"}</option>
          <option value="inProgress">{language === "ar" ? "جار" : "In progress"}</option>
          <option value="delayed">{language === "ar" ? "متأخر" : "Delayed"}</option>
          <option value="completed">{language === "ar" ? "مكتمل" : "Completed"}</option>
        </Select>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <TimelineStrip items={timeline} language={language} />
      <DataTable rows={timeline} columns={columns} />
    </div>
  );
}

export function ReportsView() {
  const language = useDemoStore((state) => state.language);
  const reportCards = [
    {
      key: "winners-by-type",
      title: language === "ar" ? "تقرير الفائزين حسب النوع" : "Winners by type report",
      description:
        language === "ar"
          ? "عرض الفائزين مقسمين حسب المسار والفئة مثل الرسم - المدارس والرسم - الجامعات."
          : "Winners grouped by track and category, such as Drawing - Schools and Drawing - Universities.",
      icon: Trophy
    },
    {
      key: "tie-cases",
      title: language === "ar" ? "تقرير حالات التعادل" : "Tie cases report",
      description:
        language === "ar"
          ? "ملخص لحالات التعادل، الأطراف المتعادلة، وحالة التصويت أو الحسم."
          : "Summary of tie cases, tied entries, and voting or resolution status.",
      icon: Scale
    },
    {
      key: "evaluation-progress",
      title: language === "ar" ? "تقرير تقدم التقييم" : "Evaluation progress report",
      description:
        language === "ar"
          ? "متابعة اكتمال مراحل الفرز، التقييم الأولي، والتقييم النهائي."
          : "Progress across filtering, initial evaluation, and final evaluation stages.",
      icon: BarChart3
    },
    {
      key: "evaluator-workload",
      title: language === "ar" ? "تقرير المحكمين والتحميل عليهم" : "Evaluator workload report",
      description:
        language === "ar"
          ? "نظرة على المحكمين، المسارات المسندة لهم، وحجم الأعمال المطلوبة منهم."
          : "Overview of evaluators, assigned tracks, and their expected workload.",
      icon: Users
    }
  ];

  return (
    <div className="space-y-5">
      <div className="sketch-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--graphite)]">
            {language === "ar" ? "مركز التقارير" : "Reports center"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--ink)]">
            {language === "ar" ? "اختر نوع التقرير المطلوب" : "Choose a report type"}
          </h2>
        </div>
        <Badge tone="neutral">{language === "ar" ? "واجهة فقط" : "UI only"}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {reportCards.map((report) => {
          const Icon = report.icon;

          return (
            <Card key={report.key} className="min-h-56">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-10 w-10 shrink-0 text-[var(--ink)]" />
                    <Badge tone="neutral">{language === "ar" ? "تقرير" : "Report"}</Badge>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--ink)]">{report.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--graphite)]">{report.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-[var(--muted-line)] pt-4">
                  <span className="text-xs font-bold text-[var(--ink-soft)]">
                    {language === "ar" ? "زر التصدير موجود بدون تنفيذ حالياً" : "Export button is visual only for now"}
                  </span>
                  <Button type="button" variant="secondary">
                    <Download className="h-4 w-4" />
                    {language === "ar" ? "تصدير" : "Export"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsView() {
  const language = useDemoStore((state) => state.language);
  const snapshot = useDemoStore((state) => state);
  const settings = useDemoStore((state) => state.settings);
  const updateSettings = useDemoStore((state) => state.updateSettings);
  const resetDemoData = useDemoStore((state) => state.resetDemoData);
  const importSnapshot = useDemoStore((state) => state.importSnapshot);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportBackup() {
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
    link.download = "demo-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File | undefined) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(String(reader.result)) as DemoStateSnapshot;
      importSnapshot(parsed);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t(language, "settings")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t(language, "initialThreshold")}</Label>
            <Input
              type="number"
              min={0}
              value={settings.initialQualificationThreshold}
              onChange={(event) => updateSettings({ initialQualificationThreshold: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t(language, "finalistCount")}</Label>
            <Input type="number" min={1} value={settings.finalistCount} onChange={(event) => updateSettings({ finalistCount: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>{t(language, "approvalStatus")}</Label>
            <StatusBadge group="approval" value={settings.approvalStatus} language={language} />
          </div>
          <div className="space-y-2">
            <Label>{language === "ar" ? "حالة القفل" : "Lock state"}</Label>
            <Badge tone={settings.locked ? "burgundy" : "success"}>{settings.locked ? "Locked" : "Editable"}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportBackup}>
            <FileJson className="h-4 w-4" />
            {t(language, "jsonBackup")}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t(language, "importData")}
          </Button>
          <input ref={fileRef} hidden type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
          <Button variant="danger" onClick={resetDemoData}>
            {t(language, "reset")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "افتراضات PDF المستخدمة" : "PDF assumptions used"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600">
          <p>{language === "ar" ? "المسارات: الفيديو، الرسم، التصوير، الكتابة." : "Tracks: Video, Drawing, Photography, Writing."}</p>
          <p>{language === "ar" ? "المعايير: جودة العمل، الفكرة والإبداع، أثر التوعية المالية والاستثمارية، 10 درجات لكل معيار." : "Criteria: Work Quality, Idea and Creativity, Financial and Investment Awareness Impact, 10 points each."}</p>
          <p>{language === "ar" ? "الجدول الزمني الافتراضي: 1، 7، 8، 14، 29 مارس 2026." : "Default timeline: March 1, 7, 8, 14, and 29, 2026."}</p>
        </CardContent>
      </Card>
    </div>
  );
}
